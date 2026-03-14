# Narrative Locations Context (Use Case Draft)

Date: 2026-03-14

## Scope and Responsibility

Narrative Locations is a sub-entity within the **Narrative context**, event-scoped (same as Quests, Factions, Items). It owns:
- Locations (basic type — simple named places)
- Dungeons (complex type — locations with floor/room hierarchy)
- Dungeon Floors (ordered sub-structures within a dungeon)
- Dungeon Rooms (ordered sub-structures within a floor)
- Quest/Plotline/Plot linking at any granularity level (whole location, specific floor, specific room)
- Google Drive document links at all levels (location, floor, room)

Narrative Locations must integrate with:
- Existing Narrative entities (Quests, Plotlines, Plots) for many-to-many linking
- Shared document-link handling (reuse `narrative_document_links` table with new entity_type values)

Not in scope for Locations v1:
- Direct character links (characters connect to locations indirectly through quests)
- Map/image URL field (users attach maps via Google Drive document links)
- Faction links to locations (can be added later if needed)
- Item links to locations (can be added later if needed)

---

## Boundary Matrix (Owns vs Consumes)

| Data | Owner | Locations Context |
|---|---|---|
| Location profile (basic + dungeon) | Narrative (Locations) | Read + Write |
| Dungeon floor structure | Narrative (Locations) | Read + Write |
| Dungeon room structure | Narrative (Locations) | Read + Write |
| Location/Floor/Room ↔ Quest links | Narrative (Locations) | Read + Write |
| Location/Floor/Room ↔ Plotline links | Narrative (Locations) | Read + Write |
| Location/Floor/Room ↔ Plot links | Narrative (Locations) | Read + Write |
| Location/Floor/Room Google Drive links | Shared attachment/link service | Read + Write (via `narrative_document_links`) |
| Quest/Plotline/Plot core data | Narrative (other entities) | Read-only reference |
| Event membership and permissions | Identity + Event Mgmt | Read-only for auth |

---

## Core Domain Model (Conceptual)

### Location

```
NarrativeLocation
|-- id                  UUID PK
|-- event_id            UUID FK -> Event
|-- name                string           # unique per event (non-deleted)
|-- description         text (rich text)
|-- internal_notes      text?
|-- location_type       enum             # 'basic' | 'dungeon'
|-- status              enum             # Draft | Ready | Locked
|-- deleted_at          timestamptz?
|-- deleted_by          UUID? FK -> user_profiles
|-- deletion_reason     text?
|-- created_at          timestamptz
`-- updated_at          timestamptz
```

Location has:
- Google Drive document links (via shared `narrative_document_links` with `entity_type = 'location'`)
- N..M links to Quests, Plotlines, Plots (with optional floor/room granularity)
- If `location_type = 'dungeon'`: 0..N `DungeonFloor` children

### Dungeon Floor (only for dungeon-type locations)

```
NarrativeDungeonFloor
|-- id                  UUID PK
|-- location_id         UUID FK -> narrative_locations
|-- event_id            UUID FK -> events (denormalized for RLS)
|-- sort_order          int
|-- name                string
|-- description         text?
|-- internal_notes      text?
|-- created_at          timestamptz
`-- updated_at          timestamptz
```

Floor has:
- 0..N `DungeonRoom` children
- Google Drive document links (via `narrative_document_links` with `entity_type = 'dungeon_floor'`)
- Can be independently linked to Quests/Plotlines/Plots (via nullable `floor_id` on link tables)

### Dungeon Room (child of floor)

