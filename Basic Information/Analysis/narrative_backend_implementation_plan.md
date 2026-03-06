# Narrative Backend Implementation Plan (v1)

Date: 2026-03-06  
Scope: Backend + DB + API contracts + integration with existing Character seam.  
Out of scope here: frontend implementation details.

## 1. Goals and Constraints

### Goals
- Implement event-scoped Narrative backend for:
  - Quests (mandatory)
  - Plotlines (mandatory)
  - Plots/Arcs (optional layer, but supported in API/DB)
  - Factions
  - Narrative Items
- Replace Character module's stubbed narrative provider with real read-model implementation.
- Reuse Google Drive link behavior (same validation rules/pattern as Character documents).

### Hard constraints from current repo rules
- Keep module id as `narrative` (`lowercase_snake_case`).
- Event-scoped authorization and RLS isolation are mandatory.
- No `new HttpClient()`; use DI `HttpClient`.
- No `.Result` / `.Wait()`.
- Endpoint outbound call budget: max 3 Supabase HTTP calls.
- Parallelize independent reads with `Task.WhenAll(...)`.
- Soft-delete support in v1.
- Update OpenAPI and docs when endpoints are added.

---

## 2. Current Baseline (Already Implemented)

- Character module already has integration seam:
  - `ICharacterNarrativeService` + `StubCharacterNarrativeService`
  - `GET /api/events/{eventId}/characters/{characterId}/narrative-links`
  - Character delete guard uses `HasActiveRelationshipsAsync(...)`
- DI currently registers stub in API:
  - `builder.Services.AddScoped<ICharacterNarrativeService, StubCharacterNarrativeService>();`
- Docs explicitly state Narrative is pending/stubbed.

---

## 3. Delivery Strategy

Implement in 4 backend phases to keep changes reviewable and avoid cross-module regressions.

### Phase A: Database foundation (Narrative schema + RLS + indexes)

Create migration `supabase/migrations/2026030x000000_narrative_context_v1.sql` with:

1. Core tables
- `narrative_quests`
- `narrative_quest_steps`
- `narrative_plotlines`
- `narrative_plotline_phases`
- `narrative_plots`
- `narrative_factions`
- `narrative_items`

2. Link tables (event-scoped many-to-many)
- `narrative_quest_characters`
- `narrative_quest_factions`
- `narrative_quest_items`
- `narrative_quest_step_items` (`link_type`: `required` | `loot`)
- `narrative_plotline_quests` (with optional `phase_id`)
- `narrative_plotline_characters`
- `narrative_plotline_factions`
- `narrative_plotline_items`
- `narrative_plot_plotlines`
- `narrative_plot_characters`
- `narrative_plot_factions`
- `narrative_plot_items`
- `narrative_faction_members` (character membership)
- `narrative_faction_items`
- `narrative_item_character_assignments`

3. Relationship table
- `narrative_faction_relationships`
  - supports both modes:
    - directional
    - auto-mirrored (persist as explicit second row with `is_auto_mirror=true`)

4. Google Drive links (v1: links only, no file uploads)
- `narrative_document_links`
  - `entity_type` (`quest|plotline|plot|faction|item`)
  - `entity_id`
  - `url`
  - `display_name`
  - `document_status` (`Draft|Ready to Review|Final`)
  - `source_type='GoogleDrive'`

5. State/check constraints
- Quest/Plotline/Plot/Faction statuses: `Draft|Ready|Locked`
- Item statuses: `Draft|Ready to Review|Final`
- Copy-limit checks:
  - unlimited allowed (`is_multi_copy=true`, `max_copies IS NULL`)
  - reject invalid combos via check constraints

6. Soft-delete columns
- Add `deleted_at`, `deleted_by`, `deletion_reason` to all root entities:
  - quests, plotlines, plots, factions, items

7. RLS policies
- Reuse established `EXISTS` policy style from Characters/Event modules.
- Module permission check must use `event_member_permissions.module = 'narrative'`.

8. Mandatory indexes in same migration
- RLS columns: `event_id`, `user_id`, and relevant composites.
- Partial active-row indexes `WHERE deleted_at IS NULL` for list queries.
- Common read paths (examples):
  - `(event_id, created_at desc)` on root entities with partial active filter
  - link-table indexes on both FK directions
  - `(character_id, event_id)` access paths for character read models

Notes:
- Execute via Supabase MCP migration tooling if available (per AGENTS guidance).

### Phase B: Narrative module skeleton + Quest/Faction/Item APIs

Implement inside `backend/Sancho.Modules/Narrative`:

1. Files
- `NarrativeEndpoints.cs`
- `NarrativeModels.cs`
- `NarrativeAuthorizationService.cs`
- `NarrativeGoogleDriveLinkService.cs` (shared validation pattern; same host allowlist as Character)
- Optional `NarrativeLifecycleService.cs` for status transitions

2. Endpoint base path
- `"/api/events/{eventId:guid}/narrative"`

3. First endpoint slice (MVP)
- Quests:
  - `GET /quests`
  - `POST /quests`
  - `GET /quests/{questId}`
  - `PATCH /quests/{questId}`
  - `POST /quests/{questId}/status`
  - `DELETE /quests/{questId}` (soft-delete)
  - `POST /quests/{questId}/undelete`
  - `GET/POST/PATCH/DELETE /quests/{questId}/steps...`
  - `PUT/DELETE /quests/{questId}/links/characters/{characterId}`
  - `PUT/DELETE /quests/{questId}/links/factions/{factionId}`
  - `PUT/DELETE /quests/{questId}/links/items/{itemId}`
  - `GET/POST/PATCH/DELETE /quests/{questId}/documents...` (Google Drive only)
