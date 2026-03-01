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

## Photo (Supabase Storage)

- `POST /api/events/{eventId}/characters/{characterId}/photo/upload-url`
- `POST /api/events/{eventId}/characters/{characterId}/photo/confirm`
- `DELETE /api/events/{eventId}/characters/{characterId}/photo`

Photo upload constraints:
- Max file size: 5 MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

## Attachments / Character Documents (Supabase Storage + Google Drive links)

- `GET /api/events/{eventId}/characters/{characterId}/attachments`
- `POST /api/events/{eventId}/characters/{characterId}/attachments/upload-url` — returns signed upload URL
- `POST /api/events/{eventId}/characters/{characterId}/attachments/confirm` — confirms upload and stores metadata
- `POST /api/events/{eventId}/characters/{characterId}/attachments/google-drive` — stores a Google Drive link
- `PATCH /api/events/{eventId}/characters/{characterId}/attachments/{attachmentId}` — update metadata (displayName, documentStatus) and optionally replace file/URL
- `DELETE /api/events/{eventId}/characters/{characterId}/attachments/{attachmentId}` — removes DB record; also deletes storage object for uploaded files

### Attachment fields

| Field | Description |
|-------|-------------|
| `displayName` | User-set document name (defaults to filename) |
| `fileName` | Original filename (stored as-is) |
| `fileUrl` | Storage path (Upload) or full URL (GoogleDrive) |
| `documentStatus` | `Draft` / `Ready to Review` / `Final` |
| `sourceType` | `Upload` or `GoogleDrive` |

### Upload constraints (file attachments)
- Max file size: **20 MB**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Extension vs. MIME cross-validation enforced server-side (prevents disguised uploads)
- Filename is sanitized to remove path-traversal characters

### Google Drive link constraints
- URL must use HTTPS
- Host must be one of: `drive.google.com`, `docs.google.com`, `sheets.google.com`, `slides.google.com`, `forms.google.com`

### Lock behavior
- Character `Locked`: file upload, file replacement, URL change, and delete are **blocked**
- Character `Locked`: `displayName` and `documentStatus` updates are **allowed**

## Narrative Read Model Hooks (Stubbed)

- `GET /api/events/{eventId}/characters/{characterId}/narrative-links`

The Character module currently uses `ICharacterNarrativeService` with a stub implementation that returns empty links. Deletion checks use the same interface (`HasActiveRelationshipsAsync`) and are pluggable.

