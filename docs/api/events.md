# Event Management API

The Event Management API owns creation and administration of multiple events in a single-organization Sancho deployment.

All endpoints are mounted under `/api/events` and require a valid Supabase JWT in `Authorization: Bearer <token>`.

## Goals

- Support many events in parallel (`active`, `archived`, `soft-deleted`).
- Keep dangerous operations restricted to `SystemAdmin` and `OrgOwner`.
- Keep per-event access control centralized:
  - event manager assignment (`event_members`)
  - granular module permissions (`event_member_permissions`)
- Provide event-level operational insights (`stats`, `recent activity`).

## Authorization Model

1. `SystemAdmin`
- Full access across all events.
- Can create, update, archive, restore, soft-delete events.
- Can assign/revoke Event Managers.
- Can manage per-event module permissions.

2. `OrgOwner`
- Full access across all events (same as SystemAdmin for this module).

3. `EventManager`
- Treated as manager only for events where membership exists in `public.event_members`.
- Cannot create/archive/delete events.
- Can manage per-event module permissions for their event.
- Can read event details, stats, and recent activity.

4. Auto-manager rule
- `SystemAdmin` and `OrgOwner` are always treated as Event Managers for every event without explicit `event_members` rows.

## Archived Event Rule

- Archived events are read-only for everyone except `SystemAdmin` and `OrgOwner`.
- Event Managers can still read archived events but cannot mutate anything.

## Event Lifecycle

1. `active`: normal operation.
2. `archived`: read-only for non-Org/System.
3. `soft-deleted`: hidden from default lists, recoverable.

Recommended event columns:
- `id UUID PK`
- `name TEXT NOT NULL`
- `location TEXT`
- `start_at TIMESTAMPTZ NOT NULL`
- `end_at TIMESTAMPTZ NOT NULL`
- `status TEXT NOT NULL DEFAULT 'active'` (`active`, `archived`)
- `archived_at TIMESTAMPTZ NULL`
- `archived_by UUID NULL`
- `deleted_at TIMESTAMPTZ NULL`
- `deleted_by UUID NULL`
- `deletion_reason TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Validation:
- `start_at <= end_at`
- cannot archive deleted events
- cannot assign manager to deleted events

## Recent Activity (Lightweight)

Use append-only table `public.event_activity_log`:

- `id UUID PK`
- `event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE`
- `actor_user_id UUID NULL REFERENCES public.user_profiles(id)`
- `action TEXT NOT NULL` (example: `event.created`, `event.archived`, `manager.assigned`, `permission.updated`)
- `entity_type TEXT NULL` (example: `event`, `event_member`, `event_permission`)
- `entity_id UUID NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Only latest entries are needed for now (no complex analytics pipeline).

## Pluggable Stats

`GET /api/events/{eventId}/stats` returns:
- `charactersCount`
- `questLinesCount`
- `itemsCount`
- `playersCount`

Implementation guideline:
- Define a backend interface (for example `IEventStatsProvider`) with providers per bounded context.
- If a context is not implemented yet, provider returns `null` or `0` with `source: "unavailable"`.
- Event module aggregates provider results into one response.

## Endpoints

### 1. List events
`GET /api/events?includeArchived=false&includeDeleted=false&page=1&pageSize=20`

Access:
- `SystemAdmin`, `OrgOwner`: all events
- `EventManager`: events they manage

### 2. Create event
`POST /api/events`

Body:
```json
{
  "name": "Summer LARP 2026",
  "location": "Brno, CZ",
  "startAt": "2026-07-03T09:00:00Z",
  "endAt": "2026-07-05T15:00:00Z"
}
```

Allowed: `SystemAdmin`, `OrgOwner`

### 3. Get event detail
`GET /api/events/{eventId}`

Includes lifecycle state and core fields.

### 4. Update basic event info
`PATCH /api/events/{eventId}`

Allowed:
- `SystemAdmin`, `OrgOwner`
- `EventManager` only when event is `active`

### 5. Archive event (dangerous)
`POST /api/events/{eventId}/archive`

Body:
```json
{
  "reason": "Event completed"
}
```

Allowed: `SystemAdmin`, `OrgOwner`

### 6. Restore archived event
`POST /api/events/{eventId}/restore`

Allowed: `SystemAdmin`, `OrgOwner`

### 7. Soft delete event (dangerous)
`DELETE /api/events/{eventId}`

Body:
```json
{
  "reason": "Duplicate event created by mistake"
}
```

Behavior:
- set `deleted_at`, `deleted_by`, `deletion_reason`
- keep recoverable

Allowed: `SystemAdmin`, `OrgOwner`

### 8. Restore soft-deleted event
`POST /api/events/{eventId}/undelete`

Allowed: `SystemAdmin`, `OrgOwner`

### 9. List event managers
`GET /api/events/{eventId}/managers`

Allowed: `SystemAdmin`, `OrgOwner`, `EventManager`(for same event)

### 10. Assign event manager
`PUT /api/events/{eventId}/managers/{userId}`

Allowed: `SystemAdmin`, `OrgOwner`

### 11. Revoke event manager
`DELETE /api/events/{eventId}/managers/{userId}`

Allowed: `SystemAdmin`, `OrgOwner`

### 12. Get per-event permissions
`GET /api/events/{eventId}/permissions?userId={userId}`

Returns explicit grants from `event_member_permissions` and optionally effective result.

Allowed: `SystemAdmin`, `OrgOwner`, `EventManager`(for same event)

### 13. Upsert per-event module permission
`PUT /api/events/{eventId}/permissions/{userId}/{module}`

Body:
```json
{
  "permission": "read"
}
```

Allowed: `SystemAdmin`, `OrgOwner`, `EventManager`(for same event and active event only)

### 14. Revoke per-event module permission
`DELETE /api/events/{eventId}/permissions/{userId}/{module}`

Allowed: `SystemAdmin`, `OrgOwner`, `EventManager`(for same event and active event only)

### 15. Event stats
`GET /api/events/{eventId}/stats`

Sample:
```json
{
  "charactersCount": 120,
  "questLinesCount": 0,
  "itemsCount": 0,
  "playersCount": 98,
  "sources": {
    "characters": "characters-context",
    "questLines": "unavailable",
    "items": "unavailable",
    "players": "event-members"
  }
}
```

### 16. Recent activity
`GET /api/events/{eventId}/activity/recent?limit=20`

Sample:
```json
[
  {
    "id": "8f2f9e46-18d9-40f3-aa67-2e0f9c14fa0f",
    "createdAt": "2026-02-28T12:05:00Z",
    "actorUserId": "4cbf8d3e-cf04-4ec8-9268-c9e8d0ecf3f5",
    "action": "manager.assigned",
    "entityType": "event_member",
    "entityId": "1f2717c2-d3f6-4f8c-a6d8-8e9ad4f14f33",
    "metadata": {
      "targetUserId": "2bbf35c2-4447-47a8-a726-9f1e3cd9cb9d",
      "role": "EventManager"
    }
  }
]
```

## RLS/Policy Expectations

- `events` policies must honor lifecycle:
  - deleted events hidden by default
  - archived mutation restricted to SystemAdmin/OrgOwner
- `event_members` and `event_member_permissions` policies must allow:
  - SystemAdmin/OrgOwner full event scope
  - EventManager only for their `event_id`
- Do not rely only on client filtering.

## Notes for Implementation

- Keep event writes idempotent where possible (`PUT` for manager assignment).
- Emit an `event_activity_log` row for every write operation.
- Keep dangerous operations auditable (`reason`, `actor`, timestamp).
- Keep API backward-compatible and version only on breaking changes.
