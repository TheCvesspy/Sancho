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
- `/api/characters/*` -> Characters module
- `/api/narrative/*` -> Narrative module
- `/api/logistics/*` -> Logistics module
- `/api/npc-org/*` -> NPC/Org module
- `/api/finance/*` -> Finance module
- `/api/communications/*` -> Communications module

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
