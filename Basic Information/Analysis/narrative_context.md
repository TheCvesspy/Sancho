# Narrative Context (Use Case Draft)

Date: 2026-03-06

## Scope and Responsibility

Narrative context is **event-scoped** (same as Characters) and owns:
- Quests (mandatory)
- Plotlines (mandatory)
- Plots/Arcs (optional, above Plotline)
- Factions
- Narrative Items (including quest loot use)

Narrative context must integrate with:
- Characters (player/NPC linking and read models on character detail)
- Shared document-link handling (reuse Character Google Drive link flow; no duplicated implementation)

---

## Boundary Matrix (Owns vs Consumes)

| Data | Owner | Narrative Context |
|---|---|---|
| Quest, Quest Phase/Step | Narrative | Read + Write |
| Plotline, Plotline Phase | Narrative | Read + Write |
| Plot/Arc | Narrative | Read + Write |
| Faction profile, faction relations | Narrative | Read + Write |
| Narrative item metadata + state | Narrative | Read + Write |
| Quest/Plotline/Plot/Faction/Item Google Drive links | Shared attachment/link service | Read + Write (via shared service) |
| Character core profile | Character | Read-only reference |
| Event membership and permissions | Identity + Event Mgmt | Read-only for auth |

---

## Core Domain Model (Conceptual)

### Quest (mandatory)

```
Quest
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- code                string?          # short ID for navigation ("Q-014")
|-- title               string
|-- description         text (rich text)
|-- internal_notes      text?
|-- status              enum             # Draft | Ready | Locked
|-- has_fixed_players   boolean          # false = open/no predetermined players
|-- created_at          timestamp
`-- updated_at          timestamp
```

Quest has:
- 1..N `QuestStep` (phase-style summary entries)
- N..M links to Characters, Factions, Items
- N shared Google Drive document links

### Plotline (optional)

```
Plotline
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- code                string?
|-- title               string
|-- description         text (rich text)
|-- internal_notes      text?
|-- status              enum             # Draft | Ready | Locked
|-- created_at          timestamp
`-- updated_at          timestamp
```

Plotline has:
- 1..N `PlotlinePhase`
- N..M explicit links to Characters, Factions, Items
- N..M linked Quests to phases
- auto-aggregated "inherited links" from those quests

### Plot / Arc (optional, above Plotline)

```
Plot
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- code                string?
|-- title               string
|-- description         text (rich text)
|-- internal_notes      text?
|-- status              enum             # Draft | Ready | Locked
|-- created_at          timestamp
`-- updated_at          timestamp
```

Plot has:
- N..M linked Plotlines
- optional direct links to Characters, Factions, Items
- auto-aggregated links from underlying plotlines/quests

### Faction

```
Faction
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- name                string
|-- sigil_url           string?          # image in storage
|-- description         text?
|-- goals               text?
|-- internal_notes      text?
|-- status              enum             # Draft | Ready | Locked
|-- created_at          timestamp
`-- updated_at          timestamp
```

Faction has:
- members (Characters: players or NPCs)
- relationship map with factions and characters (ally/enemy/source/etc.)
- links to quests, plotlines, plots
- assigned items
- Google Drive links

### Narrative Item

