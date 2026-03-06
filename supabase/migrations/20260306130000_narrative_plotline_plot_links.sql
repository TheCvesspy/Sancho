-- ============================================================
-- Migration: Narrative plotline/plot links and inherited data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_plotline_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.narrative_plotline_quests (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.narrative_plotline_phases(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plotline_id, quest_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plot_plotlines (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plot_id UUID NOT NULL REFERENCES public.narrative_plots(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plot_id, plotline_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_quest_factions (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quest_id, faction_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_quest_items (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.narrative_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quest_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_narrative_plotline_phases_plotline
  ON public.narrative_plotline_phases (plotline_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_quests_event_plotline
  ON public.narrative_plotline_quests (event_id, plotline_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_plotlines_event_plot
  ON public.narrative_plot_plotlines (event_id, plot_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_narrative_quest_factions_event_quest
  ON public.narrative_quest_factions (event_id, quest_id, faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_quest_items_event_quest
  ON public.narrative_quest_items (event_id, quest_id, item_id);

DROP TRIGGER IF EXISTS trg_narrative_plotline_phases_touch_updated_at ON public.narrative_plotline_phases;
CREATE TRIGGER trg_narrative_plotline_phases_touch_updated_at
BEFORE UPDATE ON public.narrative_plotline_phases
FOR EACH ROW
EXECUTE FUNCTION public.touch_narrative_updated_at();

ALTER TABLE public.narrative_plotline_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plotline_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plot_plotlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_quest_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_quest_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_plotline_phases_read ON public.narrative_plotline_phases;
DROP POLICY IF EXISTS narrative_plotline_phases_write ON public.narrative_plotline_phases;
CREATE POLICY narrative_plotline_phases_read ON public.narrative_plotline_phases
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_phases_write ON public.narrative_plotline_phases
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plotline_quests_read ON public.narrative_plotline_quests;
DROP POLICY IF EXISTS narrative_plotline_quests_write ON public.narrative_plotline_quests;
CREATE POLICY narrative_plotline_quests_read ON public.narrative_plotline_quests
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_quests_write ON public.narrative_plotline_quests
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plot_plotlines_read ON public.narrative_plot_plotlines;
DROP POLICY IF EXISTS narrative_plot_plotlines_write ON public.narrative_plot_plotlines;
CREATE POLICY narrative_plot_plotlines_read ON public.narrative_plot_plotlines
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plot_plotlines_write ON public.narrative_plot_plotlines
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_quest_factions_read ON public.narrative_quest_factions;
DROP POLICY IF EXISTS narrative_quest_factions_write ON public.narrative_quest_factions;
CREATE POLICY narrative_quest_factions_read ON public.narrative_quest_factions
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quest_factions_write ON public.narrative_quest_factions
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_quest_items_read ON public.narrative_quest_items;
DROP POLICY IF EXISTS narrative_quest_items_write ON public.narrative_quest_items;
CREATE POLICY narrative_quest_items_read ON public.narrative_quest_items
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quest_items_write ON public.narrative_quest_items
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
