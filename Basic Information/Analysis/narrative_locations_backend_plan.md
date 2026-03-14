# Narrative Locations Backend Implementation Plan

Date: 2026-03-14
Scope: Database, backend services, API contracts, tests, and docs for the Locations sub-entity inside the existing `narrative` module.
Out of scope: frontend implementation details.

## 1. Readiness Assessment

The original draft is a strong product and API outline, but it is not yet sufficient as an implementation plan for this repository without tightening several engineering details:

- It does not fully align to the current backend structure, where all Narrative routes live in `backend/Sancho.Modules/Narrative/NarrativeEndpoints.cs` and reuse common helper patterns.
- Some SQL examples are not executable as written.
  - `UNIQUE (...)` cannot contain `COALESCE(...)` expressions inside a table constraint. This must be implemented as a unique index.
- Several cross-entity integrity rules are described, but not yet enforced at the database layer.
  - `event_id` consistency between location, floor, room, and linked quest/plotline/plot rows must be enforced.
  - `room_id` belonging to the selected `floor_id` and `location_id` must be enforced.
- The draft does not yet define which payloads should be aggregated to stay within the backend HTTP-call budget.
- The migration plan does not yet specify idempotent `DROP POLICY IF EXISTS` / `CREATE POLICY` style consistent with existing Narrative migrations.

This document closes those gaps and is implementation-ready pending the open decisions in section 11.

## 2. Existing Backend Baseline

Implementation must fit the current Narrative module rather than introduce a parallel structure.

- Routes are already mounted under `/api/events/{eventId:guid}/narrative`.
- Authorization is handled through `NarrativeAuthorizationService.ResolveEventAccessAsync(...)`.
- Locking rules already exist for quests, factions, plotlines, and plots through `NarrativeStatuses` and `NarrativeLifecycleService`.
- Shared Google Drive validation is already handled by `NarrativeDocumentLinkService`.
- DTOs and Supabase row models live in `backend/Sancho.Modules/Narrative/NarrativeModels.cs`.
- Integration tests already exist in `backend/Sancho.Modules/Narrative.Tests/NarrativeEndpoints.IntegrationTests.cs`.
- Existing upsert patterns use PostgREST merge semantics:
  - `Prefer: return=representation,resolution=merge-duplicates`

Implementation should preserve those patterns.

## 3. Implementation Goals

- Add event-scoped Narrative Locations with two immutable types: `basic` and `dungeon`.
- Support Narrative lifecycle states on locations only: `Draft`, `Ready`, `Locked`.
- Support dungeon floors and rooms with ordered CRUD and batch reorder.
- Support Google Drive document links on location, floor, and room.
- Support many-to-many links between locations and:
  - quests
  - plotlines
  - plots
- Support link granularity at:
  - location level
  - floor level
  - room level
- Preserve all authorization, event isolation, and performance requirements from [AGENTS.md](/D:/Sancho/AGENTS.md), [authorization_guidelines.md](/D:/Sancho/docs/architecture/authorization_guidelines.md), and [ARCHITECTURE.md](/D:/Sancho/Basic%20Information/ARCHITECTURE.md).

## 4. Delivery Strategy

Implementation will be delivered in five backend slices:

1. Database migration
2. Location CRUD and lifecycle endpoints
3. Dungeon floor and room endpoints
4. Location link endpoints and reverse link endpoints
5. Tests, OpenAPI verification, README/doc updates

This order keeps the change reviewable and allows the frontend to start integrating incrementally.

## 5. Database Implementation Plan

Create a new migration:

- `supabase/migrations/20260314xxxxxx_narrative_locations.sql`

The migration must follow existing Narrative migration style:

- `CREATE TABLE IF NOT EXISTS`
- `DROP POLICY IF EXISTS ...`
- `CREATE POLICY ...`
- `CREATE INDEX IF NOT EXISTS`
- `DROP TRIGGER IF EXISTS ...`

### 5.1 Tables

Create these tables:

- `public.narrative_locations`
- `public.narrative_dungeon_floors`
- `public.narrative_dungeon_rooms`
- `public.narrative_quest_locations`
- `public.narrative_plotline_locations`
- `public.narrative_plot_locations`

