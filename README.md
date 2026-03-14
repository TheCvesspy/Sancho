# Sancho — LARP Event Management Platform

**Version: 0.15.32**

Sancho is a single-organization web application for managing LARP (Live Action Role-Playing) groups, covering the full event lifecycle from planning through execution. One deployment serves one organization and supports multiple events.

---

## Current State (as of 2026-03-14)

### What's Implemented

#### Authentication & Identity
- Email/Password login and registration
- Google OAuth (existing users only)
- Invite-token gated registration (new users require a valid invite token)
- Automatic user profile creation on first sign-in
- Avatar upload via Supabase Storage

#### Role-Based Access Control (RBAC)
- **SystemAdmin** — platform-level admin
- **OrgOwner** — organization-level leadership
- **EventManager** — event-scoped manager role
- Granular per-user, per-event module permissions (`none` / `read` / `write`) across 7 modules
- RLS-secured PostgreSQL schema enforcing org and event isolation

#### Event Management
- Create, view, edit events
- Full lifecycle: `active` → `archived` → `deleted` (soft-delete with restore)
- Event statistics panel
- Event activity/audit log
- Event manager assignment
- Per-user, per-module permission matrix per event

#### Characters
- Standalone top-level module with central event selector
- Event-scoped character lists and profiles
- React Flow dynamic relationship graph visualization
- Character profile lifecycle (`Draft`, `Ready`, `Locked`)
- Character abilities CRUD
- Character photo upload via Supabase Storage signed uploads
- **Character Documents:** file upload (PDF, Word, Excel, images, text) and Google Drive links
- **Document status workflow:** `Draft` → `Ready to Review` → `Final`
- Full CRUD on attachments — upload new version replaces file in storage; delete removes from storage
- Soft-delete and restore
- Narrative links endpoint backed by Narrative module provider

#### Narrative
- Event-scoped narrative domain implemented for quests, plotlines, plots, factions, and items
- Status workflow implemented for narrative entities (`Draft` -> `ReadyToReview` -> `Final`) with reverse transitions
- Soft-delete and restore implemented across narrative entities
- Google Drive document links supported for quests, factions, and items (shared validator/service pattern)
- Character integration seam activated via `ICharacterNarrativeService` concrete implementation
- **Frontend UI**: Complete narrative module with 11 panels for all narrative entities including Plotlines, Factions, Quests, and Items with deep linking.
- **Quest Step Characters**: Support for linking multiple characters/NPCs to specific quest steps (replacing legacy `has_fixed_players` flag).
- **Faction Relationships v2**: Removed legacy notes field, changed relation type to 100-char free-text, and implemented Searchable Link Picker pattern for targets.
- **Narrative Locations backend**: Added event-scoped locations and dungeon hierarchy endpoints with lifecycle, soft-delete, Google Drive documents, and quest/plotline/plot location links.

#### Shared UI Components
- **Rich Text Editor (TipTap)**: Enhanced with full headings (H1-H4), text alignment (left, center, right, justify), text color, and highlight controls.
- **Rich Text View**: Sanitized rendering of enhanced formatting.

#### Identity & Access (Admin UI)
- User listing and role assignment
- Invite token creation, listing, and revocation
- Org-level role management

#### User Profile
- Profile editing (name, bio, locale)
- **App-wide Locale Persistence**: User language preference is now automatically enforced across the app via middleware redirection and cookie caching.
- Avatar upload and display

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5.12 (App Router, TypeScript, PWA) |
| UI | shadcn/ui + Radix UI + TailwindCSS 4 |
| Backend | .NET 9 (ASP.NET Core), modular monolith |
| Database / Auth | Supabase (PostgreSQL + Auth + RLS + Storage + Realtime) |
| Infra | Supabase (managed DB); backend on Railway/Render/Azure Container Apps; frontend on Vercel |

---

## Repository Layout

```
sancho/
+-- backend/                   # .NET 9 modular monolith
|   +-- Sancho.API/            # ASP.NET Core Web API gateway
|   +-- Sancho.Infrastructure/ # Authorization, RBAC, claims
|   +-- Sancho.Shared/         # Common types, role definitions
|   `-- Sancho.Modules/        # Bounded-context class libraries
|       +-- EventManagement/   # Implemented
|       +-- Identity/          # Implemented
|       +-- User/              # Implemented
|       +-- Character/         # Implemented
|       +-- Narrative/         # Backend implemented
|       +-- Communications/    # Stub
|       +-- Finance/           # Stub
|       +-- Logistics/         # Stub
|       `-- NpcOrg/            # Stub
+-- frontend/                  # Next.js 15 app
|   +-- app/                   # App Router pages and layouts
|   `-- modules/               # Feature modules (aligned with backend contexts)
+-- supabase/                  # Supabase config and migrations
|   `-- migrations/
+-- docs/                      # Architecture, API, and bounded-context docs
|   +-- architecture/
|   +-- api/
|   `-- bounded-contexts/
+-- Basic Information/
`-- AGENTS.md
```
---

