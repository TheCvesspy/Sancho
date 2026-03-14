# Narrative Locations Backend Implementation Plan

Date: 2026-03-14
Scope: Backend + DB + API contracts for the Locations sub-entity within Narrative context.
Out of scope here: frontend implementation details (see `narrative_locations_frontend_plan.md`).

## 1. Goals and Constraints

### Goals
- Add location management (basic + dungeon types) to existing Narrative module.
- Support dungeon floor/room hierarchy with CRUD + reorder.
- Support flexible quest/plotline/plot linking at location, floor, or room granularity.
- Support Google Drive document links at all levels (location, floor, room).
- Extend existing `narrative_document_links` entity_type check constraint.

### Hard constraints from current repo rules
- Module id remains `narrative` (locations are a sub-entity, not a separate module).
- Event-scoped authorization and RLS isolation are mandatory.
- No `new HttpClient()`; use DI `HttpClient`.
- No `.Result` / `.Wait()`.
- Endpoint outbound call budget: max 3 Supabase HTTP calls.
- Parallelize independent reads with `Task.WhenAll(...)`.
- Soft-delete support for locations (not floors/rooms).
- Batch writes: collect records into arrays for single Supabase REST calls.

---

## 2. Current Baseline (Already Implemented)

- Narrative module is fully implemented with Quests, Plotlines, Plots, Factions, Items.
- `NarrativeEndpoints.cs` (~1200 lines) handles all existing narrative endpoints.
- `NarrativeAuthorizationService.cs` handles claims-first access resolution.
- `NarrativeDocumentLinkService.cs` handles Google Drive link CRUD with entity_type routing.
- `NarrativeLifecycleService.cs` handles status transitions (Draft ↔ Ready ↔ Locked).
- `NarrativeModels.cs` contains all DTOs and Supabase row models.
- `narrative_document_links` table supports entity_types: `quest`, `plotline`, `plot`, `faction`, `item`.
- RLS function `can_access_narrative_event(event_id, require_write)` is reused by all narrative tables.

---

## 3. Delivery Strategy

Implement in 4 backend phases to keep changes reviewable.

### Phase A: Database Migration (narrative_locations schema + RLS + indexes)

Create migration `supabase/migrations/2026031x000000_narrative_locations.sql` with:

#### 1. Core tables

**`narrative_locations`**
```sql
CREATE TABLE public.narrative_locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    internal_notes  TEXT,
    location_type   TEXT NOT NULL DEFAULT 'basic',
    status          TEXT NOT NULL DEFAULT 'Draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID REFERENCES public.user_profiles(id),
    deletion_reason TEXT,
    CONSTRAINT narrative_locations_type_check CHECK (location_type IN ('basic', 'dungeon')),
    CONSTRAINT narrative_locations_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'))
);
```

**`narrative_dungeon_floors`**
```sql
CREATE TABLE public.narrative_dungeon_floors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sort_order      INT NOT NULL DEFAULT 0,
    name            TEXT NOT NULL,
    description     TEXT,
    internal_notes  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`narrative_dungeon_rooms`**
```sql
CREATE TABLE public.narrative_dungeon_rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_id        UUID NOT NULL REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
    location_id     UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sort_order      INT NOT NULL DEFAULT 0,
    name            TEXT NOT NULL,
    description     TEXT,
    internal_notes  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2. Link tables (flexible granularity)

**`narrative_quest_locations`**
```sql
CREATE TABLE public.narrative_quest_locations (
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    quest_id        UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
    location_id     UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
    floor_id        UUID REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
    room_id         UUID REFERENCES public.narrative_dungeon_rooms(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quest_locations_room_requires_floor CHECK (room_id IS NULL OR floor_id IS NOT NULL),
    CONSTRAINT quest_locations_unique UNIQUE (
        quest_id,
        location_id,
        COALESCE(floor_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(room_id, '00000000-0000-0000-0000-000000000000')
    )
);
```

**`narrative_plotline_locations`** — same structure, replacing `quest_id` with `plotline_id UUID FK -> narrative_plotlines(id)`.

**`narrative_plot_locations`** — same structure, replacing `quest_id` with `plot_id UUID FK -> narrative_plots(id)`.

#### 3. Extend existing entity_type check constraint

