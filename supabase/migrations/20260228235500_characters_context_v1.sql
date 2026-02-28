-- ============================================================
-- Migration: Characters Context v1
-- Event-scoped characters, abilities, attachments + RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  biography TEXT,
  notes TEXT,
  player_user_id UUID REFERENCES public.user_profiles(id),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'characters_status_check'
      AND conrelid = 'public.characters'::regclass
  ) THEN
    ALTER TABLE public.characters
      ADD CONSTRAINT characters_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_characters_event_name_active
  ON public.characters (event_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_characters_event
  ON public.characters (event_id);

CREATE INDEX IF NOT EXISTS idx_characters_status
  ON public.characters (status);

CREATE INDEX IF NOT EXISTS idx_characters_deleted_at
  ON public.characters (deleted_at);

CREATE OR REPLACE FUNCTION public.touch_characters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_characters_touch_updated_at ON public.characters;
CREATE TRIGGER trg_characters_touch_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.touch_characters_updated_at();

CREATE TABLE IF NOT EXISTS public.character_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_abilities_character
  ON public.character_abilities (character_id, sort_order);

CREATE OR REPLACE FUNCTION public.touch_character_abilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_character_abilities_touch_updated_at ON public.character_abilities;
CREATE TRIGGER trg_character_abilities_touch_updated_at
BEFORE UPDATE ON public.character_abilities
FOR EACH ROW
EXECUTE FUNCTION public.touch_character_abilities_updated_at();

CREATE TABLE IF NOT EXISTS public.character_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'character_attachments_category_check'
      AND conrelid = 'public.character_attachments'::regclass
  ) THEN
    ALTER TABLE public.character_attachments
      ADD CONSTRAINT character_attachments_category_check CHECK (category IN ('Document', 'Image', 'Other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_character_attachments_character
  ON public.character_attachments (character_id, uploaded_at DESC);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related characters" ON public.characters;
DROP POLICY IF EXISTS "Users can manage writable characters" ON public.characters;
DROP POLICY IF EXISTS "Users can view related character abilities" ON public.character_abilities;
DROP POLICY IF EXISTS "Users can manage writable character abilities" ON public.character_abilities;
DROP POLICY IF EXISTS "Users can view related character attachments" ON public.character_attachments;
DROP POLICY IF EXISTS "Users can manage writable character attachments" ON public.character_attachments;

CREATE POLICY "Users can view related characters" ON public.characters
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.characters.event_id
        AND em.role = 'EventManager'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.characters.event_id
        AND p.module = 'characters'
        AND p.permission IN ('read', 'write')
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage writable characters" ON public.characters
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.characters.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.characters.event_id
        AND p.module = 'characters'
        AND p.permission = 'write'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.characters.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.characters.event_id
        AND p.module = 'characters'
        AND p.permission = 'write'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can view related character abilities" ON public.character_abilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.characters c
      WHERE c.id = public.character_abilities.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission IN ('read', 'write')
          )
        )
    )
  );

CREATE POLICY "Users can manage writable character abilities" ON public.character_abilities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.characters c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = public.character_abilities.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission = 'write'
          )
        )
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.characters c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = public.character_abilities.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission = 'write'
          )
        )
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can view related character attachments" ON public.character_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.characters c
      WHERE c.id = public.character_attachments.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission IN ('read', 'write')
          )
        )
    )
  );

CREATE POLICY "Users can manage writable character attachments" ON public.character_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.characters c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = public.character_attachments.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission = 'write'
          )
        )
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.characters c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = public.character_attachments.character_id
        AND (
          EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
          OR EXISTS (
            SELECT 1 FROM public.event_members em
            WHERE em.user_id = auth.uid()
              AND em.event_id = c.event_id
              AND em.role = 'EventManager'
          )
          OR EXISTS (
            SELECT 1 FROM public.event_member_permissions p
            WHERE p.user_id = auth.uid()
              AND p.event_id = c.event_id
              AND p.module = 'characters'
              AND p.permission = 'write'
          )
        )
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );
