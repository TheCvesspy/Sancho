# Narrative Locations Frontend Implementation Plan

Date: 2026-03-14
Scope: Frontend components, routing, i18n, and API client for the Locations sub-entity within Narrative context.
Prerequisite: Backend + DB implementation (see `narrative_locations_backend_plan.md`).

## 1. Goals and Constraints

### Goals
- Add Locations as a new tab in the Narrative hub.
- Location detail page with type-specific UI (basic vs dungeon).
- Dungeon floor/room management with accordion-based CRUD and reorder.
- Flexible granularity picker for quest/plotline/plot linking.
- Google Drive documents at location, floor, and room levels.
- Reverse location links visible on quest/plotline/plot detail pages.

### Hard constraints from repo rules
- All strings in i18n files (`frontend/messages/{en,cs}/narrative.json`). No hardcoded user-facing text.
- Use `shadcn/ui` components from `frontend/components/ui/`.
- EditableRichText for description/notes fields.
- Popover + Command for searchable pickers (>50 candidate options).
- `useMemo` for filtered/sorted lists in client components.
- Parallel data fetching with `Promise.all([...])` on server-side pages.
- Event-scoped routing: `/{locale}/narrative/{eventId}/locations/{locationId}`.

---

## 2. Routing

### Existing routes (no changes)
```
/{locale}/narrative                          → Event picker landing
/{locale}/narrative/{eventId}                → Narrative hub (tabs)
```

### New routes
```
/{locale}/narrative/{eventId}/locations/{locationId}  → Location detail page
```

### New file
```
frontend/app/[locale]/(app)/narrative/[eventId]/locations/[locationId]/page.tsx
```

---

## 3. Component Structure

New components in `frontend/components/narrative/`:

| Component | Purpose | Pattern Source |
|---|---|---|
| `locations-list.tsx` | Location list in hub Locations tab | `factions-list.tsx` |
| `create-location-dialog.tsx` | Create dialog: name + type + description | `create-faction-dialog.tsx` |
| `location-detail.tsx` | Detail page with type-aware tabs | `faction-detail.tsx` |
| `edit-location-name-dialog.tsx` | Rename dialog | `edit-faction-name-dialog.tsx` |
| `change-location-status-dialog.tsx` | Status change dialog | `change-quest-status-dialog.tsx` |
| `location-documents-panel.tsx` | Documents tab (location level) | Reuse `DocumentLinkPanel` pattern |
| `location-links-panel.tsx` | Links tab: quests/plotlines/plots with granularity | `quest-links-panel.tsx` (extended) |
| `dungeon-floors-panel.tsx` | Floors & Rooms tab (dungeon only) | `quest-steps-panel.tsx` (ordered list) |
| `dungeon-floor-documents-panel.tsx` | Documents inline within floor expansion | `DocumentLinkPanel` pattern |
| `dungeon-room-documents-panel.tsx` | Documents inline within room expansion | `DocumentLinkPanel` pattern |

Components to **modify** (existing):

| Component | Change |
|---|---|
| `narrative-hub.tsx` | Add "Locations" tab trigger + content |
| `quest-links-panel.tsx` | Add "Locations" section with granularity display |
| `plotline-links-panel.tsx` (or equivalent) | Add "Locations" section |
| `plot-links-panel.tsx` (or equivalent) | Add "Locations" section |

---

## 4. Hub Integration (`narrative-hub.tsx`)

### Changes needed

1. Add `NarrativeLocationDto[]` to component props as `initialLocations`.
2. Add tab trigger:
   ```tsx
   <TabsTrigger value="locations">
     {t("hub.tabs.locations")} ({initialLocations.length})
   </TabsTrigger>
   ```
3. Add tab content:
   ```tsx
   <TabsContent value="locations">
     <LocationsList
       locations={initialLocations}
       eventId={eventId}
       canWrite={canWrite}
       token={token}
     />
   </TabsContent>
   ```

