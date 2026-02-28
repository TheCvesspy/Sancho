# Characters API

Characters are event-scoped and exposed under:

- `/api/events/{eventId}/characters`

All endpoints require a valid JWT.

## Authorization

- `SystemAdmin` and `OrgOwner`: read/write across all events.
- `EventManager`: read/write for assigned events while event is active.
- `event_member_permissions(module='characters')`:
  - `read` => read-only
  - `write` => read/write while event is active
- Archived events are read-only for non-admin users.

## Core Endpoints

- `GET /api/events/{eventId}/characters`
- `POST /api/events/{eventId}/characters`
- `GET /api/events/{eventId}/characters/{characterId}`
- `PATCH /api/events/{eventId}/characters/{characterId}`
- `POST /api/events/{eventId}/characters/{characterId}/status`
- `POST /api/events/{eventId}/characters/{characterId}/duplicate`
- `DELETE /api/events/{eventId}/characters/{characterId}` (soft-delete)
- `POST /api/events/{eventId}/characters/{characterId}/undelete`

## Abilities

- `GET /api/events/{eventId}/characters/{characterId}/abilities`
- `POST /api/events/{eventId}/characters/{characterId}/abilities`
- `PATCH /api/events/{eventId}/characters/{characterId}/abilities/{abilityId}`
- `DELETE /api/events/{eventId}/characters/{characterId}/abilities/{abilityId}`

## Photo & Attachments (Supabase Storage)

- `POST /api/events/{eventId}/characters/{characterId}/photo/upload-url`
- `POST /api/events/{eventId}/characters/{characterId}/photo/confirm`
- `DELETE /api/events/{eventId}/characters/{characterId}/photo`
- `GET /api/events/{eventId}/characters/{characterId}/attachments`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/upload-url`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/confirm`
- `DELETE /api/events/{eventId}/characters/{characterId}/attachments/{attachmentId}`

Upload constraints:
- Max file size: 5 MB
- Photo types: `image/jpeg`, `image/png`, `image/webp`
- Attachments currently allow images + `application/pdf` + `text/plain`

## Narrative Read Model Hooks (Stubbed)

- `GET /api/events/{eventId}/characters/{characterId}/narrative-links`

The Character module currently uses `ICharacterNarrativeService` with a stub implementation that returns empty links. Deletion checks use the same interface (`HasActiveRelationshipsAsync`) and are pluggable.

