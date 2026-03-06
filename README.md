# Sancho — LARP Event Management Platform

**Version: 0.7.0**

Sancho is a single-organization web application for managing LARP (Live Action Role-Playing) groups, covering the full event lifecycle from planning through execution. One deployment serves one organization and supports multiple events.

---

## Current State (as of 2026-03-06)

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
- Related Documents placeholder (pending Narrative module)
- Soft-delete and restore
- Narrative integration seam via stub provider (ready for Narrative module)

#### Identity & Access (Admin UI)
- User listing and role assignment
- Invite token creation, listing, and revocation
- Org-level role management

#### User Profile
- Profile editing (name, bio, locale)
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
├── backend/                   # .NET 9 modular monolith
│   ├── Sancho.API/            # ASP.NET Core Web API gateway
│   ├── Sancho.Infrastructure/ # Authorization, RBAC, claims
│   ├── Sancho.Shared/         # Common types, role definitions
│   └── Sancho.Modules/        # Bounded-context class libraries
│       ├── EventManagement/   # ✅ Implemented
│       ├── Identity/          # ✅ Implemented
│       ├── User/              # ✅ Implemented
│       ├── Characters/        # ⏳ Stub
│       ├── Communications/    # ⏳ Stub
│       ├── Finance/           # ⏳ Stub
│       ├── Logistics/         # ⏳ Stub
│       ├── Narrative/         # ⏳ Stub
│       └── NpcOrg/            # ⏳ Stub
├── frontend/                  # Next.js 15 app
│   ├── app/                   # App Router pages and layouts
│   └── modules/               # Feature modules (aligned with backend contexts)
├── supabase/                  # Supabase config and migrations
│   └── migrations/            # 8 migrations applied
├── docs/                      # Architecture, API, and bounded-context docs
│   ├── architecture/          # RBAC model, auth model, decision log
│   ├── api/                   # Endpoint documentation
│   └── bounded-contexts/      # Module-level docs
├── Basic Information/         # Project intro and UI guidelines
└── AGENTS.md                  # Agent collaboration guide
```

---

## Module Implementation Status

| Module | Backend | Frontend | DB Schema |
|---|---|---|---|
| Event Management | ✅ Full | ✅ Full | ✅ Full |
| Identity & Access | ✅ Full | ✅ Full | ✅ Full |
| User / Profile | ✅ Full | ✅ Full | ✅ Full |
| Characters | ✅ Backend | ✅ Full | ✅ Full |
| Narrative | ⏳ Stub | ⏳ None | ⏳ None |
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

**Applied Migrations:** 11 (latest: `20260306000000_performance_indexes`)

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
- `GET /api/events/{eventId}/characters/{characterId}`
- `PATCH /api/events/{eventId}/characters/{characterId}`
- `POST /api/events/{eventId}/characters/{characterId}/status`
- `POST /api/events/{eventId}/characters/{characterId}/duplicate`
- `DELETE /api/events/{eventId}/characters/{characterId}` (soft-delete)
- `POST /api/events/{eventId}/characters/{characterId}/undelete`
- `GET/POST/PATCH/DELETE /api/events/{eventId}/characters/{characterId}/abilities...`
- `GET/POST/DELETE /api/events/{eventId}/characters/{characterId}/photo...`
- `GET /api/events/{eventId}/characters/{characterId}/attachments`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/upload-url`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/confirm`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/google-drive`
- `PATCH /api/events/{eventId}/characters/{characterId}/attachments/{attachmentId}`
- `DELETE /api/events/{eventId}/characters/{characterId}/attachments/{attachmentId}`
- `GET /api/events/{eventId}/characters/{characterId}/narrative-links`

---

## Version History

| Version | Date | Summary |
|---|---|---|
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