### Hub page (`[eventId]/page.tsx`) changes

Add `narrativeApi.listLocations(token, eventId)` to the `Promise.all` block alongside existing entity fetches. Pass result as `initialLocations` to `NarrativeHub`.

---

## 5. LocationsList Component

Following `factions-list.tsx` pattern.

### Features
- Table/card list of locations.
- Columns: Name, Type badge ("Basic" / "Dungeon"), Status badge, Created date.
- Filters: status dropdown, type dropdown.
- Search by name (client-side, debounced, `useMemo` filtered).
- "New Location" button → opens `CreateLocationDialog`.
- Row click → navigates to `/{locale}/narrative/{eventId}/locations/{locationId}`.
- "Show deleted" toggle for users with write access.
- Delete/restore actions per row.

### Props
```typescript
interface LocationsListProps {
  locations: NarrativeLocationDto[];
  eventId: string;
  canWrite: boolean;
  token: string;
}
```

---

## 6. CreateLocationDialog

Following `create-faction-dialog.tsx` pattern.

### Fields
- **Name** (required, text input)
- **Type** (required, select: Basic / Dungeon)
- **Description** (optional, textarea)

### Behavior
- Zod validation: name min 1 char, max 200 chars. Type must be `basic` or `dungeon`.
- On submit: `narrativeApi.createLocation(token, eventId, body)`.
- On success: toast notification + `router.push` to location detail page.
- Navigate is especially important for dungeon type so user can immediately manage floors.

---

## 7. Location Detail Page

### Server component (`locations/[locationId]/page.tsx`)

Parallel data fetch:
```typescript
const [event, location, floors, rooms, questLinks, plotlineLinks, plotLinks, documents] =
  await Promise.all([
    fetchEvent(eventId),
    narrativeApi.getLocation(token, eventId, locationId),
    narrativeApi.listFloors(token, eventId, locationId),
    narrativeApi.listAllRooms(token, eventId, locationId),  // all rooms for this location
    narrativeApi.listLocationQuests(token, eventId, locationId),
    narrativeApi.listLocationPlotlines(token, eventId, locationId),
    narrativeApi.listLocationPlots(token, eventId, locationId),
    narrativeApi.listLocationDocuments(token, eventId, locationId),
  ]);
```

Note: Floors and rooms for the location can be fetched as two flat lists and associated client-side. This keeps the server fetch efficient.

### Client component (`location-detail.tsx`)

**Header:**
- Back button (to hub Locations tab)
- Location name (editable via `EditLocationNameDialog`)
- Type badge (Basic / Dungeon) — non-editable
- Status badge + "Change Status" button → `ChangeLocationStatusDialog`
- Delete/Restore buttons

**Tabs (dynamic based on type):**

| Tab | Shown for | Content |
|---|---|---|
| Overview | All | Description (EditableRichText), Internal Notes (EditableRichText amber variant) |
| Floors & Rooms | Dungeon only | `DungeonFloorsPanel` |
| Links | All | `LocationLinksPanel` (quests, plotlines, plots with granularity) |
| Documents | All | `LocationDocumentsPanel` (location-level Google Drive links) |

---

## 8. DungeonFloorsPanel (New, Unique Component)

This is the most complex new UI piece. Follows the ordered-list pattern of `quest-steps-panel.tsx` but with nested accordion.

### Layout

```
[Add Floor] button

▼ Floor 1: "Main Hall" (3 rooms)        [Edit] [Delete] [↑] [↓]
  |  Description: "The grand entrance..."
  |  [Documents: 2]  [Add Document]
  |
  |  Room 1: "Entrance Foyer"           [Edit] [Delete] [↑] [↓]
  |  |  Description: "..."
  |  |  [Documents: 1]  [Add Document]
  |
  |  Room 2: "Guard Post"               [Edit] [Delete] [↑] [↓]
  |  |  Description: "..."
  |
  |  [Add Room]
  |
▶ Floor 2: "Basement" (5 rooms)         [Edit] [Delete] [↑] [↓]
▶ Floor 3: "Treasury" (2 rooms)         [Edit] [Delete] [↑] [↓]
```

