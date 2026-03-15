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
- Contexts include:
- Characters (`characters`)
- Narrative (`narrative`)
- Logistics (`logistics`)
- NPC/Org (`npc_org`)
- Finance (`finance`)
- Communications (`communications`)
- Event Management (`event_management`)
- Identity and Access (`identity`)
- User (`user`)
- The API Gateway (ASP.NET Core) routes to bounded contexts.
- Supabase is shared for Auth, DB, Storage, and Realtime; apply RLS for **org/event membership** isolation.

## Naming & Casing Conventions

These rules are mandatory across the entire stack. Casing mismatches between layers cause silent deserialization failures (properties default to `null`/`0`) which surface as runtime bugs.

### JSON Property Names by Layer

| Layer | Casing | Example | Enforced by |
|---|---|---|---|
| **Frontend** (TypeScript interfaces, JSON bodies) | `camelCase` | `fileName`, `contentType`, `sizeBytes` | Convention |
| **Backend public DTOs** (request/response records) | `PascalCase` | `FileName`, `ContentType`, `SizeBytes` | ASP.NET auto-binds camelCase ↔ PascalCase |
| **Supabase row records** (internal) | `snake_case` | `file_name`, `content_type`, `size_bytes` | `[property: JsonPropertyName("...")]` on every multi-word property |
| **Database columns** | `snake_case` | `file_name`, `content_type`, `size_bytes` | Migration SQL |
| **API URL paths** | `kebab-case` | `/sigil/upload-url` | Route registration |
| **Module identifiers** (DB strings, API paths, constants) | `snake_case` | `npc_org`, `event_management` | Convention |

### Rules

1. **Frontend → Backend**: The frontend sends `camelCase` JSON. ASP.NET Core minimal APIs deserialize this case-insensitively into `PascalCase` record properties. No `[JsonPropertyName]` is needed on public request/response DTOs.
2. **Backend → Supabase**: When building `JsonContent.Create(new { ... })` for Supabase REST calls, use `snake_case` property names in the anonymous object (e.g., `event_id = eventId`).
3. **Supabase → Backend**: Internal `Supabase*Row` records must annotate every multi-word property with `[property: JsonPropertyName("snake_case")]`. Single-word properties (e.g., `id`, `title`, `status`) don't need it.
4. **Backend → Frontend**: ASP.NET Core serializes response DTOs to `camelCase` automatically. Public DTOs use `PascalCase` in C# — the framework handles the conversion.
5. **Supabase Storage paths**: Use `snake_case` or plain segments — no special casing rules. Store **relative paths** in the DB (e.g., `{eventId}/{factionId}/sigil/sigil.png`); convert to full public URLs in the mapper/DTO layer, not in the database.

### Checklist for New DTOs

- [ ] Public request/response records: `PascalCase` properties, no `JsonPropertyName` needed
- [ ] Supabase row records: `snake_case` properties with `[property: JsonPropertyName("...")]` on multi-word names
- [ ] Anonymous objects for Supabase REST calls: `snake_case` property names
- [ ] Frontend interfaces: `camelCase` matching the public DTO names (auto-converted by ASP.NET)
- [ ] Storage file paths stored in DB are relative; full URLs are built in the DTO mapper

## Coding Standards (Backend)
- Follow clean architecture conventions already in `backend/`.
- Keep DTOs and domain models separated.
- Prefer explicit typing and clear validation for external inputs.
- Favor deterministic, testable services. Avoid static singletons except configuration.

## Performance Standards (Backend)

These rules are mandatory for every new module and endpoint. Violations are bugs, not style issues.

- **HttpClient**: Never instantiate `new HttpClient()`. Always inject `HttpClient` via DI (registered with `AddHttpClient()`). Direct instantiation causes socket exhaustion under load.
- **Async**: Never call `.Result` or `.Wait()` on async operations. Always use `async/await` throughout. Blocking causes thread-pool starvation under concurrent load.
- **Batch writes**: Never loop over Supabase REST `POST` calls. Collect records into a list and send the entire array in a single request — Supabase REST accepts array bodies for batch inserts.
- **Authorization cache**: `SanchoClaimsTransformation` caches resolved roles and permissions in `IMemoryCache` (90 s TTL). New endpoints receive auth data via claims — do NOT add additional Supabase permission lookups per request.
- **HTTP call budget per endpoint**: Maximum 3 outbound Supabase HTTP calls (auth/ownership check + read + write). Claims data from cache does not count toward the budget.
- **Parallel calls**: When an endpoint needs data from multiple independent Supabase tables, use `await Task.WhenAll(...)`. Never sequential awaits for independent work.
- **Response compression**: Registered globally via `UseResponseCompression()`. Never add per-endpoint workarounds.