```
NarrativeDungeonRoom
|-- id                  UUID PK
|-- floor_id            UUID FK -> narrative_dungeon_floors
|-- location_id         UUID FK -> narrative_locations (denormalized for RLS)
|-- event_id            UUID FK -> events (denormalized for RLS)
|-- sort_order          int
|-- name                string
|-- description         text?
|-- internal_notes      text?
|-- created_at          timestamptz
`-- updated_at          timestamptz
```

Room has:
- Google Drive document links (via `narrative_document_links` with `entity_type = 'dungeon_room'`)
- Can be independently linked to Quests/Plotlines/Plots (via nullable `room_id` on link tables)

### Link Tables (Flexible Granularity)

Quest/Plotline/Plot links support three levels of specificity:

```
narrative_quest_locations
|-- event_id            UUID FK (denormalized for RLS)
|-- quest_id            UUID FK -> narrative_quests
|-- location_id         UUID FK -> narrative_locations (always required)
|-- floor_id            UUID FK? -> narrative_dungeon_floors (nullable)
|-- room_id             UUID FK? -> narrative_dungeon_rooms (nullable)
|-- created_at          timestamptz
```

Same pattern for `narrative_plotline_locations` and `narrative_plot_locations`.

**Granularity rules:**
- `floor_id = NULL, room_id = NULL` → linked to entire location
- `floor_id = set, room_id = NULL` → linked to specific floor
- `floor_id = set, room_id = set` → linked to specific room
- `floor_id = NULL, room_id = set` → **invalid** (enforced by CHECK constraint)

---

## Navigation Model (Mandatory UX Principle)

Primary event-scoped navigation:
- `/{locale}/narrative/{eventId}` → Narrative hub, new **Locations** tab alongside Quests, Plotlines, Plots, Factions, Items
- `/{locale}/narrative/{eventId}/locations/{locationId}` → Location detail page

Within location detail:
- **Basic type**: Overview tab, Links tab, Documents tab
- **Dungeon type**: Overview tab, Floors & Rooms tab, Links tab, Documents tab

Minimum quick navigation actions on location detail:
- Back to Narrative hub (Locations tab)
- Open linked quests (click navigates to quest detail)
- Open linked plotlines
- Open linked plots

Cross-entity integration:
- Quest/Plotline/Plot detail pages show linked locations in their Links panel
- Location links display granularity labels (e.g., "Floor 2, Room 3" vs "Entire Location")

---

## Use Cases

### UC-NR-LOC-01 — Create Location
Actor: user with `narrative:write`

Flow:
1. User clicks "New Location" in Locations tab of Narrative hub.
2. Dialog opens with fields: name (required), location type (Basic / Dungeon), description (optional).
3. System creates location in `Draft` status.
4. System navigates to location detail page (especially important for dungeon type so user can immediately manage floors).

Validation:
- Name required and unique per event (among non-deleted locations).

### UC-NR-LOC-02 — Edit Location Details
Actor: `narrative:write`

Flow:
1. User opens location detail page.
2. Edits name (via edit dialog), description (rich text inline), internal notes (amber section inline).
3. Changes saved via PATCH on blur/save.

Rule:
- Cannot edit when status is `Locked` (except status changes and internal notes).

### UC-NR-LOC-03 — Change Location Status
Actor: `narrative:write`

Flow:
1. User changes status via status dialog: Draft ↔ Ready ↔ Locked.
2. Locked → Ready requires explicit `confirmUnlock` flag (same as quests).
3. Locked locations block all edits except status changes.
4. Locked status also blocks floor/room creation, editing, deletion, and reordering.

### UC-NR-LOC-04 — Soft-Delete / Restore Location
Actor: `narrative:write`

Flow:
1. User soft-deletes location with optional reason.
2. System sets `deleted_at`, `deleted_by`, `deletion_reason`.
3. Location disappears from default lists but remains in "show deleted" view.
4. Restore clears deletion fields.

Cascade behavior:
- Soft-deleting a location does NOT physically delete floors/rooms. They become invisible because the parent location is filtered out.
- Existing quest/plotline/plot links remain in the database but are hidden from UI since the location is soft-deleted.

### UC-NR-LOC-05 — Manage Dungeon Floors
Actor: `narrative:write`

Flow:
1. User opens dungeon location detail, "Floors & Rooms" tab.
2. Adds floors with name, description, internal notes.
3. Floors display as an accordion/collapsible list ordered by `sort_order`.
4. User can reorder floors (up/down or drag).
5. User can edit floor name, description, notes inline.
6. User can delete a floor (hard-delete, cascades rooms on that floor).

Validation:
- Floor name required.
- Floors can only be added to dungeon-type locations (400 error if attempted on basic).
- Floor operations blocked when parent location status is Locked.

### UC-NR-LOC-06 — Manage Dungeon Rooms
Actor: `narrative:write`

Flow:
1. User expands a floor in the "Floors & Rooms" tab.
2. Adds rooms with name, description, internal notes.
3. Rooms display as an ordered list within the expanded floor.
4. User can reorder rooms within their floor.
5. User can edit room details inline.
6. User can delete a room (hard-delete).

Validation:
- Room name required.
- Rooms can only be added to existing floors.
- Room operations blocked when parent location status is Locked.

### UC-NR-LOC-07 — Link Quest to Location (Any Granularity)
Actor: `narrative:write`

Flow:
1. User opens location detail "Links" tab.
2. Clicks "Add Quest Link".
3. Selects quest via searchable picker (Popover + Command).
4. If location is dungeon type: granularity picker appears — "Entire Location", specific floor, or specific room.
5. System creates link with appropriate `floor_id`/`room_id` values.
6. Multiple links from same quest are allowed at different granularity levels.

Alternative flow (from quest side):
1. User opens quest detail "Links" panel.
2. Adds location link with same granularity picker.

### UC-NR-LOC-08 — Link Plotline to Location (Any Granularity)
Actor: `narrative:write`

Flow: Same as UC-NR-LOC-07 but for plotlines. Uses `narrative_plotline_locations` link table.

### UC-NR-LOC-09 — Link Plot to Location (Any Granularity)
Actor: `narrative:write`

Flow: Same as UC-NR-LOC-07 but for plots. Uses `narrative_plot_locations` link table.

### UC-NR-LOC-10 — View Location Links from Quest/Plotline/Plot Detail
Actor: `narrative:read`

Flow:
1. User opens quest/plotline/plot detail page.
2. Links panel shows a "Locations" section listing linked locations.
3. Each link displays: location name + granularity label (e.g., "Dark Dungeon — Floor 2, Room 3").
4. Click navigates to location detail page.

### UC-NR-LOC-11 — Attach Google Drive Links (Any Level)
Actor: `narrative:write`

Flow:
1. **Location-level documents**: User opens location detail "Documents" tab. Adds Google Drive URL via shared document component. Uses `entity_type = 'location'`.
2. **Floor-level documents**: Within floor accordion expansion, user adds Google Drive URL. Uses `entity_type = 'dungeon_floor'`.
3. **Room-level documents**: Within room expansion, user adds Google Drive URL. Uses `entity_type = 'dungeon_room'`.

Constraint:
- Reuses existing `narrative_document_links` table and shared document-link validation.
- Same URL validation rules as other narrative entities.

### UC-NR-LOC-12 — View Locations in Narrative Hub
Actor: `narrative:read`

Flow:
1. User opens Narrative hub for event.
2. Selects "Locations" tab.
3. System shows location list with: name, type badge (Basic / Dungeon), status badge, created date.
4. User can filter by status and by type.
5. User can search by name.
6. "Show deleted" toggle for admins/managers.
7. Click on location navigates to detail page.

---

## Authorization and Scope Rules

- All records are scoped by `event_id`.
- RLS must enforce event membership and `event_member_permissions.module = 'narrative'`.
- `narrative:read` can view locations, floors, rooms, links, and documents.
- `narrative:write` can create/update/soft-delete locations, manage floors/rooms, manage links, manage documents.
- EventManager has write capability in Narrative context (never read-only).
- Role overrides (SystemAdmin/OrgOwner/EventManager) follow existing global policy model.
- Floors and rooms inherit authorization from the parent location's `event_id` (denormalized for RLS performance).

---

## Design Decisions (Answered)

1. **Location types**: `basic` and `dungeon`, stored as `location_type` column with CHECK constraint. Immutable after creation.
2. **Floor/room soft-delete**: No independent soft-delete. Floors and rooms are hard-deleted. Parent location's soft-delete effectively hides them.
3. **Floor/room status**: No independent status. Floors and rooms inherit the parent location's status. Locked location = locked floors/rooms.
4. **Link granularity**: Single link table per entity type (quest/plotline/plot) with nullable `floor_id`/`room_id`. Not separate tables per level.
5. **Character links**: Not in v1. Characters connect to locations indirectly through quests.
6. **Map/image field**: Not in v1. Users attach map images via Google Drive document links.
7. **Documents at all levels**: Location, floor, AND room entities can each have Google Drive document links.
8. **Document entity_type values**: `'location'`, `'dungeon_floor'`, `'dungeon_room'` added to existing check constraint.
9. **Locking behavior**: Locked location blocks all edits including floor/room modifications.
10. **Internal notes**: `narrative:write` and EventManager both write-capable (consistent with other entities).

---

## Suggested v1 Delivery Slice

1. Locations (basic + dungeon) CRUD + status workflow + soft-delete/restore + Google Drive documents.
2. Dungeon floors + rooms CRUD + reorder + floor/room-level documents.
3. Quest/Plotline/Plot link management with granularity picker (both directions).
4. Narrative hub integration (Locations tab) + quest/plotline/plot detail "Locations" section.
