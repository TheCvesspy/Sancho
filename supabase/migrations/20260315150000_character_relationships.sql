-- ============================================================
-- Migration: Move character relationships from Narrative to Characters context
-- Renames narrative_character_relationships -> character_relationships
-- Adds auto-mirroring support columns
-- Updates RLS to use characters module permissions
-- ============================================================

-- 1. Rename the table
ALTER TABLE public.narrative_character_relationships RENAME TO character_relationships;

-- 2. Rename 'type' to 'relation_type' for consistency with faction relationships
ALTER TABLE public.character_relationships RENAME COLUMN type TO relation_type;

-- 3. Add new columns for auto-mirroring support
ALTER TABLE public.character_relationships
  ADD COLUMN IF NOT EXISTS relation_mode TEXT NOT NULL DEFAULT 'directional',
  ADD COLUMN IF NOT EXISTS mirror_group_id UUID,
  ADD COLUMN IF NOT EXISTS is_auto_mirror BOOLEAN NOT NULL DEFAULT false;

-- 4. Add constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_relationships_relation_type_len' AND conrelid = 'public.character_relationships'::regclass) THEN
    ALTER TABLE public.character_relationships ADD CONSTRAINT character_relationships_relation_type_len CHECK (char_length(relation_type) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_relationships_relation_mode_check' AND conrelid = 'public.character_relationships'::regclass) THEN
    ALTER TABLE public.character_relationships ADD CONSTRAINT character_relationships_relation_mode_check CHECK (relation_mode IN ('directional', 'auto_mirrored'));
  END IF;
END $$;

-- 5. Drop old narrative-prefixed indexes
DROP INDEX IF EXISTS idx_narrative_character_relationships_source;
DROP INDEX IF EXISTS idx_narrative_character_relationships_target;

-- 6. Create new indexes
CREATE INDEX IF NOT EXISTS idx_character_relationships_event_source
  ON public.character_relationships (event_id, source_character_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_event_target
  ON public.character_relationships (event_id, target_character_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_mirror_group
  ON public.character_relationships (mirror_group_id) WHERE mirror_group_id IS NOT NULL;

-- 7. Drop old trigger and create new one
DROP TRIGGER IF EXISTS trg_narrative_character_relationships_touch_updated_at ON public.character_relationships;

CREATE OR REPLACE FUNCTION public.touch_character_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_character_relationships_touch_updated_at
  BEFORE UPDATE ON public.character_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_character_updated_at();

-- 8. Update RLS - drop old narrative policies, create character-module policies
DROP POLICY IF EXISTS narrative_character_relationships_read ON public.character_relationships;
DROP POLICY IF EXISTS narrative_character_relationships_write ON public.character_relationships;

CREATE POLICY "Users can view character relationships" ON public.character_relationships
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.character_relationships.event_id
        AND em.role = 'EventManager'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.character_relationships.event_id
        AND p.module = 'characters'
        AND p.permission IN ('read', 'write')
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can manage character relationships" ON public.character_relationships
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.character_relationships.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.character_relationships.event_id
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
        AND em.event_id = public.character_relationships.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_member_permissions p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = auth.uid()
        AND p.event_id = public.character_relationships.event_id
        AND p.module = 'characters'
        AND p.permission = 'write'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );
