-- ============================================================
-- Migration: Narrative direct links for plotlines and plots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_plotline_characters (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plotline_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plotline_factions (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plotline_id, faction_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plotline_items (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.narrative_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plotline_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plot_characters (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plot_id UUID NOT NULL REFERENCES public.narrative_plots(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plot_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plot_factions (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plot_id UUID NOT NULL REFERENCES public.narrative_plots(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plot_id, faction_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_plot_items (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plot_id UUID NOT NULL REFERENCES public.narrative_plots(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.narrative_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plot_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_narrative_plotline_characters_event_plotline
  ON public.narrative_plotline_characters (event_id, plotline_id, character_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_factions_event_plotline
  ON public.narrative_plotline_factions (event_id, plotline_id, faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_items_event_plotline
  ON public.narrative_plotline_items (event_id, plotline_id, item_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_characters_event_plot
  ON public.narrative_plot_characters (event_id, plot_id, character_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_factions_event_plot
  ON public.narrative_plot_factions (event_id, plot_id, faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_items_event_plot
  ON public.narrative_plot_items (event_id, plot_id, item_id);

ALTER TABLE public.narrative_plotline_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plotline_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plotline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plot_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plot_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plot_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_plotline_characters_read ON public.narrative_plotline_characters;
DROP POLICY IF EXISTS narrative_plotline_characters_write ON public.narrative_plotline_characters;
CREATE POLICY narrative_plotline_characters_read ON public.narrative_plotline_characters
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_characters_write ON public.narrative_plotline_characters
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plotline_factions_read ON public.narrative_plotline_factions;
DROP POLICY IF EXISTS narrative_plotline_factions_write ON public.narrative_plotline_factions;
CREATE POLICY narrative_plotline_factions_read ON public.narrative_plotline_factions
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_factions_write ON public.narrative_plotline_factions
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plotline_items_read ON public.narrative_plotline_items;
DROP POLICY IF EXISTS narrative_plotline_items_write ON public.narrative_plotline_items;
CREATE POLICY narrative_plotline_items_read ON public.narrative_plotline_items
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_items_write ON public.narrative_plotline_items
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plot_characters_read ON public.narrative_plot_characters;
DROP POLICY IF EXISTS narrative_plot_characters_write ON public.narrative_plot_characters;
CREATE POLICY narrative_plot_characters_read ON public.narrative_plot_characters
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plot_characters_write ON public.narrative_plot_characters
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plot_factions_read ON public.narrative_plot_factions;
DROP POLICY IF EXISTS narrative_plot_factions_write ON public.narrative_plot_factions;
CREATE POLICY narrative_plot_factions_read ON public.narrative_plot_factions
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plot_factions_write ON public.narrative_plot_factions
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plot_items_read ON public.narrative_plot_items;
DROP POLICY IF EXISTS narrative_plot_items_write ON public.narrative_plot_items;
CREATE POLICY narrative_plot_items_read ON public.narrative_plot_items
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plot_items_write ON public.narrative_plot_items
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