```sql
ALTER TABLE public.narrative_document_links
    DROP CONSTRAINT narrative_document_links_entity_type_check;
ALTER TABLE public.narrative_document_links
    ADD CONSTRAINT narrative_document_links_entity_type_check
    CHECK (entity_type IN ('quest', 'plotline', 'plot', 'faction', 'item', 'location', 'dungeon_floor', 'dungeon_room'));
```

#### 4. Triggers

Reuse existing `touch_narrative_updated_at()` trigger:
```sql
CREATE TRIGGER trg_narrative_locations_touch_updated_at
    BEFORE UPDATE ON public.narrative_locations
    FOR EACH ROW EXECUTE FUNCTION touch_narrative_updated_at();

CREATE TRIGGER trg_narrative_dungeon_floors_touch_updated_at
    BEFORE UPDATE ON public.narrative_dungeon_floors
    FOR EACH ROW EXECUTE FUNCTION touch_narrative_updated_at();

CREATE TRIGGER trg_narrative_dungeon_rooms_touch_updated_at
    BEFORE UPDATE ON public.narrative_dungeon_rooms
    FOR EACH ROW EXECUTE FUNCTION touch_narrative_updated_at();
```

#### 5. RLS policies

Enable RLS on all 6 new tables. Use identical pattern to existing narrative tables:

```sql
ALTER TABLE public.narrative_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY narrative_locations_read ON public.narrative_locations
    FOR SELECT USING (can_access_narrative_event(event_id, false));

CREATE POLICY narrative_locations_insert ON public.narrative_locations
    FOR INSERT WITH CHECK (can_access_narrative_event(event_id, true));

CREATE POLICY narrative_locations_update ON public.narrative_locations
    FOR UPDATE USING (can_access_narrative_event(event_id, true));

CREATE POLICY narrative_locations_delete ON public.narrative_locations
    FOR DELETE USING (can_access_narrative_event(event_id, true));
```

Repeat for `narrative_dungeon_floors`, `narrative_dungeon_rooms`, `narrative_quest_locations`, `narrative_plotline_locations`, `narrative_plot_locations`.

#### 6. Mandatory indexes

```sql
-- Location list queries (partial index for active rows)
CREATE INDEX idx_narrative_locations_event_created
    ON public.narrative_locations (event_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Location name uniqueness (among non-deleted)
CREATE UNIQUE INDEX uq_narrative_locations_event_name_active
    ON public.narrative_locations (event_id, lower(name))
    WHERE deleted_at IS NULL;

-- Floor queries by location
CREATE INDEX idx_narrative_dungeon_floors_location
    ON public.narrative_dungeon_floors (location_id, sort_order);

CREATE INDEX idx_narrative_dungeon_floors_event
    ON public.narrative_dungeon_floors (event_id);

-- Room queries by floor and by location
CREATE INDEX idx_narrative_dungeon_rooms_floor
    ON public.narrative_dungeon_rooms (floor_id, sort_order);

CREATE INDEX idx_narrative_dungeon_rooms_location
    ON public.narrative_dungeon_rooms (location_id);

CREATE INDEX idx_narrative_dungeon_rooms_event
    ON public.narrative_dungeon_rooms (event_id);

-- Quest-location links (both directions)
CREATE INDEX idx_narrative_quest_locations_quest
    ON public.narrative_quest_locations (event_id, quest_id);

CREATE INDEX idx_narrative_quest_locations_location
    ON public.narrative_quest_locations (event_id, location_id);

-- Plotline-location links (both directions)
CREATE INDEX idx_narrative_plotline_locations_plotline
    ON public.narrative_plotline_locations (event_id, plotline_id);

CREATE INDEX idx_narrative_plotline_locations_location
    ON public.narrative_plotline_locations (event_id, location_id);

-- Plot-location links (both directions)
CREATE INDEX idx_narrative_plot_locations_plot
    ON public.narrative_plot_locations (event_id, plot_id);

CREATE INDEX idx_narrative_plot_locations_location
    ON public.narrative_plot_locations (event_id, location_id);

-- Document links for new entity types (already indexed by entity_type + entity_id in existing migration)
```

---

### Phase B: Location CRUD + Documents

Add to existing `NarrativeEndpoints.cs` (or create `NarrativeLocationEndpoints.cs` as a partial/extension if the file is too large):

#### Endpoints

