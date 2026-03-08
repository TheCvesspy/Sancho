# Authorization Guidelines (Canonical)

This is the canonical authorization contract for Sancho. If another document conflicts with this file, this file wins.

## Scope Model

Sancho uses a single-organization, event-scoped RBAC model with layered permissions:

1. Platform scope: `SystemAdmin`
2. Organization scope: `OrgOwner`
3. Event scope: `EventManager`
4. Explicit per-event module grants: `event_member_permissions` with `none | read | write`

## Canonical Module Identifiers

All module identifiers must be lowercase snake_case:

- `event_management`
- `narrative`
- `logistics`
- `finance`
- `npc_org`
- `characters`
- `communications`

## Effective Permission Resolution

Effective permission for a module within an event is resolved in this order:

1. `SystemAdmin` -> full access
2. `OrgOwner` -> full access
3. `EventManager` for that event -> full write access for entities connected to that event
4. Explicit `event_member_permissions` grant (`read` or `write`)
5. Fallback default with no grant:
   - `communications` = `read`
   - all other modules = `none`

Precedence is highest-wins:

`SystemAdmin/OrgOwner` > `EventManager` > `write` > `read` > `none`.

## Role and Grant Administration Rules

### SystemAdmin

- Can grant/revoke `SystemAdmin`.
- Can grant/revoke `OrgOwner`.
- Can grant/revoke `EventManager` for any event.
- Can set/revoke `event_member_permissions` for users on any event.

### OrgOwner

- Cannot manage `SystemAdmin`.
- Cannot manage `OrgOwner`.
- Can grant/revoke `EventManager` for any event.
- Can set/revoke `event_member_permissions` for users on any event.

### EventManager

- Cannot manage platform or org roles.
- Cannot grant/revoke `EventManager`.
- Can set/revoke `event_member_permissions` only within events they manage.
- Has full write access to event-scoped entities in events they manage.

### Regular User

- Cannot grant roles or permissions.

## Event Lifecycle Authorization

- `SystemAdmin` and `OrgOwner` are auto-treated as managers for every event (no `event_members` row required).
- Archived events are read-only for non-admin users.
- Soft-deleted events are excluded from default list queries and can only be restored by authorized admins.

## Identity / User Management Authorization

Identity endpoints follow a two-tier authorization model:

### Accessible to OrgOwner and SystemAdmin

- `GET /api/identity/users` — list all users
- `GET /api/identity/users/{userId}` — get user detail

These are needed for OrgOwner to view users before assigning event-scoped roles/permissions.

### Restricted to SystemAdmin only

- `POST /api/identity/users/{userId}/org-role` — assign OrgOwner role
- `DELETE /api/identity/users/{userId}/org-role` — revoke OrgOwner role
- Invite token management (list/create/revoke)

OrgOwner cannot manage org-level roles or invite tokens.

## Enforcement Layers

Authorization is mandatory at both layers:

1. API layer (claims/policies in ASP.NET Core)
2. Data layer (Supabase PostgreSQL RLS policies)

Never rely on frontend filtering for authorization.

## Claims and Cache Contract

- `SanchoClaimsTransformation` composes:
  - `sancho:system_admin`
  - `sancho:org_role`
  - `sancho:event_role` (`{eventId}:{role}`)
  - `sancho:permission:{module}`
- Claims are cached in `IMemoryCache` with 90-second TTL.
- Mutations that affect managers/permissions must invalidate relevant claim cache entries.
