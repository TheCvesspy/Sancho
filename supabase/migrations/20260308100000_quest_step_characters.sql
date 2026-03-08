-- ============================================================
-- Migration: Quest Step Characters
-- Adds per-step "involved characters/NPCs" many-to-many table.
-- Removes the quest-level has_fixed_players boolean (superseded).
-- ============================================================

-- 1. New junction table
CREATE TABLE IF NOT EXISTS public.narrative_quest_step_characters (
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  step_id      UUID NOT NULL REFERENCES public.narrative_quest_steps(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (step_id, character_id)
);

-- Index for reverse lookups (character → steps they are involved in)
CREATE INDEX IF NOT EXISTS idx_nqsc_event_character
  ON public.narrative_quest_step_characters (event_id, character_id, step_id);

-- RLS
ALTER TABLE public.narrative_quest_step_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nqsc_read  ON public.narrative_quest_step_characters;
DROP POLICY IF EXISTS nqsc_write ON public.narrative_quest_step_characters;

CREATE POLICY nqsc_read ON public.narrative_quest_step_characters
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));

CREATE POLICY nqsc_write ON public.narrative_quest_step_characters
  FOR ALL
  USING      (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

-- 2. Drop the superseded column from narrative_quests
ALTER TABLE public.narrative_quests DROP COLUMN IF EXISTS has_fixed_players;
