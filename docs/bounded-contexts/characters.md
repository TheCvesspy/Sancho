# Characters Bounded Context

The Characters context owns event-scoped character records and related write operations:

- Character profile
- Character abilities
- Character photo and attachments (Supabase Storage)
- Character lifecycle (`Draft`, `Ready`, `Locked`)
- Soft-delete + restore

## Data Owned

- `public.characters`
- `public.character_abilities`
- `public.character_attachments`

All records are linked to `public.events` via `event_id`.

## Consumed Data

Characters consumes Narrative read data (factions, relationships, quests) via:

- `ICharacterNarrativeService`

Current implementation is concrete (`NarrativeCharacterNarrativeService`) and resolves data from Narrative tables.

## Deletion Guard

Before soft-delete, Character invokes:

- `ICharacterNarrativeService.HasActiveRelationshipsAsync(eventId, characterId)`

Deletion guard is now active via Narrative provider and checks for active narrative relationships before soft-delete.

## Event-Specific Scope

All API routes are event scoped:

- `/api/events/{eventId}/characters/...`

This supports future "globally selected event" behavior in clients while keeping backend ownership explicit.
