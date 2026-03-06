# Sancho Architecture Overview

This document captures the current, high-level architecture and dependencies for the Sancho platform.

## Purpose
Sancho is a **single-organization** web application for a LARP group. It covers the full event lifecycle from planning through execution. One Supabase deployment equals one organization managing multiple events.

## High-Level Architecture
- Clients: Next.js web app, admin app, and mobile PWA view
- API: ASP.NET Core API Gateway (REST + WebSocket)
- Domains: Bounded contexts implemented as modules in the backend
- Data/Auth: Supabase (PostgreSQL + Auth + RLS + Storage + Realtime)

## Bounded Contexts
- Characters (`characters`)
- Narrative (`narrative`)
- Logistics (`logistics`)
- NPC/Org (`npc_org`)
- Finance (`finance`)
- Communications (`communications`)
- Event Management (`event_management`)
- Identity and Access (`identity`)
- User (`user`)

## Technology Stack
- Backend: .NET 9, ASP.NET Core
- Frontend: Next.js 15.5.12, TypeScript, App Router, PWA
- UI: shadcn/ui, Radix UI primitives, Tailwind CSS
- Database: PostgreSQL (via Supabase)
- Auth: Supabase Auth with Google OAuth
- Storage: Supabase Storage
- Realtime: Supabase Realtime

## Deployment Targets
- Backend: containerized (Railway, Render, or Azure Container Apps)
- Frontend: Vercel
- Supabase: managed

## Repository Layout
- `backend/` ASP.NET Core API and modular monolith modules
- `frontend/` Next.js application
- `supabase/` migrations, seed data, edge functions
- `docs/` architecture and API documentation

## Data Model (Conceptual)

The application has **one implicit organization** (the deployment). There is no `tenants` table.

- **OrgMember** (`public.org_members`): user with `OrgOwner` role.
- **SystemAdmin** (`public.system_admins`): platform-level admin.
- **Event** (`public.events`): core event aggregate with fields such as `name`, `location`, `start_at`, `end_at`.
- **Event Lifecycle** (on `public.events`): `active`, `archived`, and soft-deleted (`deleted_at` set).
- **EventMember** (`public.event_members`): user with `EventManager` role on a specific event.
- **EventMemberPermission** (`public.event_member_permissions`): explicit user module grants (`none`, `read`, `write`) per event.
- **EventActivityLog** (`public.event_activity_log`): lightweight recent activity stream per event.
- **RoleModulePermission** (`public.role_module_permissions`): baseline role-to-module permission matrix.
- Future records (characters, quests, items, communications) are event-scoped and belong to their own bounded contexts.

## Organization Data Model

```text
Organization (single, implicit - one deployment)
  `-- OrgMember (OrgOwner)
        `-- Event (active | archived | soft-deleted)
              |-- EventMember (EventManager)
              |-- EventMemberPermission (regular users with none/read/write per module)
              `-- EventActivityLog (recent operational actions)
