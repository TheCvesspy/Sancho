-- Quest Detail Enhancements
-- 1. Add metadata columns to narrative_quests
-- 2. Create narrative_quest_step_locations junction table

-- ═══════════════════════════════════════════════════════════════
-- Part A: New columns on narrative_quests
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.narrative_quests
  ADD COLUMN IF NOT EXISTS quest_type TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS function TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quest_assignment TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS player_goal TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS player_motivation TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_results TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS escalation TEXT DEFAULT NULL;

-- No new RLS policies needed — columns inherit existing narrative_quests policies.

-- ═══════════════════════════════════════════════════════════════
-- Part B: New junction table for quest step ↔ location links
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.narrative_quest_step_locations (
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  step_id     UUID NOT NULL REFERENCES public.narrative_quest_steps(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (step_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_nqsl_event_location
  ON public.narrative_quest_step_locations (event_id, location_id, step_id);

ALTER TABLE public.narrative_quest_step_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY nqsl_read ON public.narrative_quest_step_locations
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));

CREATE POLICY nqsl_write ON public.narrative_quest_step_locations
  FOR ALL
  USING      (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