## Module Implementation Status

| Module | Backend | Frontend | DB Schema |
|---|---|---|---|
| Event Management | ✅ Full | ✅ Full | ✅ Full |
| Identity & Access | ✅ Full | ✅ Full | ✅ Full |
| User / Profile | ✅ Full | ✅ Full | ✅ Full |
| Characters | ✅ Backend | ✅ Full | ✅ Full |
| Narrative | ✅ Full | ✅ Full | ✅ Full |
| Logistics | ⏳ Stub | ⏳ None | ⏳ None |
| Finance | ⏳ Stub | ⏳ None | ⏳ None |
| NPC / Org | ⏳ Stub | ⏳ None | ⏳ None |
| Communications | ⏳ Stub | ⏳ None | ⏳ None |

---

## Database Schema (Current)

| Table | Purpose |
|---|---|
| `user_profiles` | Application user metadata (name, avatar, bio, locale) |
| `org_members` | Single-org membership (OrgOwner role) |
| `system_admins` | Platform-level admins |
| `events` | Events with full lifecycle fields |
| `event_members` | Event-scoped manager assignments |
| `event_member_permissions` | Granular per-user, per-event, per-module permissions |
| `role_module_permissions` | Default role → module → permission matrix |
| `event_activity_log` | Audit trail for event actions |
| `invite_tokens` | Gated registration tokens |
| `characters` | Event-scoped character profiles |
| `character_abilities` | Flexible key-value abilities per character |
| `character_attachments` | Character file metadata stored in Supabase Storage |
| `narrative_quests` | Event-scoped quests with lifecycle and notes |
| `narrative_quest_steps` | Ordered quest steps |
| `narrative_quest_step_characters` | Per-step character/NPC involvements |
| `narrative_quest_step_items` | Step item requirements/loot links |
| `narrative_plotlines` | Mid-level narrative structure above quests |
| `narrative_plotline_phases` | Ordered plotline phases |
| `narrative_plots` | Top-level story arcs (optional) |
| `narrative_factions` | Faction metadata and lifecycle |
| `narrative_items` | Narrative item definitions and lifecycle |
| `narrative_quest_documents` | Quest Google Drive document links |
| `narrative_faction_documents` | Faction Google Drive document links |
| `narrative_item_documents` | Item Google Drive document links |
| `narrative_faction_relationships` | Faction vs Faction and Faction vs Character relationships (free-text relation type) |
| `narrative_item_character_assignments` | Narrative Item Assignments to characters |
| `narrative_locations` | Event-scoped narrative locations with lifecycle and soft-delete |
| `narrative_dungeon_floors` | Ordered dungeon floors within a narrative location |
| `narrative_dungeon_rooms` | Ordered dungeon rooms within dungeon floors |
| `narrative_quest_locations` | Quest to location/floor/room narrative links |
| `narrative_plotline_locations` | Plotline to location/floor/room narrative links |
| `narrative_plot_locations` | Plot to location/floor/room narrative links |
| `narrative_*_links` | Character/faction/item relationships across narrative entities |

**Applied Migrations:** 22 (latest: `20260314190000_narrative_locations`)

---

## API Endpoints (Implemented)

### User (`/api/me`)
- `GET /me` — current user profile
- `GET /me/memberships` — org and event memberships
- `GET /me/permissions` — resolved permissions
- `POST /me/avatar/upload-url` — presigned avatar upload URL
- `POST /me/avatar/confirm` — confirm avatar upload

### Identity (`/api`)
- `GET /users` — list all users
- `GET /users/{id}` — user detail
- `POST /users/{id}/org-role` — assign org role
- `DELETE /users/{id}/org-role` — remove org role
- `GET /invite-tokens` — list invite tokens
- `POST /invite-tokens` — create invite token
- `DELETE /invite-tokens/{id}` — revoke invite token

### Events (`/api/events`)
- `GET /events` — list events
- `POST /events` — create event
- `GET /events/{id}` — event detail
- `DELETE /events/{id}` — soft-delete event
- `POST /events/{id}/undelete` — restore deleted event
- `POST /events/{id}/archive` — archive event
- `POST /events/{id}/restore` — restore archived event
- `GET /events/{id}/stats` — event statistics
- `GET /events/{id}/activity/recent` — recent activity log
- `GET /events/{id}/managers` — list event managers
- `PUT /events/{id}/managers/{userId}` — assign event manager
- `DELETE /events/{id}/managers/{userId}` — remove event manager
- `GET /events/{id}/permissions/{userId}` — user's event permissions
- `PUT /events/{id}/permissions/{userId}/{module}` — set permission
- `DELETE /events/{id}/permissions/{userId}/{module}` — remove permission

### Characters (`/api/events/{eventId}/characters`)
- `GET /api/events/{eventId}/characters`
- `POST /api/events/{eventId}/characters`
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented
|-- Characters/        # Implemented

