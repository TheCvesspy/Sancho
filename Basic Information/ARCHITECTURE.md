# Sancho Architecture Overview

This document captures the current, high-level architecture and dependencies for the Sancho platform.

## Purpose
Sancho is a **single-organization** web application for a LARP group. It covers the full event lifecycle from planning through execution. The system is designed as a modular monolith with clear bounded contexts. One Supabase deployment = one organization managing multiple events.

## High-Level Architecture
- Clients: Next.js web app, admin app, and mobile PWA view
- API: ASP.NET Core API Gateway (REST + WebSocket)
- Domains: Bounded contexts implemented as modules in the backend
- Data/Auth: Supabase (PostgreSQL + Auth + RLS + Storage + Realtime)

## Bounded Contexts
- User
- Identity and Access
- Event Management
- Characters
- Narrative
- Logistics
- NPC/Org
- Finance
- Communications

## Technology Stack
- Backend: .NET 9, ASP.NET Core
- Frontend: Next.js 15.5.12, TypeScript, App Router, PWA
- UI: shadcn/ui (violet theme), Radix UI primitives, Tailwind CSS
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

- **OrgMember** (User + `OrgOwner` role — `public.org_members`)
- **Event** (belongs to the org — `public.events`)
- **EventMember** (User + Event + `EventManager` role — `public.event_members`)
- **EventMemberPermission** (Explicit per-user, per-event, per-module grants — `public.event_member_permissions`)
- **User Profile** (Linked to global identity — `public.user_profiles`)
- **SystemAdmin** (Platform-level Admin — `public.system_admins`)
- **RoleModulePermission** (Declarative matrix for base roles — `public.role_module_permissions`)
- Characters (belongs to Event, linked to User)
- NarrativeAsset (belongs to Event, linked to factions/quests)
- LogisticsItem (resources, locations, maps for an Event)
- FinanceRecord (payments, budget items for an Event)
- Communication (announcements and notifications scoped to Event)

## Organization Data Model
```
Organization (single, implicit — one deployment)
  └── OrgMember (OrgOwner)
        └── Event
              ├── EventMember (EventManager)
              └── EventMemberPermission (Regular users with none/read/write per-module)
```

## Auth Flows
- Sign-in uses Supabase Auth with Google OAuth.
- Upon sign-in, the client receives a Supabase session containing an **ES256 JWT** (asymmetric, P-256 elliptic curve).
- Next.js **Server Components** call `supabase.auth.getUser()` to cryptographically verify the session server-side, then forward the `access_token` to the API Gateway as a `Bearer` token.
- The API Gateway validates the token by fetching Supabase's public signing keys from the raw JWKS endpoint (`/auth/v1/.well-known/jwks.json`) via `HttpClient` + `JsonWebKeySet.Create()`. Keys are cached in memory after the first fetch.
- The API Gateway resolves the validated token to:
  - System Admin status from `public.system_admins`.
  - Org role from `public.org_members` (single row per user).
  - Event roles from `public.event_members`.
  - Effective module permissions evaluated across roles + explicit grants in `public.event_member_permissions`.
- Authorization is enforced at:
  - API layer (policy checks per module/role/action).
  - Database layer (RLS policies in Supabase based on `org_members` and `event_members`).


## API Gateway Routing
The API Gateway is the single entry point for clients. Routes are grouped by bounded context.

Example route grouping:
- `/api/user/*` -> User module
- `/api/identity/*` -> Identity and Access module
- `/api/events/*` -> Event Management module
- `/api/characters/*` -> Characters module
- `/api/narrative/*` -> Narrative module
- `/api/logistics/*` -> Logistics module
- `/api/npc-org/*` -> NPC/Org module
- `/api/finance/*` -> Finance module
- `/api/communications/*` -> Communications module

WebSocket endpoints (Realtime or custom SignalR) should be namespaced per module in the same way.

## Current Project Initialization
- Backend solution and projects created under `backend/`.
- Frontend scaffolded with `create-next-app` under `frontend/`.
- Supabase project initialized under `supabase/`.
- Decision log located at `docs/architecture/decision-log.md`.

## Tooling and Dependencies
- .NET 9 SDK (9.0.311)
- Node.js 24.x
- npm 11.x
- Supabase CLI installed as a dev dependency at repo root (use `npx supabase`).

## Data Isolation
Authorization is enforced in Supabase using Row Level Security (RLS). All data access must be scoped by organization and event membership. Org-level access is controlled through `public.org_members`; event-level access through `public.event_members`.