### 5.2 `narrative_locations`

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `description TEXT`
- `internal_notes TEXT`
- `location_type TEXT NOT NULL DEFAULT 'basic'`
- `status TEXT NOT NULL DEFAULT 'Draft'`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `deleted_at TIMESTAMPTZ`
- `deleted_by UUID REFERENCES public.user_profiles(id)`
- `deletion_reason TEXT`

Constraints:

- `location_type IN ('basic', 'dungeon')`
- `status IN ('Draft', 'Ready', 'Locked')`

Indexes:

- unique active-name index:
  - `CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_locations_event_name_active ON public.narrative_locations (event_id, lower(name)) WHERE deleted_at IS NULL;`
- active list index:
  - `CREATE INDEX IF NOT EXISTS idx_narrative_locations_event_created ON public.narrative_locations (event_id, created_at DESC) WHERE deleted_at IS NULL;`
- optional filter index if status filtering is included in v1:
  - `CREATE INDEX IF NOT EXISTS idx_narrative_locations_event_status_created ON public.narrative_locations (event_id, status, created_at DESC) WHERE deleted_at IS NULL;`

### 5.3 `narrative_dungeon_floors`

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE`
- `event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE`
- `sort_order INT NOT NULL DEFAULT 0`
- `name TEXT NOT NULL`
- `description TEXT`
- `internal_notes TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Indexes:

- `CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_floors_location_sort ON public.narrative_dungeon_floors (location_id, sort_order, id);`
- `CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_floors_event ON public.narrative_dungeon_floors (event_id);`

### 5.4 `narrative_dungeon_rooms`

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `floor_id UUID NOT NULL REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE`
- `location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE`
- `event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE`
- `sort_order INT NOT NULL DEFAULT 0`
- `name TEXT NOT NULL`
- `description TEXT`
- `internal_notes TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Indexes:

- `CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_floor_sort ON public.narrative_dungeon_rooms (floor_id, sort_order, id);`
- `CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_location ON public.narrative_dungeon_rooms (location_id);`
- `CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_event ON public.narrative_dungeon_rooms (event_id);`

### 5.5 Link Tables

Each link table stores:

- `event_id`
- owner entity id (`quest_id`, `plotline_id`, or `plot_id`)
- `location_id`
- nullable `floor_id`
- nullable `room_id`
- `created_at`

Tables:

- `public.narrative_quest_locations`
- `public.narrative_plotline_locations`
- `public.narrative_plot_locations`

Constraints:

- `room_id IS NULL OR floor_id IS NOT NULL`

Uniqueness:

- Use a unique index, not a table constraint, because expression-based normalization is required:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_quest_locations_granularity
  ON public.narrative_quest_locations
  (
    quest_id,
    location_id,
    COALESCE(floor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(room_id,  '00000000-0000-0000-0000-000000000000'::uuid)
  );
```

Use the same pattern for plotline and plot tables.

Indexes:

- `(event_id, quest_id, location_id)`
- `(event_id, location_id, quest_id)`
- `(event_id, plotline_id, location_id)`
- `(event_id, location_id, plotline_id)`
- `(event_id, plot_id, location_id)`
- `(event_id, location_id, plot_id)`

These are required for both forward and reverse lookup paths under RLS.

### 5.6 Cross-Table Integrity Enforcement

This is the main missing piece from the original draft.

The database must enforce these invariants:

- floor `event_id` matches parent location `event_id`
- room `event_id` matches parent floor and location `event_id`
- room `location_id` matches its floor's `location_id`
- quest/plotline/plot link `event_id` matches both sides of the link
- linked `floor_id` belongs to linked `location_id`
- linked `room_id` belongs to linked `floor_id` and linked `location_id`

Implementation approach:

- Add composite unique indexes on parent tables where needed:
  - `narrative_locations (id, event_id)`
  - `narrative_dungeon_floors (id, location_id, event_id)`
  - `narrative_dungeon_rooms (id, floor_id, location_id, event_id)`
- Prefer composite foreign keys where PostgreSQL can express them cleanly.
- Where composite FKs are not sufficient or become too heavy, add `BEFORE INSERT OR UPDATE` validation triggers:
  - `validate_narrative_dungeon_floor_parent()`
  - `validate_narrative_dungeon_room_parent()`
  - `validate_narrative_quest_location_link()`
  - `validate_narrative_plotline_location_link()`
  - `validate_narrative_plot_location_link()`