### Accordion behavior
- Use shadcn `Accordion` component (single or multiple open).
- Floor header: name, room count badge, action buttons (edit, delete, reorder).
- Expanded floor: editable description/notes (collapsed subsections), room list, add room button.
- Floor-level documents shown inline within expansion.

### State management
- `floors` and `rooms` state managed at panel level via `useState`.
- Floor reorder: optimistic UI update, then API call `narrativeApi.reorderFloors(...)`.
- Room reorder: optimistic UI update within floor, then API call `narrativeApi.reorderRooms(...)`.
- Floor/room CRUD: API call → update local state → toast.

### Edit flow
- Floor/room edit: inline form (expand to show name + description + notes fields) or small dialog.
- Recommended: inline expansion with save/cancel buttons for simplicity.

### Validation
- All operations disabled when location is Locked (check `location.status`).
- Floor name required.
- Room name required.

### Documents within floors/rooms
- Each expanded floor shows a mini documents section (Google Drive links for `entity_type = 'dungeon_floor'`).
- Each expanded room shows a mini documents section (Google Drive links for `entity_type = 'dungeon_room'`).
- Reuse the same `DocumentLinkPanel` pattern but in a compact/inline layout.

---

## 9. LocationLinksPanel

Following `quest-links-panel.tsx` pattern but with a granularity picker for dungeon locations.

### Sections
1. **Linked Quests** — list of quest links with granularity labels
2. **Linked Plotlines** — list of plotline links with granularity labels
3. **Linked Plots** — list of plot links with granularity labels

### Link display
Each link shows:
- Entity name (e.g., "Rescue the Princess")
- Granularity label:
  - "Entire Location" — when `floorId = null, roomId = null`
  - "Floor 2: Main Hall" — when `floorId = set, roomId = null`
  - "Floor 2: Main Hall → Room 3: Guard Post" — when both set
- Click navigates to the linked entity detail page.
- Delete button removes the link.

### Add link flow
1. User clicks "Add Quest" / "Add Plotline" / "Add Plot".
2. Searchable picker (Popover + Command) to select entity.
3. **If location is dungeon type**: granularity picker appears after entity selection:
   - Radio/Select: "Entire Location" / "Specific Floor" / "Specific Room"
   - If "Specific Floor": floor dropdown appears
   - If "Specific Room": floor dropdown + room dropdown appear (room options filtered by selected floor)
4. Submit creates link via `narrativeApi.upsertLocationQuestLink(...)`.
5. Picker stays open for rapid multi-add (consistent with existing patterns).

### For basic locations
- Skip granularity picker entirely. Links are always to the entire location.

---

## 10. Reverse Links on Quest/Plotline/Plot Detail Pages

### Quest detail (`quest-links-panel.tsx` or `quest-detail.tsx`)

Add a "Locations" section to the existing Links tab:
- List linked locations with granularity labels.
- "Add Location" button with searchable picker.
- Granularity picker after location selection (if selected location is dungeon type).
- Delete button per link.

### Plotline and Plot detail pages
Same pattern — add "Locations" section to their links panels.

---

## 11. i18n Keys

Add to `frontend/messages/en/narrative.json` under a new `locations` key:

```json
{
  "locations": {
    "title": "Locations",
    "create": "New Location",
    "fields": {
      "name": { "label": "Name", "placeholder": "Enter location name" },
      "description": { "label": "Description" },
      "internalNotes": { "label": "Internal Notes" },
      "locationType": {
        "label": "Type",
        "basic": "Basic Location",
        "dungeon": "Dungeon"
      }
    },
    "dialogs": {
      "create": {
        "title": "Create Location",
        "description": "Add a new location to this event."
      },
      "editName": {
        "title": "Rename Location"
      },
      "delete": {
        "title": "Delete Location",
        "description": "Are you sure you want to delete this location? This action can be undone."
      },
      "restore": {
        "title": "Restore Location"
      }
    },
    "notifications": {
      "created": "Location created",
      "updated": "Location updated",
      "deleted": "Location deleted",
      "restored": "Location restored"
    },
    "validation": {
      "nameRequired": "Location name is required",
      "nameMaxLength": "Location name must be 200 characters or less",
      "nameDuplicate": "A location with this name already exists in this event"
    },
    "list": {
      "empty": "No locations yet. Create your first location to get started.",
      "filterByType": "Filter by type",
      "allTypes": "All types",
      "showDeleted": "Show deleted"
    },
    "detail": {
      "tabs": {
        "overview": "Overview",
        "floorsAndRooms": "Floors & Rooms",
        "links": "Links",
        "documents": "Documents"
      },
      "typeBadge": {
        "basic": "Basic",
        "dungeon": "Dungeon"
      }
    },
    "floors": {
      "title": "Floors",
      "create": "Add Floor",
      "fields": {
        "name": { "label": "Floor Name", "placeholder": "Enter floor name" },
        "description": { "label": "Description" },
        "internalNotes": { "label": "Internal Notes" }
      },
      "notifications": {
        "created": "Floor created",
        "updated": "Floor updated",
        "deleted": "Floor deleted",
        "reordered": "Floors reordered"
      },
      "validation": {
        "nameRequired": "Floor name is required"
      },
      "empty": "No floors yet. Add floors to structure this dungeon.",
      "roomCount": "{count} rooms",
      "deleteConfirm": "Delete this floor? All rooms on this floor will also be deleted."
    },
    "rooms": {
      "title": "Rooms",
      "create": "Add Room",
      "fields": {
        "name": { "label": "Room Name", "placeholder": "Enter room name" },
        "description": { "label": "Description" },
        "internalNotes": { "label": "Internal Notes" }
      },
      "notifications": {
        "created": "Room created",
        "updated": "Room updated",
        "deleted": "Room deleted",
        "reordered": "Rooms reordered"
      },
      "validation": {
        "nameRequired": "Room name is required"
      },
      "empty": "No rooms on this floor yet."
    },
    "links": {
      "title": "Location Links",
      "quests": "Linked Quests",
      "plotlines": "Linked Plotlines",
      "plots": "Linked Plots",
      "addQuest": "Add Quest",
      "addPlotline": "Add Plotline",
      "addPlot": "Add Plot",
      "granularity": {
        "entireLocation": "Entire Location",
        "floor": "Floor: {name}",
        "room": "{floorName} → {roomName}",
        "selectLevel": "Link to...",
        "selectFloor": "Select floor",
        "selectRoom": "Select room"
      },
      "empty": {
        "quests": "No quests linked to this location.",
        "plotlines": "No plotlines linked to this location.",
        "plots": "No plots linked to this location."
      }
    }
  }
}
```

Add hub tab key:
```json
{
  "hub": {
    "tabs": {
      "locations": "Locations"
    }
  }
}
```

Czech translations (`cs/narrative.json`) must mirror the same structure with Czech text.

---

## 12. API Client (`frontend/utils/narrative-api.ts`)

### New DTOs

