# Event Management Context (Backend Design Note)

Date: 2026-02-28

## Scope

Event Management owns:
- event lifecycle (`active`, `archived`, `soft-deleted`)
- event managers assignment
- event module-level permission control
- basic event overview outputs (stats + recent activity)

## Confirmed Product Rules

1. Event fields: `name`, `location`, `start_at`, `end_at`.
2. Soft delete is required and recoverable.
3. Archived events are read-only for everyone except `SystemAdmin` and `OrgOwner`.
4. Multiple Event Managers per event are allowed.
5. `SystemAdmin` and `OrgOwner` are always treated as managers for all events without explicit membership rows.
6. Recent activity starts as a lightweight append-only stream.
7. Stats endpoint is pluggable because downstream context tables are not fully implemented yet.
8. Event API base path is `/api/events`.
9. Access-control management in Event module includes both:
- manager assignment (`event_members`)
- granular per-module permissions (`event_member_permissions`)

## Suggested Data Additions

On `public.events`:
- `status` (`active`, `archived`)
- `archived_at`, `archived_by`
- `deleted_at`, `deleted_by`, `deletion_reason`
- `updated_at`

New table:
- `public.event_activity_log` for recent activity timeline.

## API Contract Reference

Primary contract is defined in:
- `docs/api/events.md`

Context detail is defined in:
- `docs/bounded-contexts/event-management.md`