Trigger functions should raise explicit errors for:

- mismatched event scope
- invalid location/floor/room hierarchy
- floor or room used against a `basic` location

### 5.7 Document Link Constraint Update

Extend the existing `narrative_document_links_entity_type_check` constraint to allow:

- `location`
- `dungeon_floor`
- `dungeon_room`

Implementation must be idempotent:

- `ALTER TABLE ... DROP CONSTRAINT IF EXISTS narrative_document_links_entity_type_check;`
- `ALTER TABLE ... ADD CONSTRAINT narrative_document_links_entity_type_check CHECK (...);`

### 5.8 Triggers

Reuse existing `public.touch_narrative_updated_at()` on:

- `public.narrative_locations`
- `public.narrative_dungeon_floors`
- `public.narrative_dungeon_rooms`

### 5.9 RLS Policies

Enable RLS and use the existing canonical Narrative pattern on all new tables:

- `FOR SELECT USING (public.can_access_narrative_event(event_id, false))`
- `FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true))`

This keeps authorization aligned with [authorization_guidelines.md](/D:/Sancho/docs/architecture/authorization_guidelines.md).

## 6. Backend Code Implementation Plan

### 6.1 File Structure

Recommended structure:

- keep `NarrativeEndpoints.cs` as the main route registration entrypoint
- add a new file:
  - `backend/Sancho.Modules/Narrative/NarrativeLocationEndpoints.cs`

Pattern:

- `MapNarrativeEndpoints(...)` remains the top-level extension
- it delegates location route registration to a focused helper method

This avoids turning the current endpoint file into an unreviewable monolith.

### 6.2 Model Additions

Add to `backend/Sancho.Modules/Narrative/NarrativeModels.cs`:

- public DTOs
- request DTOs
- internal Supabase row models

Required models:

- `NarrativeLocationDto`
- `NarrativeDungeonFloorDto`
- `NarrativeDungeonRoomDto`
- `NarrativeLocationLinkDto`
- `CreateNarrativeLocationRequest`
- `UpdateNarrativeLocationRequest`
- `ChangeNarrativeLocationStatusRequest`
- `SoftDeleteNarrativeLocationRequest`
- `CreateDungeonFloorRequest`
- `UpdateDungeonFloorRequest`
- `CreateDungeonRoomRequest`
- `UpdateDungeonRoomRequest`
- `ReorderNarrativeChildRequest`
- `UpsertNarrativeLocationLinkRequest`
- internal row records for all new tables

### 6.3 Route Registration

Add these routes under `/api/events/{eventId:guid}/narrative`.

Location routes:

- `GET /locations`
- `POST /locations`
- `GET /locations/{locationId:guid}`
- `PATCH /locations/{locationId:guid}`
- `POST /locations/{locationId:guid}/status`
- `DELETE /locations/{locationId:guid}`
- `POST /locations/{locationId:guid}/undelete`

Location document routes:

- `GET /locations/{locationId:guid}/documents`
- `POST /locations/{locationId:guid}/documents/google-drive`
- `DELETE /locations/{locationId:guid}/documents/{documentId:guid}`

Floor routes:

- `GET /locations/{locationId:guid}/floors`
- `POST /locations/{locationId:guid}/floors`
- `PATCH /locations/{locationId:guid}/floors/{floorId:guid}`
- `DELETE /locations/{locationId:guid}/floors/{floorId:guid}`
- `POST /locations/{locationId:guid}/floors/reorder`

Floor document routes:

- `GET /locations/{locationId:guid}/floors/{floorId:guid}/documents`
- `POST /locations/{locationId:guid}/floors/{floorId:guid}/documents/google-drive`
- `DELETE /locations/{locationId:guid}/floors/{floorId:guid}/documents/{documentId:guid}`

Room routes:

- `GET /locations/{locationId:guid}/floors/{floorId:guid}/rooms`
- `POST /locations/{locationId:guid}/floors/{floorId:guid}/rooms`
- `PATCH /locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}`
- `DELETE /locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}`
- `POST /locations/{locationId:guid}/floors/{floorId:guid}/rooms/reorder`