### Narrative (`/api/events/{eventId}/narrative`)
- Quests: CRUD, status transitions, soft-delete, restore
- Quest steps: CRUD with ordered summaries
- Quest step items: link/unlink required and loot items
- Quest links: character, faction, and item linking
- Quest documents: Google Drive link add/list/delete
- Factions: CRUD, status transitions, soft-delete, restore
- Faction members: add/remove/list character members
- Faction relationships: directional and auto-mirrored modes
- Faction documents: Google Drive link add/list/delete
- Items: CRUD, status transitions, soft-delete, restore
- Item assignments: add/remove/list character assignments with copy-limit enforcement
- Item documents: Google Drive link add/list/delete
- Plotlines: CRUD, status transitions, soft-delete, restore
- Plotline phases: CRUD
- Plotline quest links and direct links (character/faction/item)
- Plotline documents: Google Drive link add/list/delete
- Plotline inherited link read model
- Plots: CRUD, status transitions, soft-delete, restore
- Plot plotline links and direct links (character/faction/item)
- Plot inherited link read model
- Locations: CRUD, status transitions, soft-delete, restore, search/filter list, and dungeon detail payloads
- Dungeon floors and rooms: CRUD, reorder, and nested/flat document endpoints
- Narrative location links: quest/plotline/plot linking at location, floor, or room granularity from both directions

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.15.32 | 2026-03-14 | Add Narrative Locations backend API, database migration, dungeon hierarchy, and location linking support. |
| 0.15.31 | 2026-03-14 | Fix: Missing translation key for item max copies and UI improvements in item creation dialog. |
| 0.15.30 | 2026-03-14 | Fix: Missing narrative_item_character_assignments table created via migration resolving NotFound errors during item assignments fetch. |
| 0.15.29 | 2026-03-14 | Refactor: Faction Relationships v2 - free-text relation types, notes removal, and Searchable Link Picker implementation. |
| 0.15.28 | 2026-03-14 | Fix: Language does not follow user profile settings. Implemented app-wide locale redirection in middleware with cookie caching. |
| 0.15.27 | 2026-03-08 | Implement granular event member module permissions. Update frontend UI/UX and backend fallback checks. |
| 0.10.2 | 2026-03-08 | Fix NarrativeGraph chunk load error, add Quest Step character links, and quest short description support. |
| 0.10.1 | 2026-03-08 | Fix plotline detail page crash: add missing plotline document endpoints (list/add/delete) to backend |
| 0.10.0 | 2026-03-08 | Enhanced Rich Text Editor (colors, alignment), Quest Step character links, and frontend fix pass (loading, labels, i18n). |
| 0.9.0 | 2026-03-06 | Narrative frontend UI complete, API integration finalized, and missing database migrations applied. |
| 0.8.1 | 2026-03-06 | Fix: install missing `d3-force` package; lazy-load `NarrativeGraph` via `next/dynamic` (ssr:false) to comply with AGENTS.md >50 KB bundle rule |
| 0.8.0 | 2026-03-06 | Narrative backend + DB implemented (quests/plotlines/plots/factions/items), Character-Narrative seam activated, and backend integration tests added/fixed |
| 0.7.0 | 2026-03-06 | Performance pass: DB indexes for RLS, backend claims cache, async JWKS prefetch, response compression, batch ability inserts, frontend fetch parallelization and revalidation, lazy-load Tiptap, useMemo lists |
| 0.6.0 | 2026-03-01 | Characters frontend module with React Flow graph, i18n, and complete UI |
| 0.5.0 | 2026-02-28 | Characters backend finalized and migration applied |
| 0.4.0 | 2026-02-28 | Characters backend v1 (event-scoped APIs, DB schema, RLS, storage upload flows, narrative integration stubs) |
| 0.3.0 | 2026-02-28 | Event management lifecycle, permissions matrix, toast notifications, activity feed |
| 0.2.0 | 2026-02-28 | Auth rework (invite-only, email/password), RBAC redesign, single-org model |
| 0.1.0 | 2026-02-27 | Initial scaffold: auth shell, Supabase integration, AppSidebar, core DB schema |

---

## Development

### Prerequisites
- Node.js 20+
- .NET 9 SDK
- Supabase CLI
- A Supabase project with environment variables configured

### Environment Variables

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Backend (`backend/Sancho.API/appsettings.Development.json`):**
```json
{
  "Supabase": {
    "Url": "",
    "AnonKey": "",
    "JwtSecret": ""
  }
}
```

### Running Locally

```bash
# From repo root
npm run dev      # starts frontend (next dev) and backend concurrently
npm run stop     # stops background processes
```

Or individually:

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && dotnet run --project Sancho.API
```

---

## Architecture Notes

- **Single-organization deployment** — no multi-tenancy; one Sancho instance = one LARP group
- **Modular monolith** — bounded contexts are separate .NET class libraries wired through the API gateway
- **Supabase RLS** — row-level security is the enforcement layer; never rely solely on client-side filtering
- **Invite-only** — registration requires a valid invite token; Google OAuth is for existing users only

See `docs/architecture/` for detailed RBAC model, auth model, and design decisions.



