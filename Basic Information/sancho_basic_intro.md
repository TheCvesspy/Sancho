
## 1. Přehled systému

Sancho je multi-tenant webová aplikace určená organizátorům LARP eventů. Pokrývá celý životní cyklus eventu – od plánování přes organizaci až po samotnou exekuci na místě.

---

## 2. Technologický stack

**Backend: .NET 9 (ASP.NET Core)** Volím .NET před Pythonem, protože silná typová kontrola, výborná podpora pro modulární monolith/clean architecture a skvělá integrace se Supabase přes standardní PostgreSQL klienty. Navíc generování OpenAPI specifikací je v .NETu velmi zralé, což AI agenti ocení.

**Frontend: Next.js 15.5.12 (TypeScript)** Server components, App Router, výborná podpora PWA pro mobilní zobrazení, velká komunita a dobré AI tooling (Copilot, v0.dev atd.).
**UI: shadcn/ui (violet theme), Radix UI, Tailwind CSS** Moderni komponenty, vysoky kontrolovany styling a snadna rozsiritelnost.

**Databáze & Auth: Supabase** PostgreSQL jako primární databáze, Supabase Auth s Google OAuth, Row Level Security (RLS) pro multi-tenant izolaci, Supabase Storage pro soubory (mapy, obrázky kostýmů atd.), Realtime pro live features (dashboard eventu).

**Infrastruktura** Supabase (managed), backend jako Docker container (Railway / Render / Azure Container Apps), frontend na Vercel.

---

## 3. Architektura – Modulární Monolith s Bounded Contexty

Volím **modulární monolith** před microservices – pro tým organizátorů je to pragmatičtější, snáze se vyvíjí agentsky a lze ho později rozdělit pokud bude potřeba.

```
┌─────────────────────────────────────────────────────────┐
│                    SANCHO PLATFORM                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Next.js │  │  Next.js │  │  Mobile  │               │
│  │  Web App │  │  Admin   │  │  PWA View│               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       └─────────────┴─────────────┘                     │ 
│                      │ REST / WebSocket                 │
│              ┌───────▼────────┐                         │
│              │  API Gateway   │                         │
│              │  (ASP.NET Core)│                         │
│              └───────┬────────┘                         │
│    ┌──────────────────┼──────────────────────┐          │
│    │                  │                      │          │
│  └────────┘  └──────────────┘  └──────────────┘         │
│  │Identity│  │Event Context │  │  Characters  │         │
│  │& Access│  │              │  │  Context     │         │
│  └────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Logistics │  │  Narrative   │  │  Finance     │       │
│  │Context   │  │  Context     │  │  Context     │       │
│  └──────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────┐  ┌──────────────┐                         │
│  │ NPC/Org  │  │  Comms       │                         │
│  │ Context  │  │  Context     │                         │
│  └──────────┘  └──────────────┘                         │
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │   Supabase     │                         │
│              │ PG + Auth +    │                         │
│              │ Storage + RT   │                         │
│              └────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

```plantuml
    package "Sancho Platform" {
        package "Front End" {
            [Next.JS Web App] as WebApp
            [Next.JS Admin] as AdminApp
            [Mobile View] as MobileView
        }

        component "API Gateway" as APIGateway

        package "Bounded Contexts" {
            [Identity & Access] as IdentityAccess
            [Events] as EventContext
            [Characters] as CharacterContext
            [Logistics] as Logistics
            [Narrative] as Narrative
            [Finance] as Finance
            [NPC/ORG] as NPCOrg
            [Communications] as Comms
        }

        [Supabase] as Supabase
    
    WebApp --> APIGateway
    AdminApp --> APIGateway
    MobileView --> APIGateway
    APIGateway --> IdentityAccess
    APIGateway --> EventContext
    APIGateway --> CharacterContext 
    APIGateway --> Logistics
    APIGateway --> Narrative
    APIGateway --> Finance
    APIGateway --> NPCOrg
    APIGateway --> Comms
    Supabase <-up- IdentityAccess
    Supabase <-up- EventContext
    Supabase <-up- CharacterContext
    Supabase <-up- Logistics
    Supabase <-up- Narrative
    Supabase <-up- Finance
    Supabase <-up- NPCOrg
    Supabase <-up- Comms

    note bottom of [Supabase]
        Supabase is used for authentication, 
        database, and real-time features 
        across all bounded contexts.
    end note
    }
```



---

## 4. Bounded Contexty

Tady je přehled modulů s jejich zodpovědností a mobilní dostupností:

|Kontext|Zodpovědnost|Mobilní přístup|
|---|---|---|
|**Identity & Access**|Uživatelé, role, oprávnění, Google OAuth|Přihlášení|
|**Event Management**|Vytváření a správa eventů, harmonogram, fáze|Dashboard (read)|
|**Characters**|Postavy hráčů, přihlášky, propojení na hráče|Profil postavy|
|**Narrative**|Příběhové linie, frakce, questové archy, lore dokumenty|Ne|
|**Logistics**|Ubytování, stravování, vybavení, lokace, mapy|Check-in|
|**NPC & Org Team**|Správa organizátorů a NPC, jejich role, směny|Rozpis směn|
|**Finance**|Platby hráčů, rozpočet eventu, výdaje|Ne|
|**Communications**|Oznámení, emaily, in-app notifikace, hráčský portál|Notifikace|

---

## 5. Identity & Access – detailní design

Toto je základ všeho ostatního, takže mu věnujeme nejvíce pozornosti.

```
Tenant (Organization)
  └── Event (konkrétní LARP)
        └── EventRole → User
              └── Module Permissions
```

**Role model:**

- **`owner`** – vlastník organizace (plný přístup, billing, správa uživatelů)
- **`admin`** – administrátor organizace (přístup ke všem modulům a většině uživatelů)
- **`*_manager`** – manager konkrétního modulu (např. `event_manager`, `narrative_manager`) - CRUD přístup
- **`*_viewer`** – divák konkrétního modulu (např. `event_viewer`, `logistics_viewer`) - Read-only přístup

Každý uživatel může mít pole těchto rolí v rámci daného tenanta.
Detailní rozpis najdete v `docs/application_roles.md`.

---

## 6. Struktura projektu (repo layout)

```
sancho/
├── backend/
│   ├── Sancho.API/              # ASP.NET Core – entry point, controllers, middleware
│   ├── Sancho.Modules/
│   │   ├── Identity/
│   │   ├── EventManagement/
│   │   ├── Characters/
│   │   ├── Narrative/
│   │   ├── Logistics/
│   │   ├── NpcOrg/
│   │   ├── Finance/
│   │   └── Communications/
│   ├── Sancho.Shared/           # sdílené value objects, base classes, interfaces
│   └── Sancho.Infrastructure/   # Supabase klient, storage, email provider
├── frontend/
│   ├── app/                     # Next.js App Router
│   ├── modules/                 # feature složky kopírující backend bounded contexty
│   └── components/              # sdílené UI komponenty
├── supabase/
│   ├── migrations/              # SQL migrace
│   ├── seed/
│   └── functions/               # Edge Functions (webhooky, emaily)
└── docs/
    ├── architecture/
    ├── bounded-contexts/
    └── api/
```



