-- Migration: Add missing narrative item character assignments table

CREATE TABLE IF NOT EXISTS public.narrative_item_character_assignments (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.narrative_items(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  PRIMARY KEY (item_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_narrative_item_char_assignments_event_item 
  ON public.narrative_item_character_assignments(event_id, item_id);
  
CREATE INDEX IF NOT EXISTS idx_narrative_item_char_assignments_event_char 
  ON public.narrative_item_character_assignments(event_id, character_id);

ALTER TABLE public.narrative_item_character_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_item_character_assignments_read ON public.narrative_item_character_assignments;
DROP POLICY IF EXISTS narrative_item_character_assignments_write ON public.narrative_item_character_assignments;

CREATE POLICY narrative_item_character_assignments_read 
  ON public.narrative_item_character_assignments 
  FOR SELECT 
  USING (public.can_access_narrative_event(event_id, false));

CREATE POLICY narrative_item_character_assignments_write 
  ON public.narrative_item_character_assignments 
  FOR ALL 
  USING (public.can_access_narrative_event(event_id, true)) 
  WITH CHECK (public.can_access_narrative_event(event_id, true));
