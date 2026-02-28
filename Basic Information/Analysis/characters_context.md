## Zodpovědnost kontextu

Character kontext **vlastní a spravuje datové záznamy postav**. Je konzumentem dat z Narrative kontextu (frakce, vztahy, questy) – tyto vazby zobrazuje, ale nevytváří. Fotografie a přílohy ukládá přes Supabase Storage.

---

## Hranice kontextu (Co Character Context vlastní vs. konzumuje)

|Data|Vlastník|Character Context|
|---|---|---|
|Základní profil postavy|✅ Character|Čte & píše|
|Schopnosti / atributy|✅ Character|Čte & píše|
|Fotografie hráče / postavy|✅ Character (Storage)|Čte & píše|
|Přílohy postavy|✅ Character (Storage)|Čte & píše|
|Frakce|Narrative|Zobrazuje|
|Vztahy mezi postavami|Narrative|Zobrazuje|
|Questy přidělené postavě|Narrative|Zobrazuje|

---

## Datový model

### Character (hlavní entita)

```
Character
├── id                  UUID PK
├── eventId             UUID FK → Event
├── name                string              # herní jméno postavy
├── race                string              # rasa (Člověk, Elf, Trpaslík, ...)
├── status              enum                # Draft | Ready | Locked
├── biography           text (rich text)    # příběhové pozadí
├── notes               text                # interní poznámky pro orgy (skryté)
├── playerUserId        UUID FK → User?     # null dokud není přiřazena hráči
├── photoUrl            string?             # URL v Supabase Storage
├── createdAt           timestamp
└── updatedAt           timestamp
```

Stav `status` řídí editovatelnost:

```
Draft ──► Ready ──► Locked
  ▲          │
  └──────────┘  (org může vrátit k revizi)
```

---

### CharacterAbility (schopnosti)

Schopnosti jsou záměrně strukturované jako key-value seznam, nikoliv pevné sloupce – každý event může mít jiný systém schopností (magický systém, bojové dovednosti, sociální atributy...).

```
CharacterAbility
├── id              UUID PK
├── characterId     UUID FK → Character
├── category        string      # např. "Magie", "Boj", "Sociální"
├── name            string      # název schopnosti
├── value           string      # hodnota (číslo, text, boolean – jako string)
├── description     text?       # popis co schopnost dělá
└── sortOrder       int         # pořadí zobrazení
```

---

### CharacterAttachment (přílohy)

```
CharacterAttachment
├── id              UUID PK
├── characterId     UUID FK → Character
├── fileName        string
├── fileUrl         string      # Supabase Storage URL
├── mimeType        string
├── category        enum        # Document | Image | Other
├── uploadedBy      UUID FK → User
└── uploadedAt      timestamp
```

---

### Konzumované vazby z Narrative kontextu

Tyto záznamy **žijí v Narrative kontextu**, Character kontext je pouze čte přes interní API / sdílené read modely.

```
CharacterFactionMembership (vlastní: Narrative)
├── characterId     UUID FK → Character
├── factionId       UUID FK → Faction
└── role            string?     # "Vůdce", "Člen", "Špión"...

CharacterRelationship (vlastní: Narrative)
├── sourceCharacterId   UUID FK → Character
├── targetCharacterId   UUID FK → Character
├── type                enum     # Ally | Enemy | Family | Romantic | Neutral
└── description         text?

CharacterQuest (vlastní: Narrative)
├── characterId     UUID FK → Character
├── questId         UUID FK → Quest
└── role            enum    # Primary | Secondary | Optional
```

---

## Use Cases

### UC-CH-01 · Vytvoření postavy

**Aktér:** EventManager, NarrativeTeam **Prerekvizity:** Event existuje a není ve stavu `Archived`

Tok:

1. Org otevře seznam postav eventu a zvolí „Nová postava"
2. Vyplní základní profil – jméno, rasa, biografie, interní poznámky
3. Systém uloží postavu ve stavu `Draft`
4. Org může pokračovat přidáváním schopností a příloh

**Validace:** Jméno postavy musí být v rámci eventu unikátní.

---

### UC-CH-02 · Správa schopností postavy

**Aktér:** EventManager, NarrativeTeam

Tok:

1. Org otevře kartu postavy, sekce „Schopnosti"
2. Přidává schopnosti – kategorie, název, hodnota, popis
3. Schopnosti může řadit, editovat, mazat
4. Systém uchovává pořadí pro konzistentní zobrazení

**Poznámka pro implementaci:** Kategorie schopností by měly být konfigurovatelné per-event (aby Fantasy LARP mohl mít „Magie" a sci-fi LARP „Technologie"). Tato konfigurace bude součástí Event Management kontextu jako `AbilityTemplate`.

---

### UC-CH-03 · Upload fotografie postavy / hráče

**Aktér:** EventManager, NarrativeTeam

Tok:

1. Org nahraje fotografii na kartě postavy
2. Backend uloží soubor do Supabase Storage (bucket: `characters/{eventId}/{characterId}/photo`)
3. Systém uloží URL do `Character.photoUrl`
4. Pokud fotografie neexistuje, UI zobrazí generický placeholder (avatar se siluetou)

**Omezení:** Max velikost 5 MB, povolené formáty JPG / PNG / WEBP.

---

### UC-CH-04 · Správa příloh postavy

**Aktér:** EventManager, NarrativeTeam

Tok:

1. Org uploaduje soubor (PDF s backstory, obrázek kostýmu, mapa oblasti...)
2. Systém uloží do Storage (bucket: `characters/{eventId}/{characterId}/attachments`)
3. Příloha se zobrazí v seznamu na kartě postavy s ikonou dle typu
4. Přílohy lze smazat – systém odstraní záznam i soubor ze Storage

---

### UC-CH-05 · Přiřazení postavy hráči

**Aktér:** EventManager

Tok:

1. Org otevře kartu postavy (stav `Ready`)
2. Vybere hráče ze seznamu registrovaných účastníků eventu
3. Systém nastaví `Character.playerUserId`
4. Postava může být přiřazena pouze jednomu hráči najednou
5. Systém odešle notifikaci přes Communications kontext

**Poznámka:** Odřazení hráče od postavy je možné jen pokud event ještě nezačal (`status != Locked`).

---

### UC-CH-06 · Zobrazení vazeb z Narrative kontextu

**Aktér:** EventManager, NarrativeTeam

Na kartě postavy jsou tři read-only sekce načítané z Narrative kontextu:

**Frakce:** Zobrazí seznam frakcí, jejichž je postava členem, včetně role ve frakci. Data přicházejí z Narrative kontextu přes interní volání.

**Vztahy:** Zobrazí seznam vztahů – jméno druhé postavy, typ vztahu (ikonka), textový popis. Vztahy jsou obousměrné – zobrazují se vždy z pohledu aktuální postavy.

**Questy:** Zobrazí přidělené questy s rolí postavy v questu (Primární / Vedlejší / Volitelný) a aktuálním stavem questu.

Všechny tři sekce jsou **read-only** v Character kontextu – editace probíhá výhradně v Narrative kontextu.

---

### UC-CH-07 · Uzamčení postavy před eventem

**Aktér:** EventManager

Tok:

1. Org hromadně nebo jednotlivě uzamkne postavy (`Draft/Ready → Locked`)
2. Po uzamčení není možná editace profilu, schopností ani příloh
3. Výjimka: interní poznámky (`notes`) zůstávají editovatelné i po uzamčení – org potřebuje dělat zápisky i během hry
4. Odemčení je možné pouze explicitním krokem s potvrzením

---

### UC-CH-08 · Přehled postav eventu

**Aktér:** EventManager, NarrativeTeam, LogisticsTeam (read-only)

Org vidí tabulkový přehled všech postav eventu s:

- Jméno, rasa, status (barevný badge)
- Přiřazený hráč (nebo „Nepřiřazena")
- Počet schopností, příloh
- Frakce (z Narrative) – zobrazená jako tagy
- Rychlé akce: otevřít kartu, přiřadit hráče, změnit status

Přehled podporuje filtrování dle statusu, frakce a stavu přiřazení.

### UC-CH-09 · Otevření karty postavy 
The basic "open a character" flow was implied by other UCs but never explicitly defined. Now it documents the tabbed layout, parallel data loading from Narrative, and the read-only behavior for LogisticsTeam.

### **UC-CH-10 · Editace profilu postavy** 
— covers the edit form flow with validation, and handles the special case of a `Locked` character where only `notes` remain editable (this edge case was mentioned in UC-CH-07 but had no dedicated UC).

### **UC-CH-11 · Smazání postavy** 
— includes the confirmation dialog, cascade deletion of Storage files, and the important guard against deleting characters with active Narrative relationships.

### **UC-CH-12 · Duplikace postavy** 
— useful for template characters (groups of soldiers, generic NPCs with the same ability set). Clarifies that Storage files are not duplicated.

### UC-CH-13 · Změna stavu postavy**
the state machine transitions were referenced throughout other UCs but never had a home. This UC formalizes all valid and invalid transitions in one place, including the guard that `Draft → Locked` is not allowed.

---

## Interakce s ostatními kontexty

```
Character Context
      │
      ├──► Narrative Context
      │         číst: Faction, Relationship, Quest
      │
      ├──► Communications Context
      │         volat: SendNotification (při přiřazení hráče)
      │
      ├──► Identity & Access
      │         číst: User (seznam hráčů pro přiřazení)
      │
      └──► Supabase Storage
                zápis: photo, attachments
```

---

## Co zatím záměrně neřešíme

Hráčský pohled na vlastní postavu (UC viditelnosti, co hráč smí číst) – odkládáme na pozdější iteraci dle vašeho zadání.a