**Location CRUD** — base: `/api/events/{eventId:guid}/narrative/locations`

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/locations` | — | List locations. Query: `?includeDeleted=true`, `?type=basic\|dungeon` |
| POST | `/locations` | `{ name, description?, internalNotes?, locationType }` | Create location |
| GET | `/locations/{locationId}` | — | Get location by id |
| PATCH | `/locations/{locationId}` | `{ name?, description?, internalNotes? }` | Update location |
| POST | `/locations/{locationId}/status` | `{ status, confirmUnlock? }` | Change status |
| DELETE | `/locations/{locationId}` | `{ reason? }` | Soft-delete |
| POST | `/locations/{locationId}/undelete` | — | Restore |

**Location Documents** — reuse `NarrativeDocumentLinkService` with `entity_type = 'location'`:

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/locations/{locationId}/documents` | — | List documents |
| POST | `/locations/{locationId}/documents/google-drive` | `{ displayName, url, documentStatus? }` | Add Google Drive link |
| DELETE | `/locations/{locationId}/documents/{documentId}` | — | Delete document |

#### DTOs (add to NarrativeModels.cs)

```csharp
// Row model (maps to Supabase snake_case)
public record NarrativeLocationRow(
    Guid id, Guid event_id, string name, string? description, string? internal_notes,
    string location_type, string status,
    DateTimeOffset created_at, DateTimeOffset updated_at,
    DateTimeOffset? deleted_at, Guid? deleted_by, string? deletion_reason
);

// API response DTO (camelCase)
public record NarrativeLocationDto(
    Guid Id, Guid EventId, string Name, string? Description, string? InternalNotes,
    string LocationType, string Status,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

// Request DTOs
public record CreateNarrativeLocationRequest(string Name, string? Description, string? InternalNotes, string LocationType);
public record UpdateNarrativeLocationRequest(string? Name, string? Description, string? InternalNotes);
```

#### Validation rules
- Name required, max 200 chars.
- Name unique per event among non-deleted locations (checked via Supabase query before insert).
- `locationType` must be `basic` or `dungeon`. Immutable after creation.
- Status transitions: Draft ↔ Ready ↔ Locked. Locked → Ready requires `confirmUnlock = true`.
- Locked locations reject PATCH updates (except internal notes — consistent with quest behavior).
- Archived events block writes for non-admin users.

---

### Phase C: Dungeon Floor & Room CRUD

#### Floor Endpoints — base: `/api/events/{eventId}/narrative/locations/{locationId}/floors`

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/floors` | — | List floors (ordered by sort_order) |
| POST | `/floors` | `{ name, description?, internalNotes?, sortOrder? }` | Create floor |
| PATCH | `/floors/{floorId}` | `{ name?, description?, internalNotes? }` | Update floor |
| DELETE | `/floors/{floorId}` | — | Hard-delete (cascades rooms) |
| POST | `/floors/reorder` | `[{ id, sortOrder }]` | Batch reorder |

**Floor Documents:**

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/floors/{floorId}/documents` | — | List floor documents |
| POST | `/floors/{floorId}/documents/google-drive` | `{ displayName, url, documentStatus? }` | Add Google Drive link |
| DELETE | `/floors/{floorId}/documents/{documentId}` | — | Delete document |

#### Room Endpoints — base: `.../floors/{floorId}/rooms`

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/rooms` | — | List rooms (ordered by sort_order) |
| POST | `/rooms` | `{ name, description?, internalNotes?, sortOrder? }` | Create room |
| PATCH | `/rooms/{roomId}` | `{ name?, description?, internalNotes? }` | Update room |
| DELETE | `/rooms/{roomId}` | — | Hard-delete |
| POST | `/rooms/reorder` | `[{ id, sortOrder }]` | Batch reorder |

**Room Documents:**

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/rooms/{roomId}/documents` | — | List room documents |
| POST | `/rooms/{roomId}/documents/google-drive` | `{ displayName, url, documentStatus? }` | Add Google Drive link |
| DELETE | `/rooms/{roomId}/documents/{documentId}` | — | Delete document |

#### Floor/Room DTOs