## Coding Standards (Frontend)
- Use Next.js App Router conventions in `frontend/app/`.
- Feature code goes in `frontend/modules/` aligned with backend contexts.
- Shared UI in `frontend/components/`.
- Keep server/client component boundaries explicit and minimal.
- Use `shadcn/ui` components from `frontend/components/ui/` and keep styling token-driven in `frontend/app/globals.css`.

### Large Option Set Picker Pattern (Frontend)

Use this pattern when linking entities (characters, NPCs, items, users, etc.) where a field can exceed ~50 options per event or is expected to grow beyond 100.

- Do not use a plain `Select` for these fields.
- Use `Popover + Command` (`CommandInput`, `CommandList`, `CommandItem`) as the default picker.
- Support type-to-search with debounce (250-400 ms; default 300 ms).
- Use server-side filtering when available; otherwise apply debounced client-side filtering on already loaded data.
- Keep picker open after successful selection so organizers can add multiple links quickly.
- Show selected links as removable chips/badges in the parent section.
- Show explicit states: loading, no results, disabled while saving.
- Prevent duplicate links in UI by excluding already linked IDs from available options.
- Keep all labels/placeholders/messages in i18n files; no hardcoded user-facing strings.

## Performance Standards (Frontend)

These rules are mandatory for every new page and component. They directly affect response time for all users.

- **No `cache: "no-store"` for stable data**: Never use `cache: "no-store"` for user profile or permission data. Use `next: { revalidate: N }` with appropriate TTL (see ARCHITECTURE.md for TTL table). `cache: "no-store"` is only acceptable for data that must always be fresh (e.g., real-time activity feeds).
- **Single `user/me` fetch per render**: Never call `/api/user/me` more than once per page render. Fetch it once — either in the nearest shared layout, or rely on Next.js request deduplication via a stable cache key (`next: { revalidate: 60 }`).
- **Parallel data fetching**: All independent server-side data fetches on the same page must use `Promise.all([...])`. Sequential `await` calls for independent data are forbidden — they add latency equal to the sum of all response times instead of the maximum.
- **Lazy-load heavy client libraries**: Libraries that add >50 KB to the JS bundle (rich-text editors, graph renderers, PDF viewers, charting) must use `next/dynamic` with `ssr: false`. They must not appear in the initial page bundle.
- **Memoize filtered/sorted lists**: Any filter or sort operation on a list in a client component must be wrapped in `useMemo` with explicit dependencies. This prevents O(n) recalculation on every parent re-render.
- **Suspense boundaries**: Wrap slow data sections in `<Suspense fallback={<Skeleton />}>` to enable streaming. Page shells must not block on all data before rendering visible content.
- **Large-link pickers**: For picker fields with >50 options, use debounced search (250-400 ms) and cap result rendering to a small page (20-30 items) or virtualize long lists. Avoid rendering hundreds of static `<option>` nodes.

### Frontend Routing Conventions

**Event-scoped module routes** must embed **both** the event ID and the entity ID as **path segments** â€” never as query parameters.

```
/{locale}/{module}                         <- module landing / event selector
/{locale}/{module}/{eventId}               <- module list for a specific event
/{locale}/{module}/{eventId}/{entityId}    <- entity detail
```

Examples:
```
/en/characters                             <- event selector landing page
/en/characters/{eventId}                   <- characters list for chosen event
/en/characters/{eventId}/{characterId}     <- character detail page
/en/logistics/{eventId}/{itemId}           <- logistics item detail
```

Query parameters are reserved for **optional UI state only** (search term, status filter, pagination).
All required context IDs must appear in path segments.

**Event selector UX**: Module landing pages (`/{locale}/{module}`) always show a central event-picker.
Selecting an event navigates to `/{locale}/{module}/{eventId}`.