```

## Auth Flows
- **Conventional Auth**: Supports Email/Password login and registration.
- **Invite-Only Registration**: Registration requires a valid invite token passed via metadata (`invite_token_hash`).
- **Google OAuth**: Allowed for *existing* users only. New accounts via Google are blocked by the `handle_new_user` trigger unless a matching profile already exists or an invite is present (manual override).
- Upon sign-in, the client receives a Supabase session containing an ES256 JWT.
- Next.js Server Components call `supabase.auth.getUser()` to verify the session server-side and forward `access_token` to the API Gateway.
- The API Gateway validates JWTs using Supabase public keys.
- The Identity and Access module manages `invite_tokens` (SHA-256 hashed).

## API Gateway Routing

The API Gateway is the single entry point for clients. Routes are grouped by bounded context.

Example route grouping:
- `/api/user/*` -> User module
- `/api/identity/*` -> Identity and Access module
- `/api/events/*` -> Event Management module
- `/api/events/{eventId}/characters/*` -> Characters module (event-scoped)
- `/api/narrative/*` -> Narrative module
- `/api/logistics/*` -> Logistics module
- `/api/npc-org/*` -> NPC/Org module
- `/api/finance/*` -> Finance module
- `/api/communications/*` -> Communications module

## Frontend Routing Conventions

**Event-scoped module routes** embed **both** the event ID and the entity ID as **path segments**.

```
/{locale}/{module}                         ← module landing / event selector
/{locale}/{module}/{eventId}               ← module list scoped to that event
/{locale}/{module}/{eventId}/{entityId}    ← entity detail
```

Examples:
```
/en/characters                             ← event selector landing page
/en/characters/{eventId}                   ← characters list for chosen event
/en/characters/{eventId}/{characterId}     ← character detail page
```

Query parameters are reserved for optional UI state only (search term, status filter, pagination). All required context IDs go in path segments.

---

### Characters <> Narrative Integration Readiness

- Character context exposes a dedicated integration seam: `ICharacterNarrativeService`.
- Current implementation is stubbed (`StubCharacterNarrativeService`) and returns empty collections for:
  - factions
  - relationships
  - quests
- Character deletion guard is already pluggable and calls:
  - `HasActiveRelationshipsAsync(eventId, characterId)`
- When Narrative context is implemented, replace the stub with a concrete provider without changing Character API contracts.

## Current Project Initialization
- Backend solution and projects created under `backend/`.
- Frontend scaffolded under `frontend/`.
- Supabase project initialized under `supabase/`.
- Decision log located at `docs/architecture/decision-log.md`.

## Tooling and Dependencies
- .NET 9 SDK (9.0.311)
- Node.js 24.x
- npm 11.x
- Supabase CLI installed as a dev dependency at repo root (`npx supabase`).

## Data Isolation
Authorization is enforced in Supabase using Row Level Security (RLS). Event data access must always be scoped by event membership and role-based rules, with overrides granted only via `public.event_member_permissions`.

---

## Performance Architecture

### Caching Layers

| Layer | Location | Mechanism | TTL | What It Covers |
|-------|----------|-----------|-----|----------------|
| Backend L1 | `SanchoClaimsTransformation` | `IMemoryCache` | 90 s | Resolved roles, permissions, org/event memberships per user |
| Backend L2 | API pipeline | `UseResponseCompression()` | N/A | Brotli/gzip compression on all JSON responses |
| Frontend L1 | Next.js fetch cache | `next: { revalidate: N }` | Per-route | User profile, events, characters, permissions |
| Frontend L2 | React components | `useMemo` | Per-render | Filtered/sorted lists in client components |

### Frontend Fetch TTL Policy

| Endpoint | TTL | Rationale |
|----------|-----|-----------|
| `/api/user/me` | 60 s | Profile changes rarely mid-session |
| `/api/events` | 30 s | Events updated infrequently |
| Character list | 15 s | May change during active event |
| Character detail | 10 s | Collaborative editing possible |
| Activity log | 5 s | Near-realtime; tolerable delay |

### Backend HTTP Call Budget

Each endpoint handler may make a maximum of **3 outbound Supabase HTTP calls** (auth/ownership check + read + write). Claims and permission data served from `IMemoryCache` do not count. Batch inserts/updates count as 1 call regardless of record count.

This budget prevents the N+1 query problem from accumulating across concurrent users. With 5–8 users, an uncached 6-call endpoint becomes 30–48 simultaneous Supabase calls.

### Database Indexing Contract

All columns used in RLS policy `WHERE` clauses must be indexed. Critical indexes already in place:

- `event_member_permissions (user_id, event_id, module)` — user-first permission lookups
- `event_members (user_id, event_id)` — membership checks in RLS
- `system_admins (user_id)` — admin status checks
- `org_members (user_id, role)` — org ownership checks
- Partial `WHERE deleted_at IS NULL` indexes on `events` and `characters` — list queries

Every new migration that adds a table referenced in an RLS policy must include the required indexes in the same migration file.

### JWKS Key Loading

Supabase signing keys are fetched once at application startup (async, using `IHttpClientFactory`) and cached in a static field. The `IssuerSigningKeyResolver` only reads the pre-fetched value — no HTTP call per request. If the JWKS endpoint is unavailable at startup, the error is logged and the app continues; token validation will fail until keys are loaded.