```
NarrativeItem
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- name                string
|-- description         text?
|-- internal_notes      text?
|-- status              enum             # Draft | ReadyToReview | Final
|-- is_multi_copy       boolean
|-- max_copies          int?             # null = unlimited when multi_copy=true
|-- created_at          timestamp
`-- updated_at          timestamp
```

Item has:
- links to quests, plotlines, plots (usage visualization)
- player assignment list (pre-event distribution)
- faction assignments
- Google Drive links

---

## Navigation Model (Mandatory UX Principle)

Primary event-scoped navigation:
- `/{locale}/narrative` -> event picker
- `/{locale}/narrative/{eventId}` -> Narrative hub (quests-first)

Within event:
- Quests list is mandatory and always accessible
- Plotlines and Plots are optional layers and can be hidden if unused
- cross-entity backlinks are mandatory (Quest <-> Plotline <-> Plot, Quest/Faction/Item links)

Minimum quick navigation actions on each detail page:
- Open parent container (phase -> plotline -> plot)
- Open linked quests
- Open linked factions
- Open linked items
- "Go to Character" for linked members

---

## Use Cases

### UC-NR-01 - Open Narrative Module for Event
Actor: EventManager, Narrative writer team members with `narrative:read/write`

Flow:
1. User opens `/{locale}/narrative`.
2. User selects event.
3. System opens `/{locale}/narrative/{eventId}` with summary cards and tabs (Quests, Plotlines, Plots, Factions, Items).

### UC-NR-02 - Create Quest
Actor: user with `narrative:write`

Flow:
1. User clicks "New Quest".
2. Fills title, description, internal notes, and fixed/open player mode.
3. Adds initial quest steps (phase summary list).
4. Saves quest in `Draft`.

Validation:
- Title required and unique per event (or unique code if code is used).

### UC-NR-03 - Manage Quest Steps
Actor: `narrative:write`

Flow:
1. User opens quest "Steps".
2. Adds, edits, reorders, archives steps.
3. For each step, optionally links:
- necessary items (required to execute the step)
- loot items (reward from the step)
3. System keeps deterministic ordering and change timestamps.

Planned extension:
- Later add optional step links for NPCs and other resources.

### UC-NR-04 - Link Quest to Characters/Factions/Items
Actor: `narrative:write`

Flow:
1. User opens quest links panel.
2. Links one or more characters, factions, and items.
3. System supports quests with zero predetermined players.

### UC-NR-05 - Attach Google Drive Links to Quest
Actor: `narrative:write`

Flow:
1. User adds a Google Drive URL.
2. System validates URL format via shared attachment/link component.
3. Link appears in quest documents list.

Constraint:
- Reuse shared document handling from Character context implementation.

### UC-NR-06 - Create and Manage Plotline
Actor: `narrative:write`

Flow:
1. User creates plotline with description and internal notes.
2. Adds plotline phases.
3. Assigns quests to phases.
4. Links characters/factions/items directly if needed.

Rule:
- Plotline detail must display both direct links and inherited links from assigned quests.

### UC-NR-07 - Create and Manage Plot/Arc (Optional)
Actor: `narrative:write`

Flow:
1. User creates plot/arc.
2. Links one or more plotlines.
3. Optionally adds direct links (characters/factions/items).
4. System shows aggregated view of underlying plotlines and quests.

### UC-NR-08 - Easy Cross-Navigation Between Quest/Plotline/Plot
Actor: `narrative:read`

Flow:
1. User opens any entity detail (quest/plotline/plot).
2. System shows breadcrumb and linked graph/table.
3. One click opens parent/child/related entity.

### UC-NR-09 - Create and Manage Faction
Actor: `narrative:write`

Flow:
1. User creates faction with name, description, goals, internal notes.
2. Uploads sigil image.
3. Adds members (characters).
4. Links faction to quests/plotlines/plots.
5. Assigns items and adds Google Drive links.

### UC-NR-10 - Maintain Faction Relationship Map
Actor: `narrative:write`

Flow:
1. User defines relation source/target (faction->faction or faction->character).
2. Chooses relation type (ally, enemy, info-source, neutral, custom).
3. Chooses relation mode:
- directional only (A -> B)
- auto-mirrored (system creates B -> A using mapped inverse/same relation)
4. Adds note and optional confidence/visibility metadata.

### UC-NR-11 - Create and Manage Narrative Item
Actor: `narrative:write`

Flow:
1. User creates item with name, description, notes.
2. Sets copy policy (`is_multi_copy`, optional `max_copies`).
3. Sets status (`Draft`, `ReadyToReview`, `Final`).
4. Links item to quests/plotlines/plots/factions.
5. Adds Google Drive links.

Copy policy rules:
- Items may be unlimited (`is_multi_copy=true` and `max_copies=null`).
- If `max_copies` is set, assignment beyond capacity must fail with a clear domain error message.

### UC-NR-12 - Assign Item to Players Before Event
Actor: `narrative:write`, EventManager

Flow:
1. User opens item assignments.
2. Selects characters (players) receiving copies.
3. System enforces copy-capacity constraints.
4. Detail page displays assignee list.

Failure behavior:
- If assignment exceeds configured `max_copies`, request fails with meaningful message (example: "Cannot assign item: copy limit reached (3/3). Increase max copies or unassign an existing holder.").

### UC-NR-13 - Locking and Internal Notes Behavior
Actor: EventManager

Flow:
1. User changes status to `Final`.
2. Entity becomes non-editable in `Final` state except status changes.
3. Reverse transitions are allowed (`Final -> ReadyToReview -> Draft`) when organizers reopen work.

### UC-NR-14 - Event-Scoped Read Models for Character Context
Actor: system integration

Flow:
1. Character detail requests narrative links.
2. Narrative context returns factions, relationships, quests for given character+event.
3. Character deletion guard checks active narrative relationships before delete.

---

## Authorization and Scope Rules

- All records are scoped by `event_id`.
- RLS must enforce event membership and `event_member_permissions.module = 'narrative'`.
- `narrative:read` can view.
- `narrative:write` can create/update/soft-delete.
- EventManager has write capability in Narrative context (never read-only).
- Role overrides (SystemAdmin/OrgOwner/EventManager) follow existing global policy model.

---

## Open Questions (Need Your Answers Before Implementation)

Answered decisions:
1. Terminology: keep both `Plot` and `Arc`.
2. Mandatory scope: Quests + Plotlines in v1; Plots/Arcs optional.
3. Links: target `Character` records only.
4. Quest steps: ordered text blocks, with optional necessary-item and loot-item links.
5. Inherited links: read-only for now.
6. Item states: `Draft -> ReadyToReview -> Final`, with reverse transitions allowed; `Final` is non-editable except status.

7. Faction relationships: support both directional and auto-mirrored mode (toggle at creation/edit).
8. Item copies: hard-fail when `max_copies` reached; unlimited mode supported by leaving hard limit unset.
9. Document links: Google Drive links only (v1).
10. Internal notes visibility/editing: `narrative:write` and EventManager both write-capable.
11. Soft-delete: in v1.
12. Navigation preference: list-first.

---

## Suggested v1 Delivery Slice

1. Quests + ordered steps + necessary/loot item links + character/faction links + Google Drive links.
2. Plotlines + phases + quest assignment + inherited-link read models.
3. Plots/Arcs + plotline assignment + inherited-link read models.
4. Factions + members + relationship map + links to narrative structures.
5. Items + status workflow + copy policy (limited/unlimited) + assignment and usage visualization.