## Performance Standards (Database / Migrations)

These rules are mandatory for every new migration that creates tables or RLS policies.

- **Index FK columns used in RLS**: Every column referenced in an RLS policy `WHERE` clause must have an index, created in the same migration as the table or policy. The critical columns are `user_id`, `event_id`, and composites like `(user_id, event_id)` and `(user_id, event_id, module)`.
- **Partial indexes for soft-delete**: Any table with a `deleted_at` column must have a partial index `WHERE deleted_at IS NULL` on the columns used in list queries. Without this, every list query scans deleted rows.
- **Composite index column order**: Order by selectivity (most selective first). For permission lookups: `(user_id, event_id, module)` not `(event_id, user_id, module)`.
- **Reuse existing RLS patterns**: New RLS policies must follow the same EXISTS subquery pattern already established for `system_admins`, `org_members`, `event_members`, and `event_member_permissions`. Do not introduce new join strategies that bypass existing indexes.
- **Migration checklist before commit**:
  - [ ] All FK columns in new RLS policies have indexes
  - [ ] Soft-delete tables have partial `WHERE deleted_at IS NULL` indexes
  - [ ] Composite index column order matches query patterns

## Database & Supabase
- All schema changes must go through `supabase/migrations/`.
- **Migration Execution**: Always try to execute database changes and migrations via the **Supabase MCP server** tools (`apply_migration`, `execute_sql`) to ensure the live environment stays in sync with local files.
- CORE framework (Users, Roles, Events) has been implemented via migrations. There is **no tenants table** — the application is a single-organization deployment.
- The organization membership table is `public.org_members` (holds only `OrgOwner`).
- Event-level managers are in `public.event_members`. Granular user permissions are in:
- `public.event_member_permissions(user_id, event_id, module, permission)`: Granular user module access. Permission enum is `'none', 'read', 'write'`.

## Module Identifiers

The canonical `module` strings used in the database and API are:
- `event_management`
- `narrative`
- `logistics`
- `finance`
- `npc_org` (NPC/Org module)
- `characters`
- `communications`

Identifiers must always be **lowercase snake_case**.
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

## README Maintenance (Required Before Every Commit)

`README.md` is the canonical state-of-the-project document. **It must be updated before every commit** that changes functionality, schema, API endpoints, or module status.

### What to update in README.md:

1. **Version number** — increment following semver:
   - Patch (`0.3.x`): bug fixes, minor UI tweaks, no new features
   - Minor (`0.x.0`): new feature or module added, significant UI work
   - Major (`x.0.0`): breaking architecture change or full module group launch

2. **"What's Implemented" section** — add or update bullet points for any new user-facing features.

3. **Module Implementation Status table** — flip `⏳` to `✅` when a module's backend, frontend, or DB layer is complete.

4. **API Endpoints section** — add any new endpoints or remove deprecated ones.

5. **Database Schema table** — add new tables introduced by migrations.

6. **Version History table** — append a new row with the new version, today's date, and a one-line summary of changes.

### Commit checklist:
- [ ] README.md version number bumped
- [ ] Version History row added
- [ ] Affected sections updated (features, modules, endpoints, schema)
- [ ] Decision log updated if a noteworthy architectural decision was made (`docs/architecture/decision-log.md`)

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
  - `PUT/DELETE /api/events/{eventId}/permissions/{userId}/{module}`
  - `{module}` must be one of: `characters`, `narrative`, `logistics`, `finance`, `npc_org`, `communications`, `event_management`.
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

- **Characters Context Backend v1 (Event-Scoped)**:
  - Implemented `public.characters`, `public.character_abilities`, and `public.character_attachments` with RLS and event scoping.
  - Added Character endpoints under `/api/events/{eventId}/characters/...` including:
    - profile CRUD + status transitions + duplicate + soft-delete/restore
    - abilities CRUD
    - photo and attachment upload/confirm/delete using Supabase Storage signed upload URLs
  - Enforced locked-character rule: only `notes` are editable when status is `Locked`.
  - Added narrative integration seam via `ICharacterNarrativeService`:
    - current implementation is `StubCharacterNarrativeService` (returns empty read models)
    - deletion guard calls `HasActiveRelationshipsAsync(...)` (currently stubbed, ready for Narrative context implementation)
