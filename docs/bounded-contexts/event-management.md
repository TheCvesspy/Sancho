# Event Management Bounded Context

The Event Management context owns event lifecycle, event leadership assignment, event-scoped permissions, and operational overview endpoints.

## Responsibilities

- Create and update events (`name`, `location`, `start_at`, `end_at`).
- Manage event lifecycle states:
  - active
  - archived
  - soft-deleted (recoverable)
- Assign/revoke `EventManager` users per event.
- Manage per-event module permissions for users.
- Publish event overview data:
  - stats (pluggable providers)
  - recent activity feed

## Non-Responsibilities

- Detailed module records (characters, quests, items, finance entities).
- Organization-level user directory and org role assignment (Identity context).
- User self-profile and preference management (User context).

## Data Model (Current + Required Additions)

Existing:
- `public.events`
- `public.event_members`
- `public.event_member_permissions`

Recommended additions to `public.events`:
- `status` (`active`, `archived`)
- `archived_at`, `archived_by`
- `deleted_at`, `deleted_by`, `deletion_reason`
- `updated_at`

New lightweight operational table:
- `public.event_activity_log`

## Core Invariants

1. One deployment can contain multiple events.
2. `SystemAdmin` and `OrgOwner` can fully manage any event without explicit event membership.
3. Archived events are read-only for everyone except `SystemAdmin` and `OrgOwner`.
4. Soft-deleted events are recoverable and excluded from default lists.
5. Event manager assignment is many-to-many (`event_members` supports multiple managers per event).

## Authorization Rules

1. Create/archive/delete/restore events:
- Allowed: `SystemAdmin`, `OrgOwner`
- Denied: `EventManager`, regular users

2. Edit event basics:
- Allowed: `SystemAdmin`, `OrgOwner`
- Allowed for `EventManager` only while event is active

3. Manage event managers:
- Allowed: `SystemAdmin`, `OrgOwner`

4. Manage event module permissions:
- Allowed: `SystemAdmin`, `OrgOwner`
- Allowed: `EventManager` for their event while active

## API Surface

Base route: `/api/events`

See detailed contract in [events.md](/D:/Sancho/docs/api/events.md).

## Read Model Endpoints

- `GET /api/events/{eventId}/stats`
  - Aggregates counts via pluggable providers per context.
- `GET /api/events/{eventId}/activity/recent`
  - Returns latest entries from `event_activity_log`.

## Write Model Endpoints

- `POST /api/events`
- `PATCH /api/events/{eventId}`
- `POST /api/events/{eventId}/archive`
- `POST /api/events/{eventId}/restore`
- `DELETE /api/events/{eventId}`
- `POST /api/events/{eventId}/undelete`
- `PUT/DELETE /api/events/{eventId}/managers/{userId}`
- `PUT/DELETE /api/events/{eventId}/permissions/{userId}/{module}`
  - `{module}` must be one of: `characters`, `narrative`, `logistics`, `finance`, `npc_org`, `communications`, `event_management`.

## Suggested Backend Structure (`backend/Sancho.Modules/EventManagement`)

- `Endpoints/EventEndpoints.cs`
- `Models/EventDtos.cs`
- `Services/EventAuthorizationService.cs`
- `Services/EventStatsService.cs`
- `Services/EventActivityService.cs`
- `Repositories/EventRepository.cs` (if abstraction is introduced)

## Validation Rules

- `name` required, length constrained.
- `start_at <= end_at`.
- dangerous operations require reason text.
- cannot mutate a soft-deleted event (except undelete).
- manager/permission writes fail for unknown user or missing event.

## Integration Points

- Identity context:
  - user lookup for manager assignment and activity actor references.
- User context:
  - effective permissions already composed in `/api/user/me/permissions`.
- Future module providers:
  - Characters/Narrative/Logistics/Finance/NPC/Communications for stats.

## Testing Strategy

- Unit tests:
  - lifecycle transitions and rule checks
  - authorization evaluator
  - stats aggregation fallback behavior
- Integration tests:
  - endpoint auth matrix by role
  - archived read-only behavior
  - soft-delete/undelete flow
  - manager and permission assignment flows