Room document routes:

- `GET /locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents`
- `POST /locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents/google-drive`
- `DELETE /locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents/{documentId:guid}`

Flat floor document routes:

- `GET /dungeon-floors/{floorId:guid}/documents`
- `POST /dungeon-floors/{floorId:guid}/documents/google-drive`
- `DELETE /dungeon-floors/{floorId:guid}/documents/{documentId:guid}`

Flat room document routes:

- `GET /dungeon-rooms/{roomId:guid}/documents`
- `POST /dungeon-rooms/{roomId:guid}/documents/google-drive`
- `DELETE /dungeon-rooms/{roomId:guid}/documents/{documentId:guid}`

Location-side link routes:

- `GET /locations/{locationId:guid}/links/quests`
- `PUT /locations/{locationId:guid}/links/quests/{questId:guid}`
- `DELETE /locations/{locationId:guid}/links/quests/{questId:guid}`
- `GET /locations/{locationId:guid}/links/plotlines`
- `PUT /locations/{locationId:guid}/links/plotlines/{plotlineId:guid}`
- `DELETE /locations/{locationId:guid}/links/plotlines/{plotlineId:guid}`
- `GET /locations/{locationId:guid}/links/plots`
- `PUT /locations/{locationId:guid}/links/plots/{plotId:guid}`
- `DELETE /locations/{locationId:guid}/links/plots/{plotId:guid}`

Reverse link routes on existing entities:

- `GET /quests/{questId:guid}/links/locations`
- `PUT /quests/{questId:guid}/links/locations/{locationId:guid}`
- `DELETE /quests/{questId:guid}/links/locations/{locationId:guid}`
- `GET /plotlines/{plotlineId:guid}/links/locations`
- `PUT /plotlines/{plotlineId:guid}/links/locations/{locationId:guid}`
- `DELETE /plotlines/{plotlineId:guid}/links/locations/{locationId:guid}`
- `GET /plots/{plotId:guid}/links/locations`
- `PUT /plots/{plotId:guid}/links/locations/{locationId:guid}`
- `DELETE /plots/{plotId:guid}/links/locations/{locationId:guid}`

## 7. Endpoint Behavior and Validation

### 7.1 Shared Authorization Rules

All endpoints:

- call `NarrativeAuthorizationService.ResolveEventAccessAsync(...)`
- require `CanRead` for GETs
- require `CanWrite` for mutations
- inherit archived-event write blocking automatically from the existing service

### 7.2 Location CRUD Rules

Create:

- name required
- max length 200
- `locationType` must be `basic` or `dungeon`
- location starts in `Draft`
- active-name uniqueness checked before insert

Update:

- `locationType` immutable
- deleted location cannot be edited
- locked location allows editing `internalNotes` only
- if name changes, uniqueness check is required

Status:

- use `NarrativeLifecycleService.CanTransition(...)`
- `Locked -> Ready` requires `confirmUnlock = true`

Delete / Undelete:

- soft-delete only on locations
- undelete clears `deleted_at`, `deleted_by`, `deletion_reason`

### 7.3 Floor and Room Rules

Floor and room mutations require:

- parent location exists
- parent location is not soft-deleted
- parent location type is `dungeon`
- parent location status is not `Locked`

Floor validation:

- name required
- max length 200

Room validation:

- name required
- max length 200

Reorder:

- request body is array of `{ id, sortOrder }`
- all ids must belong to the specified parent
- send a single batch upsert/update request to Supabase

Delete:

- floor delete is hard-delete
- room delete is hard-delete
- floor delete cascades room delete through FK

### 7.4 Link Rules

Mutation validation:

- target location must exist and not be soft-deleted
- target quest/plotline/plot must exist
- if `roomId` is provided, `floorId` is required
- if `floorId` is provided, location must be `dungeon`
- `floorId` must belong to `locationId`
- `roomId` must belong to `floorId` and `locationId`
- deleted locations are not linkable
- links against deleted quests/plotlines/plots are not allowed

Upsert:

- use `Prefer: return=representation,resolution=merge-duplicates`
- database uniqueness must make identical links idempotent

