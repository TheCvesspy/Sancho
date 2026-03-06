-- ============================================================
-- Migration: Narrative Context v1 (initial slice)
-- Core narrative tables + links + RLS + indexes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  has_fixed_players BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_quest_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.narrative_plotlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sigil_url TEXT,
  description TEXT,
  goals TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  is_multi_copy BOOLEAN NOT NULL DEFAULT false,
  max_copies INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  source_character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  target_character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.narrative_faction_members (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES public.narrative_factions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (faction_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_quest_characters (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quest_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.narrative_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  url TEXT NOT NULL,
  document_status TEXT NOT NULL DEFAULT 'Draft',
  source_type TEXT NOT NULL DEFAULT 'GoogleDrive',
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_quests_status_check' AND conrelid = 'public.narrative_quests'::regclass) THEN
    ALTER TABLE public.narrative_quests ADD CONSTRAINT narrative_quests_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_plotlines_status_check' AND conrelid = 'public.narrative_plotlines'::regclass) THEN
    ALTER TABLE public.narrative_plotlines ADD CONSTRAINT narrative_plotlines_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_plots_status_check' AND conrelid = 'public.narrative_plots'::regclass) THEN
    ALTER TABLE public.narrative_plots ADD CONSTRAINT narrative_plots_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_factions_status_check' AND conrelid = 'public.narrative_factions'::regclass) THEN
    ALTER TABLE public.narrative_factions ADD CONSTRAINT narrative_factions_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_items_status_check' AND conrelid = 'public.narrative_items'::regclass) THEN
    ALTER TABLE public.narrative_items ADD CONSTRAINT narrative_items_status_check CHECK (status IN ('Draft', 'Ready to Review', 'Final'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_items_copy_constraints' AND conrelid = 'public.narrative_items'::regclass) THEN
    ALTER TABLE public.narrative_items ADD CONSTRAINT narrative_items_copy_constraints CHECK (
      (is_multi_copy = false AND (max_copies IS NULL OR max_copies = 1))
      OR (is_multi_copy = true AND (max_copies IS NULL OR max_copies >= 1))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_character_relationships_no_self' AND conrelid = 'public.narrative_character_relationships'::regclass) THEN
    ALTER TABLE public.narrative_character_relationships ADD CONSTRAINT narrative_character_relationships_no_self CHECK (source_character_id <> target_character_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_document_links_entity_type_check' AND conrelid = 'public.narrative_document_links'::regclass) THEN
    ALTER TABLE public.narrative_document_links ADD CONSTRAINT narrative_document_links_entity_type_check CHECK (entity_type IN ('quest', 'plotline', 'plot', 'faction', 'item'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_document_links_status_check' AND conrelid = 'public.narrative_document_links'::regclass) THEN
    ALTER TABLE public.narrative_document_links ADD CONSTRAINT narrative_document_links_status_check CHECK (document_status IN ('Draft', 'Ready to Review', 'Final'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_document_links_source_check' AND conrelid = 'public.narrative_document_links'::regclass) THEN
    ALTER TABLE public.narrative_document_links ADD CONSTRAINT narrative_document_links_source_check CHECK (source_type = 'GoogleDrive');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_quests_event_title_active
  ON public.narrative_quests (event_id, lower(title)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_plotlines_event_title_active
  ON public.narrative_plotlines (event_id, lower(title)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_plots_event_title_active
  ON public.narrative_plots (event_id, lower(title)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_factions_event_name_active
  ON public.narrative_factions (event_id, lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_items_event_name_active
  ON public.narrative_items (event_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_narrative_quests_event_created
  ON public.narrative_quests (event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_plotlines_event_created
  ON public.narrative_plotlines (event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_plots_event_created
  ON public.narrative_plots (event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_factions_event_created
  ON public.narrative_factions (event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_items_event_created
  ON public.narrative_items (event_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_narrative_quest_steps_quest ON public.narrative_quest_steps (quest_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_narrative_faction_members_event_character ON public.narrative_faction_members (event_id, character_id, faction_id);
CREATE INDEX IF NOT EXISTS idx_narrative_quest_characters_event_character ON public.narrative_quest_characters (event_id, character_id, quest_id);
CREATE INDEX IF NOT EXISTS idx_narrative_character_relationships_source ON public.narrative_character_relationships (event_id, source_character_id, is_active);
CREATE INDEX IF NOT EXISTS idx_narrative_character_relationships_target ON public.narrative_character_relationships (event_id, target_character_id, is_active);
CREATE INDEX IF NOT EXISTS idx_narrative_document_links_entity ON public.narrative_document_links (event_id, entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_narrative_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_narrative_quests_touch_updated_at ON public.narrative_quests;
CREATE TRIGGER trg_narrative_quests_touch_updated_at BEFORE UPDATE ON public.narrative_quests FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_quest_steps_touch_updated_at ON public.narrative_quest_steps;
CREATE TRIGGER trg_narrative_quest_steps_touch_updated_at BEFORE UPDATE ON public.narrative_quest_steps FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_plotlines_touch_updated_at ON public.narrative_plotlines;
CREATE TRIGGER trg_narrative_plotlines_touch_updated_at BEFORE UPDATE ON public.narrative_plotlines FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_plots_touch_updated_at ON public.narrative_plots;
CREATE TRIGGER trg_narrative_plots_touch_updated_at BEFORE UPDATE ON public.narrative_plots FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_factions_touch_updated_at ON public.narrative_factions;
CREATE TRIGGER trg_narrative_factions_touch_updated_at BEFORE UPDATE ON public.narrative_factions FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_items_touch_updated_at ON public.narrative_items;
CREATE TRIGGER trg_narrative_items_touch_updated_at BEFORE UPDATE ON public.narrative_items FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_character_relationships_touch_updated_at ON public.narrative_character_relationships;
CREATE TRIGGER trg_narrative_character_relationships_touch_updated_at BEFORE UPDATE ON public.narrative_character_relationships FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();
DROP TRIGGER IF EXISTS trg_narrative_document_links_touch_updated_at ON public.narrative_document_links;
CREATE TRIGGER trg_narrative_document_links_touch_updated_at BEFORE UPDATE ON public.narrative_document_links FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();

CREATE OR REPLACE FUNCTION public.can_access_narrative_event(_event_id UUID, _require_write BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = _event_id
        AND em.role = 'EventManager'
        AND e.deleted_at IS NULL
        AND (_require_write = false OR e.status = 'active')
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = _event_id
        AND p.module = 'narrative'
        AND (
          (_require_write = false AND p.permission IN ('read', 'write'))
          OR (_require_write = true AND p.permission = 'write' AND e.status = 'active')
        )
        AND e.deleted_at IS NULL
    );
$$;

ALTER TABLE public.narrative_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_quest_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plotlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_faction_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_quest_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_document_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_quests_read ON public.narrative_quests;
DROP POLICY IF EXISTS narrative_quests_write ON public.narrative_quests;
CREATE POLICY narrative_quests_read ON public.narrative_quests FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quests_write ON public.narrative_quests FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_quest_steps_read ON public.narrative_quest_steps;
DROP POLICY IF EXISTS narrative_quest_steps_write ON public.narrative_quest_steps;
CREATE POLICY narrative_quest_steps_read ON public.narrative_quest_steps FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quest_steps_write ON public.narrative_quest_steps FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plotlines_read ON public.narrative_plotlines;
DROP POLICY IF EXISTS narrative_plotlines_write ON public.narrative_plotlines;
CREATE POLICY narrative_plotlines_read ON public.narrative_plotlines FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotlines_write ON public.narrative_plotlines FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plots_read ON public.narrative_plots;
DROP POLICY IF EXISTS narrative_plots_write ON public.narrative_plots;
CREATE POLICY narrative_plots_read ON public.narrative_plots FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plots_write ON public.narrative_plots FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_factions_read ON public.narrative_factions;
DROP POLICY IF EXISTS narrative_factions_write ON public.narrative_factions;
CREATE POLICY narrative_factions_read ON public.narrative_factions FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_factions_write ON public.narrative_factions FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_items_read ON public.narrative_items;
DROP POLICY IF EXISTS narrative_items_write ON public.narrative_items;
CREATE POLICY narrative_items_read ON public.narrative_items FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_items_write ON public.narrative_items FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_character_relationships_read ON public.narrative_character_relationships;
DROP POLICY IF EXISTS narrative_character_relationships_write ON public.narrative_character_relationships;
CREATE POLICY narrative_character_relationships_read ON public.narrative_character_relationships FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_character_relationships_write ON public.narrative_character_relationships FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_faction_members_read ON public.narrative_faction_members;
DROP POLICY IF EXISTS narrative_faction_members_write ON public.narrative_faction_members;
CREATE POLICY narrative_faction_members_read ON public.narrative_faction_members FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_faction_members_write ON public.narrative_faction_members FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_quest_characters_read ON public.narrative_quest_characters;
DROP POLICY IF EXISTS narrative_quest_characters_write ON public.narrative_quest_characters;
CREATE POLICY narrative_quest_characters_read ON public.narrative_quest_characters FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quest_characters_write ON public.narrative_quest_characters FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_document_links_read ON public.narrative_document_links;
DROP POLICY IF EXISTS narrative_document_links_write ON public.narrative_document_links;
CREATE POLICY narrative_document_links_read ON public.narrative_document_links FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_document_links_write ON public.narrative_document_links FOR ALL USING (public.can_access_narrative_event(event_id, true)) WITH CHECK (public.can_access_narrative_event(event_id, true));