```typescript
// Location
export interface NarrativeLocationDto {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  internalNotes: string | null;
  locationType: "basic" | "dungeon";
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateLocationRequest {
  name: string;
  description?: string;
  internalNotes?: string;
  locationType: "basic" | "dungeon";
}

export interface UpdateLocationRequest {
  name?: string;
  description?: string;
  internalNotes?: string;
}

// Dungeon Floor
export interface NarrativeDungeonFloorDto {
  id: string;
  locationId: string;
  eventId: string;
  sortOrder: number;
  name: string;
  description: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFloorRequest {
  name: string;
  description?: string;
  internalNotes?: string;
  sortOrder?: number;
}

export interface UpdateFloorRequest {
  name?: string;
  description?: string;
  internalNotes?: string;
}

// Dungeon Room
export interface NarrativeDungeonRoomDto {
  id: string;
  floorId: string;
  locationId: string;
  eventId: string;
  sortOrder: number;
  name: string;
  description: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  internalNotes?: string;
  sortOrder?: number;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  internalNotes?: string;
}

// Reorder
export interface ReorderItem {
  id: string;
  sortOrder: number;
}

// Location Link (flexible granularity)
export interface NarrativeLocationLinkDto {
  eventId: string;
  questId?: string;
  plotlineId?: string;
  plotId?: string;
  locationId: string;
  floorId: string | null;
  roomId: string | null;
  locationName: string;
  floorName: string | null;
  roomName: string | null;
  createdAt: string;
}

export interface UpsertLocationLinkRequest {
  floorId?: string;
  roomId?: string;
}
```

### New API functions

```typescript
// Location CRUD
listLocations(token, eventId, includeDeleted?): Promise<NarrativeLocationDto[]>
createLocation(token, eventId, body: CreateLocationRequest): Promise<NarrativeLocationDto>
getLocation(token, eventId, locationId): Promise<NarrativeLocationDto>
updateLocation(token, eventId, locationId, body: UpdateLocationRequest): Promise<NarrativeLocationDto>
changeLocationStatus(token, eventId, locationId, body: { status, confirmUnlock? }): Promise<void>
deleteLocation(token, eventId, locationId, reason?): Promise<void>
undeleteLocation(token, eventId, locationId): Promise<void>

// Floor CRUD
listFloors(token, eventId, locationId): Promise<NarrativeDungeonFloorDto[]>
createFloor(token, eventId, locationId, body: CreateFloorRequest): Promise<NarrativeDungeonFloorDto>
updateFloor(token, eventId, locationId, floorId, body: UpdateFloorRequest): Promise<NarrativeDungeonFloorDto>
deleteFloor(token, eventId, locationId, floorId): Promise<void>
reorderFloors(token, eventId, locationId, body: ReorderItem[]): Promise<void>

// Floor Documents
listFloorDocuments(token, eventId, locationId, floorId): Promise<NarrativeDocumentLinkDto[]>
addFloorGoogleDriveDocument(token, eventId, locationId, floorId, body): Promise<NarrativeDocumentLinkDto>
deleteFloorDocument(token, eventId, locationId, floorId, documentId): Promise<void>

// Room CRUD
listRooms(token, eventId, locationId, floorId): Promise<NarrativeDungeonRoomDto[]>
listAllRooms(token, eventId, locationId): Promise<NarrativeDungeonRoomDto[]>  // all rooms for location
createRoom(token, eventId, locationId, floorId, body: CreateRoomRequest): Promise<NarrativeDungeonRoomDto>
updateRoom(token, eventId, locationId, floorId, roomId, body: UpdateRoomRequest): Promise<NarrativeDungeonRoomDto>
deleteRoom(token, eventId, locationId, floorId, roomId): Promise<void>
reorderRooms(token, eventId, locationId, floorId, body: ReorderItem[]): Promise<void>

// Room Documents
listRoomDocuments(token, eventId, locationId, floorId, roomId): Promise<NarrativeDocumentLinkDto[]>
addRoomGoogleDriveDocument(token, eventId, locationId, floorId, roomId, body): Promise<NarrativeDocumentLinkDto>
deleteRoomDocument(token, eventId, locationId, floorId, roomId, documentId): Promise<void>

// Location-side links
listLocationQuests(token, eventId, locationId): Promise<NarrativeLocationLinkDto[]>
upsertLocationQuestLink(token, eventId, locationId, questId, body?: UpsertLocationLinkRequest): Promise<void>
deleteLocationQuestLink(token, eventId, locationId, questId, floorId?, roomId?): Promise<void>

listLocationPlotlines(token, eventId, locationId): Promise<NarrativeLocationLinkDto[]>
upsertLocationPlotlineLink(token, eventId, locationId, plotlineId, body?): Promise<void>
deleteLocationPlotlineLink(token, eventId, locationId, plotlineId, floorId?, roomId?): Promise<void>

listLocationPlots(token, eventId, locationId): Promise<NarrativeLocationLinkDto[]>
upsertLocationPlotLink(token, eventId, locationId, plotId, body?): Promise<void>
deleteLocationPlotLink(token, eventId, locationId, plotId, floorId?, roomId?): Promise<void>

// Location Documents (location level)
listLocationDocuments(token, eventId, locationId): Promise<NarrativeDocumentLinkDto[]>
addLocationGoogleDriveDocument(token, eventId, locationId, body): Promise<NarrativeDocumentLinkDto>
deleteLocationDocument(token, eventId, locationId, documentId): Promise<void>
```