Delete:

- delete uses the exact location/floor/room tuple
- delete request uses a request body carrying the exact tuple:
  - `locationId`
  - optional `floorId`
  - optional `roomId`
- this is preferred because the deleted relation is identified by a composite payload, not a single resource id

### 7.5 Document Rules

Reuse the current `ListDocuments(...)`, `AddGoogleDriveDocument(...)`, and `DeleteDocument(...)` pattern.

Before document mutation:

- verify the parent entity exists in the correct hierarchy
- for floor and room, verify parent location is `dungeon`

Entity type mapping:

- location -> `location`
- floor -> `dungeon_floor`
- room -> `dungeon_room`

## 8. Performance Plan

The implementation must stay within the repo HTTP-call budget.

### 8.1 List Endpoints

- `GET /locations` -> 1 Supabase call
  - supports `q`, `type`, `status`, and `includeDeleted`
- `GET /locations/{locationId}` -> up to 3 Supabase calls
  - call 1: location
  - call 2: floors and rooms in parallel
  - call 3: optional lightweight link summary in parallel if included in the detail contract
- `GET /locations/{locationId}/floors` -> 1 call
- `GET /locations/{locationId}/floors/{floorId}/rooms` -> 1 call

### 8.2 Detail Screen Support

Confirmed API contract:

- `GET /locations/{locationId}` returns the location plus embedded floors and rooms

Documents should remain lazy-loaded per tab.

### 8.3 Parallelism

When a handler needs independent reads:

- use `Task.WhenAll(...)`

Expected cases:

- reverse link lookup plus entity existence checks
- overview aggregation
- parallel floor/room and link summary reads

### 8.4 Batch Writes

Reorder endpoints must issue one batch write each.

No looped per-row `POST` or `PATCH` calls.

## 9. Test Plan

Add tests to `backend/Sancho.Modules/Narrative.Tests/NarrativeEndpoints.IntegrationTests.cs`.

### 9.1 Authorization

- user without narrative access cannot list locations
- explicit `narrative:read` can view location data but not mutate
- explicit `narrative:write` can mutate
- EventManager can mutate within managed event only
- archived event denies write for non-admin users

### 9.2 Lifecycle and Soft Delete

- create location defaults to `Draft`
- locked location rejects name/description edits but allows internal notes
- locked to ready requires `confirmUnlock`
- deleted location is hidden from default list
- undelete restores visibility

### 9.3 Dungeon Structure

- cannot create floor on `basic` location
- cannot create room under invalid floor
- cannot modify floor or room when parent location is locked
- reorder updates persisted sort order
- deleting floor removes its rooms

### 9.4 Links

- create location-level link
- create floor-level link
- create room-level link
- room without floor is rejected
- floor not belonging to location is rejected
- room not belonging to floor is rejected
- duplicate upsert is idempotent
- reverse endpoints return linked locations

### 9.5 Documents

- can add/list/delete location documents
- can add/list/delete floor documents
- can add/list/delete room documents

## 10. Documentation and Contract Updates

As part of implementation:

- update README before commit per [AGENTS.md](/D:/Sancho/AGENTS.md)
- add endpoints to README API section
- add tables to README database schema section
- add version history row with 2026-03-14 date
- update relevant architecture docs if route structure or domain ownership changes
- ensure OpenAPI output is regenerated if the repo currently tracks generated API docs

## 11. Confirmed Decisions

Confirmed decisions:

1. `GET /locations/{locationId}` returns location metadata with embedded floors and rooms.
2. `GET /locations` includes `q`, `type`, `status`, and `includeDeleted`.
3. Reverse link endpoints suppress soft-deleted locations by default and expose them when `includeDeleted=true`.
4. Floor and room documents are exposed through both nested and flat routes.
5. Deleting a specific location-link tuple uses request-body deletion.

## 12. Definition of Done

- migration created and applied successfully
- all new tables have RLS, indexes, and hierarchy validation
- new narrative location DTOs and row models added
- location, floor, room, link, and document endpoints implemented
- reverse location-link endpoints implemented on quests, plotlines, and plots
- integration tests cover auth, lifecycle, hierarchy, and links
- README and related docs updated
