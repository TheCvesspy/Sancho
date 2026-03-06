# Narrative Bounded Context

The Narrative context owns event-scoped storytelling structures and links across characters, factions, and items.

## Scope

- Quests (LARP quests)
- Quest steps (ordered summaries)
- Plotlines (optional layer above quests)
- Plotline phases
- Plots/arcs (optional layer above plotlines)
- Factions
- Items
- Cross-entity links and inherited link read models
- Google Drive document links for quests, factions, and items

## Data Owned

- `public.narrative_quests`
- `public.narrative_quest_steps`
- `public.narrative_quest_step_items`
- `public.narrative_quest_character_links`
- `public.narrative_quest_faction_links`
- `public.narrative_quest_item_links`
- `public.narrative_quest_documents`
- `public.narrative_factions`
- `public.narrative_faction_members`
- `public.narrative_faction_relationships`
- `public.narrative_faction_documents`
- `public.narrative_items`
- `public.narrative_item_character_assignments`
- `public.narrative_item_documents`
- `public.narrative_plotlines`
- `public.narrative_plotline_phases`
- `public.narrative_plotline_quest_links`
- `public.narrative_plotline_character_links`
- `public.narrative_plotline_faction_links`
- `public.narrative_plotline_item_links`
- `public.narrative_plots`
- `public.narrative_plot_plotline_links`
- `public.narrative_plot_character_links`
- `public.narrative_plot_faction_links`
- `public.narrative_plot_item_links`

## Status/Lifecycle Rules

- Generic narrative entities (quest, faction, plotline, plot): `Draft -> ReadyToReview -> Final`
- Item entities: same workflow with reverse transitions allowed.
- Reverse transitions are supported.
- `Final` items are read-only except status changes.
- Soft-delete is supported and records remain restorable.

## Authorization

- Event-scoped module permission: `narrative`.
- Read requires `read` or `write` (or admin/manager rights).
- Write requires `write` (or admin/manager rights).
- Event managers can always manage narrative for their event.
- Archived event behavior follows existing platform event lifecycle rules.

## Integrations

- Character module integration seam:
  - `ICharacterNarrativeService` is implemented by `NarrativeCharacterNarrativeService`.
  - Character narrative links endpoint uses Narrative data.
  - Character deletion guard uses Narrative relationship checks.
- Google Drive validation uses shared URL validation (`Sancho.Shared.GoogleDriveUrlValidator`).

## API Surface

Base route: `/api/events/{eventId}/narrative`

- Quests
  - CRUD, status, soft-delete/restore
  - steps CRUD
  - step items (`required`, `loot`)
  - links to characters, factions, items
  - Google Drive documents
- Factions
  - CRUD, status, soft-delete/restore
  - members
  - relationships (directional or auto-mirrored)
  - Google Drive documents
- Items
  - CRUD, status, soft-delete/restore
  - assignments to characters with copy-limit enforcement
  - Google Drive documents
- Plotlines
  - CRUD, status, soft-delete/restore
  - phases
  - quest links
  - direct links (character/faction/item)
  - inherited links read model
- Plots
  - CRUD, status, soft-delete/restore
  - plotline links
  - direct links (character/faction/item)
  - inherited links read model
