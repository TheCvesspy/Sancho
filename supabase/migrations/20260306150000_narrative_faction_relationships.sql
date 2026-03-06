-- ============================================================
-- Migration: Narrative faction relationships
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_faction_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  source_faction_id UUID NOT NULL REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  target_faction_id UUID REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  target_character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  relation_mode TEXT NOT NULL,
  mirror_group_id UUID,
  is_auto_mirror BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a relationship points either to a faction OR a character, but not both or neither
ALTER TABLE public.narrative_faction_relationships ADD CONSTRAINT narrative_faction_relationships_target_check 
  CHECK (
    (target_faction_id IS NOT NULL AND target_character_id IS NULL) OR
    (target_faction_id IS NULL AND target_character_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_narrative_faction_relationships_event_source
  ON public.narrative_faction_relationships (event_id, source_faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_faction_relationships_event_target_faction
  ON public.narrative_faction_relationships (event_id, target_faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_faction_relationships_event_target_character
  ON public.narrative_faction_relationships (event_id, target_character_id);

DROP TRIGGER IF EXISTS trg_narrative_faction_relationships_touch_updated_at ON public.narrative_faction_relationships;
CREATE TRIGGER trg_narrative_faction_relationships_touch_updated_at
BEFORE UPDATE ON public.narrative_faction_relationships
FOR EACH ROW
EXECUTE FUNCTION public.touch_narrative_updated_at();

ALTER TABLE public.narrative_faction_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_faction_relationships_read ON public.narrative_faction_relationships;
DROP POLICY IF EXISTS narrative_faction_relationships_write ON public.narrative_faction_relationships;

CREATE POLICY narrative_faction_relationships_read ON public.narrative_faction_relationships
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));

CREATE POLICY narrative_faction_relationships_write ON public.narrative_faction_relationships
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