```csharp
public record NarrativeDungeonFloorRow(
    Guid id, Guid location_id, Guid event_id, int sort_order,
    string name, string? description, string? internal_notes,
    DateTimeOffset created_at, DateTimeOffset updated_at
);

public record NarrativeDungeonFloorDto(
    Guid Id, Guid LocationId, Guid EventId, int SortOrder,
    string Name, string? Description, string? InternalNotes,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt
);

public record CreateDungeonFloorRequest(string Name, string? Description, string? InternalNotes, int? SortOrder);
public record UpdateDungeonFloorRequest(string? Name, string? Description, string? InternalNotes);

public record NarrativeDungeonRoomRow(
    Guid id, Guid floor_id, Guid location_id, Guid event_id, int sort_order,
    string name, string? description, string? internal_notes,
    DateTimeOffset created_at, DateTimeOffset updated_at
);

public record NarrativeDungeonRoomDto(
    Guid Id, Guid FloorId, Guid LocationId, Guid EventId, int SortOrder,
    string Name, string? Description, string? InternalNotes,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt
);

public record CreateDungeonRoomRequest(string Name, string? Description, string? InternalNotes, int? SortOrder);
public record UpdateDungeonRoomRequest(string? Name, string? Description, string? InternalNotes);

public record ReorderRequest(Guid Id, int SortOrder);
```

#### Validation rules
- Floor/room creation returns 400 if `location_type != 'dungeon'`.
- Floor/room operations return 400 if parent location is Locked.
- Floor name required, max 200 chars.
- Room name required, max 200 chars.
- Reorder body: array of `{ id, sortOrder }`. Single batch Supabase call.
- Deleting a floor cascades (hard-deletes) all rooms on that floor.

---

### Phase D: Link Endpoints (Both Directions)

#### Location-side link endpoints — base: `.../locations/{locationId}/links`

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/links/quests` | — | List quest links for this location (all granularities) |
| PUT | `/links/quests/{questId}` | `{ floorId?, roomId? }` | Upsert quest link |
| DELETE | `/links/quests/{questId}` | Query: `?floorId=&roomId=` | Delete specific quest link |
| GET | `/links/plotlines` | — | List plotline links |
| PUT | `/links/plotlines/{plotlineId}` | `{ floorId?, roomId? }` | Upsert plotline link |
| DELETE | `/links/plotlines/{plotlineId}` | Query: `?floorId=&roomId=` | Delete specific plotline link |
| GET | `/links/plots` | — | List plot links |
| PUT | `/links/plots/{plotId}` | `{ floorId?, roomId? }` | Upsert plot link |
| DELETE | `/links/plots/{plotId}` | Query: `?floorId=&roomId=` | Delete specific plot link |

#### Reverse link endpoints (added to existing quest/plotline/plot routes)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/quests/{questId}/links/locations` | — | List location links for a quest |
| PUT | `/quests/{questId}/links/locations/{locationId}` | `{ floorId?, roomId? }` | Upsert |
| DELETE | `/quests/{questId}/links/locations/{locationId}` | Query: `?floorId=&roomId=` | Delete |
| GET | `/plotlines/{plotlineId}/links/locations` | — | Same for plotlines |
| PUT | `/plotlines/{plotlineId}/links/locations/{locationId}` | `{ floorId?, roomId? }` | Upsert |
| DELETE | `/plotlines/{plotlineId}/links/locations/{locationId}` | Query: `?floorId=&roomId=` | Delete |
| GET | `/plots/{plotId}/links/locations` | — | Same for plots |
| PUT | `/plots/{plotId}/links/locations/{locationId}` | `{ floorId?, roomId? }` | Upsert |
| DELETE | `/plots/{plotId}/links/locations/{locationId}` | Query: `?floorId=&roomId=` | Delete |

#### Link DTOs

```csharp
public record NarrativeLocationLinkRow(
    Guid event_id, Guid quest_id /* or plotline_id or plot_id */,
    Guid location_id, Guid? floor_id, Guid? room_id,
    DateTimeOffset created_at
);

public record NarrativeLocationLinkDto(
    Guid EventId,
    Guid? QuestId, Guid? PlotlineId, Guid? PlotId,
    Guid LocationId, Guid? FloorId, Guid? RoomId,
    string LocationName, string? FloorName, string? RoomName,
    DateTimeOffset CreatedAt
);

public record UpsertLocationLinkRequest(Guid? FloorId, Guid? RoomId);
```

