# Sancho Agent Guide

This repository is developed by multiple agents and humans. Use this file to coordinate work, avoid conflicts, and keep a consistent engineering bar.

## Project Snapshot
Sancho is a **single-organization** web app for a LARP group, covering the full event lifecycle (planning → organization → execution). One deployment = one organization, with multiple events.

**Stack**
- Backend: .NET 9 (ASP.NET Core), modular monolith with bounded contexts
- Frontend: Next.js 15.5.12 (TypeScript, App Router, PWA)
- Database/Auth: Supabase (PostgreSQL + Auth + RLS + Storage + Realtime)
- Infra: Supabase managed; backend container (Railway/Render/Azure Container Apps); frontend on Vercel

**Repo Layout**
- `backend/`
- `frontend/`
- `supabase/`
- `docs/`

## How We Collaborate
- Claim a task before starting. If unclear, create a short task note in your response describing what you will touch.
- Prefer small, reviewable changes. Avoid broad refactors without explicit alignment.
- Be explicit about assumptions and constraints.
- If you discover unexpected local changes not made by you, stop and ask for guidance before proceeding.

## Architecture Principles
- Modular monolith with bounded contexts. Keep module boundaries intact.
- Contexts include: Identity & Access, Event Management, Character, Narrative, Logistics, NPC/Org, Finance, Communications.
- The API Gateway (ASP.NET Core) routes to bounded contexts.
- Supabase is shared for Auth, DB, Storage, and Realtime; apply RLS for **org/event membership** isolation.

## Coding Standards (Backend)
- Follow clean architecture conventions already in `backend/`.
- Keep DTOs and domain models separated.
- Prefer explicit typing and clear validation for external inputs.
- Favor deterministic, testable services. Avoid static singletons except configuration.

## Coding Standards (Frontend)
- Use Next.js App Router conventions in `frontend/app/`.
- Feature code goes in `frontend/modules/` aligned with backend contexts.
- Shared UI in `frontend/components/`.
- Keep server/client component boundaries explicit and minimal.
- Use `shadcn/ui` components from `frontend/components/ui/` and keep styling token-driven in `frontend/app/globals.css`.

## Database & Supabase
- All schema changes must go through `supabase/migrations/`. 
- **Migration Execution**: Always try to execute database changes and migrations via the **Supabase MCP server** tools (`apply_migration`, `execute_sql`) to ensure the live environment stays in sync with local files.
- CORE framework (Users, Roles, Events) has been implemented via migrations. There is **no tenants table** — the application is a single-organization deployment.
- The organization membership table is `public.org_members` (holds only `OrgOwner`).
- Event-level managers are in `public.event_members`. Granular user permissions are in `public.event_member_permissions`.
- Avoid manual edits in production. Use migrations and seed scripts.
- Enforce authorization with RLS; never rely solely on client-side filtering. Use `public.event_member_permissions` and `public.event_members` to scope event-level access.

## API & Contracts
- Keep API contracts stable; update OpenAPI when endpoints change.
- Use versioned routes if breaking changes are unavoidable.

## Testing & Quality
- Add tests for critical logic and authorization boundaries.
- Run unit tests locally when feasible before merging.
- Prefer small, isolated tests over end-to-end only.

## Docs & Diagrams
- Update relevant docs in `docs/` when behavior or architecture changes.
- Keep diagrams in sync with code changes that affect structure or boundaries.
- UI baseline plan is in `Basic Information/UI_Implementation_Guide_Lines.md`.

## Operational Considerations
- Log with context (event, user).
- Avoid exposing PII in logs or errors.
- Handle authorization and membership scoping in every request path.

## Decision Log (Lightweight)
If you make a noteworthy design decision, add a short note in `docs/architecture/decision-log.md` (create if missing) with:
- Date, context, decision, alternatives considered.


## Recent Setup Changes
- Created repo structure per docs: \backend/, \frontend/, supabase/, docs/ and subfolders.
- Initialized backend solution and projects:
  - \backend/Sancho.sln`r
  - \backend/Sancho.API (ASP.NET Core Web API)
  - \backend/Sancho.Shared, \backend/Sancho.Infrastructure`r
  - Bounded-context class libraries under \backend/Sancho.Modules/`r
- Initialized Next.js app in \frontend/ (App Router, TypeScript, ESLint, npm).
- Initialized Supabase project in supabase/ (\
  px supabase init).
- Added root package.json and installed supabase CLI as a dev dependency.
- **Implemented core database schema**:
  - `public.user_profiles`: Application-specific user data.
  - `public.org_members`: Organization-level leadership (`OrgOwner`).
  - `public.event_members`: Event-level leadership (`EventManager`).
  - `public.event_member_permissions`: Granular per-user, per-event module permissions.
  - `public.system_admins`: Platform-level admin accounts.
  - `public.role_module_permissions`: Declarative default permission matrix for core roles.
  - `public.events`: Base event entities.
  - Applied RLS policies for event isolation.
  - Created `docs/architecture/rbac_model.md` as the technical RBAC reference.
- **Frontend Authentication & Shell Implementation**:
  - Integrated `@supabase/ssr` for server-side auth and session management.
  - Implemented a custom middleware that coordinates `next-intl` (localization) and Supabase Auth session updates.
  - Created a functional Login page with Google OAuth.
  - Developed the main `AppSidebar` using Shadcn UI, structured around the 8 LARP Bounded Contexts.
  - Configured auth callback routes and fixed middleware 404/redirect issues for API/Auth endpoints.
- **Database & Role Automation**:
  - Implemented a PostgreSQL trigger (`handle_new_user`) that automatically:
    - Creates a `user_profiles` entry on first sign-in.
    - Provisionally grants the `SystemAdmin` and `OrgOwner` roles to `cvesspy@gmail.com` on first login.
  - Applied RLS improvements to ensure user data isolation.
- **Single-Organization Rework**:
  - Dropped `public.tenants` and `public.tenant_members`.
  - Created `public.org_members` as the single org-level membership table.
  - Updated `SanchoClaimsTransformation` to resolve `sancho:org_role` from `org_members`.
  - Updated `UserEndpoints` (`GetMemberships`, `GetPermissions`) to use `org_members`.
  - Updated frontend `RolesOverview` component and profile page to display a single org role.
- **Invite-Only Auth Rework**:
  - Implemented `public.invite_tokens` for gated registration.
  - Reworked Login page to support Email/Password and Register tabs.
  - Updated `handle_new_user` trigger to enforce valid invite token hashes on registration.
  - Restricted Google OAuth to existing users only.
  - Added Invite Token management UI to the Identity & Access module.