---

## 13. Implementation Phases

### Phase F1: API Client + i18n
- Add all DTOs and API functions to `narrative-api.ts`.
- Add all i18n keys to `en/narrative.json` and `cs/narrative.json`.
- No visual changes yet.

### Phase F2: Hub Integration + Location List
- Modify `narrative-hub.tsx` to add Locations tab.
- Modify hub page to fetch locations in `Promise.all`.
- Create `locations-list.tsx` with filtering, search, create button.
- Create `create-location-dialog.tsx`.
- Result: users can see and create locations from the hub.

### Phase F3: Location Detail Page (Overview + Documents)
- Create `[eventId]/locations/[locationId]/page.tsx` (server component).
- Create `location-detail.tsx` (client component) with Overview tab.
- Create `edit-location-name-dialog.tsx` and `change-location-status-dialog.tsx`.
- Create `location-documents-panel.tsx` (location-level documents).
- Result: basic locations are fully functional.

### Phase F4: Dungeon Floors & Rooms
- Create `dungeon-floors-panel.tsx` with accordion layout.
- Implement floor CRUD + reorder.
- Implement room CRUD + reorder within floors.
- Implement floor-level and room-level document panels (inline within accordion).
- Result: dungeon locations are fully functional.

### Phase F5: Links (Both Directions)
- Create `location-links-panel.tsx` with granularity picker.
- Modify `quest-links-panel.tsx` to add Locations section with reverse links.
- Modify plotline and plot link panels similarly.
- Result: full bidirectional linking with granularity support.

---

## 14. Key UI Patterns to Follow

| Pattern | Source Component | Usage in Locations |
|---|---|---|
| EditableRichText (default) | Used across all detail pages | Location/floor/room description |
| EditableRichText (amber) | Used across all detail pages | Location/floor/room internal notes |
| Popover + Command picker | `quest-links-panel.tsx` | Quest/plotline/plot selection in links panel |
| Status badge | `NarrativeStatusBadge` | Location status (Draft/Ready/Locked) |
| Soft-delete/restore | `factions-list.tsx`, `faction-detail.tsx` | Location list + detail delete/restore |
| Tab layout | `faction-detail.tsx` | Location detail tabs |
| Accordion | shadcn `Accordion` | Floor list with room nesting |
| Reorder buttons | `quest-steps-panel.tsx` | Floor and room ordering |
| Document link panel | `DocumentLinkPanel` pattern | All three levels |
| Toast notifications | All CRUD operations | Location/floor/room/link operations |

---

## 15. Definition of Done

- Locations tab visible in Narrative hub with list, filtering, search, create.
- Location detail page works for both basic and dungeon types.
- Dungeon floors and rooms fully manageable with accordion UI.
- Documents attachable at location, floor, and room levels.
- Quest/plotline/plot links with granularity picker (both directions).
- All strings in en + cs i18n files.
- Locked locations properly disable all editing UI.
- Soft-delete/restore works from list and detail views.