#### Link validation rules
- If `roomId` is provided, `floorId` must also be provided (400 if not).
- If `floorId` is provided, the target location must be dungeon type (400 if basic).
- `floorId` must belong to the target `locationId` (400 if not).
- `roomId` must belong to the target `floorId` (400 if not).
- Duplicate links (same quest + location + floor + room combo) are idempotent (upsert).

---

## 4. Backend Structure Changes

### File organization options

Given `NarrativeEndpoints.cs` is already ~1200 lines, consider one of:
1. **Add to existing file** — keep all narrative endpoints together (simpler, but file grows).
2. **Split into partial class** — `NarrativeLocationEndpoints.cs` as a static partial or extension method class mapping location routes.

Recommended: **Option 2** — create `NarrativeLocationEndpoints.cs` with a `MapNarrativeLocationEndpoints(this RouteGroupBuilder group)` extension method, called from `MapNarrativeEndpoints()`.

### Existing service reuse
- `NarrativeAuthorizationService` — reuse `ResolveEventAccessAsync()` for all location endpoints. No changes needed.
- `NarrativeDocumentLinkService` — reuse for location/floor/room documents. Only new entity_type values needed (`location`, `dungeon_floor`, `dungeon_room`). May need minor update if entity_type validation is hardcoded.
- `NarrativeLifecycleService` — reuse for location status transitions. Same Draft ↔ Ready ↔ Locked model.

---

## 5. Performance Plan (Non-negotiable)

1. **HTTP call budget**
   - Location list: 1 call (query with filters).
   - Location detail page: 3 calls max via `Task.WhenAll`:
     - Call 1: GET location
     - Call 2: GET floors + rooms (single query joining on location_id, or two parallel sub-calls)
     - Call 3: GET links (quest + plotline + plot links in parallel sub-calls)
   - Documents fetched separately only when Documents tab is active (client-side lazy load).
   - Floor/room reorder: 1 batch call with array body.

2. **Parallel reads**
   - `Task.WhenAll` for: floors query + rooms query + quest-links query + plotline-links query + plot-links query.

3. **Query shape**
   - Use narrow `select=` projections.
   - Location list uses partial index `WHERE deleted_at IS NULL`.
   - Link queries include joined location/floor/room names to avoid N+1.

4. **Index coverage checklist**
   - [x] All RLS predicate columns (`event_id`) indexed on every table.
   - [x] Soft-delete partial indexes on `narrative_locations`.
   - [x] FK columns on link tables indexed in both directions.
   - [x] Floor/room sort_order queries covered by `(location_id, sort_order)` and `(floor_id, sort_order)` indexes.

---

## 6. Testing Plan

1. **Unit tests**
   - Location status transition validation (Draft ↔ Ready ↔ Locked, confirm unlock).
   - Link granularity validation (room requires floor, floor requires dungeon type).
   - Location type immutability check.

2. **Integration tests**
   - Auth matrix: `SystemAdmin`, `OrgOwner`, `EventManager`, `narrative:read`, `narrative:write`.
   - Archived event write denial for non-admins.
   - Soft-delete/restore flow for locations.
   - Floor/room CRUD blocked when location is Locked.
   - Floor/room CRUD blocked when location_type is `basic`.
   - Link creation with all granularity levels.
   - Cascade: deleting floor cascades rooms and cleans up links referencing those rooms.
   - Document links at all three levels (location, floor, room).

---

## 7. Suggested Implementation Order (Small PRs)

1. **PR-1**: Migration — tables + constraints + indexes + RLS + triggers.
2. **PR-2**: Location CRUD + status + soft-delete/restore + documents.
3. **PR-3**: Floor + Room CRUD + reorder + floor/room documents.
4. **PR-4**: Link endpoints (location-side + reverse on quest/plotline/plot).
5. **PR-5**: README update + docs + OpenAPI.

---

## 8. Definition of Done

- Location endpoints implemented and wired under `/api/events/{eventId}/narrative/locations/...`.
- Reverse link endpoints added to existing quest/plotline/plot routes.
- DB schema + RLS + indexes migrated successfully.
- `narrative_document_links` entity_type constraint updated.
- All validation rules enforced (type immutability, lock blocking, granularity constraints).
- Integration tests cover auth + lifecycle + floor/room cascade + link granularity.
- README updated with:
  - Version bump
  - New endpoints listed
  - New tables listed
  - Version history row
