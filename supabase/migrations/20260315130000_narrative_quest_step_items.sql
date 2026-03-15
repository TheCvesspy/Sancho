-- ============================================================
-- Migration: Quest Step Items
-- Adds per-step item links (required / loot) many-to-many table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_quest_step_items (
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  step_id    UUID NOT NULL REFERENCES public.narrative_quest_steps(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES public.narrative_items(id) ON DELETE CASCADE,
  link_type  TEXT NOT NULL DEFAULT 'required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (step_id, item_id, link_type)
);

-- Index for reverse lookups (item → steps) and RLS filtering
CREATE INDEX IF NOT EXISTS idx_nqsi_event_item
  ON public.narrative_quest_step_items (event_id, item_id, step_id);

-- RLS
ALTER TABLE public.narrative_quest_step_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY nqsi_read ON public.narrative_quest_step_items
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));

CREATE POLICY nqsi_write ON public.narrative_quest_step_items
  FOR ALL
  USING      (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