- Factions:
  - CRUD + status + soft-delete/restore
  - membership links to characters
  - relationship endpoints (directional or auto-mirrored create mode)
- Items:
  - CRUD + state transitions (`Draft <-> Ready to Review <-> Final`)
  - soft-delete/restore
  - assignment endpoints with hard-fail on copy limit exceed
  - link endpoints to factions/quests
  - documents endpoints (Google Drive only)

4. Authorization approach
- Use claims-first authorization (from `SanchoClaimsTransformation`):
  - `sancho:system_admin`, `sancho:org_role`, `sancho:event_role`, `sancho:permission:{module}` + event-specific claims.
- Avoid extra per-request permission lookups where claims already provide data.
- Keep archived-event write lock behavior consistent with existing modules.

### Phase C: Plotline + Plot/Arc APIs and inherited read models

1. Plotline endpoints
- CRUD + status + soft-delete/restore
- phase CRUD
- quest assignment to phases
- direct links to characters/factions/items
- inherited read endpoints (read-only inherited links from quests)

2. Plot/Arc endpoints
- CRUD + status + soft-delete/restore
- link plotlines
- optional direct links
- inherited read endpoints aggregating plotline + quest links

3. Navigation read models (backend support)
- lightweight endpoints returning parent/child/related IDs and labels for list-first UI.

### Phase D: Character seam cutover (remove stub behavior)

1. Implement concrete provider in Narrative module:
- `CharacterNarrativeService : ICharacterNarrativeService`
  - `GetFactionsAsync(eventId, characterId)`
  - `GetRelationshipsAsync(eventId, characterId)`
  - `GetQuestsAsync(eventId, characterId)`
  - `HasActiveRelationshipsAsync(eventId, characterId)`

2. DI update in API
- replace:
  - `StubCharacterNarrativeService`
- with:
  - new Narrative-backed implementation.

3. Character compatibility contract
- Keep Character endpoint contract unchanged:
  - `GET /api/events/{eventId}/characters/{characterId}/narrative-links`
- Ensure return DTOs map cleanly from new tables.

---

## 4. Backend Structure Changes

### API wiring
- Add `app.MapNarrativeEndpoints();` in `backend/Sancho.API/Program.cs`.
- Register Narrative services in DI.

### Shared code reuse
- Extract Google Drive URL validation into shared service (or shared static helper) used by:
  - Character attachments
  - Narrative document links
- Do not duplicate allowlist logic.

### OpenAPI + docs updates
- Regenerate OpenAPI JSON after endpoint additions.
- Add:
  - `docs/api/narrative.md`
  - `docs/bounded-contexts/narrative.md`
- Update stubs/pending notes in:
  - `Basic Information/ARCHITECTURE.md`
  - `docs/bounded-contexts/characters.md`
  - `docs/architecture/decision-log.md`

---

## 5. Validation and Domain Rules (Must Implement)

1. Event-scoped uniqueness
- Unique codes/titles where required per `event_id` and non-deleted rows.

2. State transitions
- Quest/Plotline/Plot/Faction: `Draft <-> Ready <-> Locked` (confirm exact lock rules).
- Item: `Draft <-> Ready to Review <-> Final`.
- In `Final` item state: only status changes allowed.

3. Copy-limit behavior (items)
- If `max_copies` is set and exhausted, assignment fails with explicit error.
- Unlimited mode supported (no hard cap).

4. Faction relationship mode
- Endpoint accepts mode:
  - `directional`
  - `auto_mirrored`
- Auto-mirrored mode writes reciprocal relation row in same request.

5. Soft-delete behavior
- Default lists exclude deleted rows.
- Restore endpoint clears deletion fields.

---

## 6. Performance Plan (Non-negotiable)

1. HTTP call budget
- Keep each write/read handler at <=3 outbound Supabase calls.
- Prefer batch insert/update payloads for bulk link operations.

2. Parallel reads
- Use `Task.WhenAll` for independent table reads (especially inherited-link aggregations).

3. Query shape
- Use narrow `select=` projections.
- Avoid sequential N+1 link lookups; fetch sets then map in memory.

4. Index coverage checklist (before migration merge)
- Every RLS predicate column indexed.
- Soft-delete partial indexes present.
- Composite index order user-first for permission checks.

---

## 7. Testing Plan

1. Unit tests (Narrative module)
- lifecycle transition validators
- copy-limit validators
- relationship mirror behavior
- document link URL validation

2. Integration tests
- auth matrix (`SystemAdmin`, `OrgOwner`, `EventManager`, `narrative:read`, `narrative:write`)
- archived event write denial for non-admins
- soft-delete/restore flow for each root entity
- Character deletion blocked when active narrative relationships exist
- inherited links are read-only and correctly aggregated

3. Regression tests for Character integration
- `narrative-links` now returns non-empty when data exists
- existing Character endpoint shape remains unchanged

---

## 8. Suggested Implementation Order (Small PRs)

1. PR-1: migration + RLS + indexes only.
2. PR-2: Narrative module skeleton + auth service + Quest endpoints.
3. PR-3: Faction + Item endpoints + copy-limit + docs links.
4. PR-4: Plotline + Plot endpoints + inherited reads.
5. PR-5: Character seam cutover (real `ICharacterNarrativeService` impl) + integration tests.
6. PR-6: OpenAPI regeneration + docs + README status updates.

---

## 9. Definition of Done

- Narrative backend endpoints implemented and wired under `/api/events/{eventId}/narrative/...`.
- DB schema + RLS + indexes migrated successfully.
- Character stub replaced by real Narrative provider.
- Integration tests cover auth + lifecycle + deletion guard + copy limits.
- OpenAPI and docs updated.
- README updated with:
  - version bump
  - module status changes
  - endpoint list updates
  - schema table updates
  - version history row
