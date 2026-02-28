-- ============================================================
-- Migration: Event Module Lifecycle + Activity + RLS Hardening
-- Adds event lifecycle fields, lightweight activity log, and
-- aligns RLS rules with Event module backend design.
-- ============================================================

-- 1) Ensure events table exists (for safety on fresh environments)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Event lifecycle columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Valid lifecycle values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_status_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_status_check CHECK (status IN ('active', 'archived'));
  END IF;
END $$;

-- Guard date range (lenient for partially migrated rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_start_end_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_start_end_check
      CHECK (start_at IS NULL OR end_at IS NULL OR start_at <= end_at);
  END IF;
END $$;

-- Sync status for historical rows
UPDATE public.events
SET status = 'archived'
WHERE archived_at IS NOT NULL
  AND status <> 'archived';

UPDATE public.events
SET status = 'active'
WHERE archived_at IS NULL
  AND status <> 'active';

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_touch_updated_at ON public.events;
CREATE TRIGGER trg_events_touch_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.touch_events_updated_at();

-- 3) Lightweight event activity log
CREATE TABLE IF NOT EXISTS public.event_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_activity_log_event_created_at
  ON public.event_activity_log (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_deleted_at
  ON public.events (deleted_at);

CREATE INDEX IF NOT EXISTS idx_events_status
  ON public.events (status);

-- 4) Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_member_permissions ENABLE ROW LEVEL SECURITY;

-- 5) Events policies
DROP POLICY IF EXISTS "Users can view events in their tenants" ON public.events;
DROP POLICY IF EXISTS "Users can view accessible events" ON public.events;
DROP POLICY IF EXISTS "System admins and org owners can create events" ON public.events;
DROP POLICY IF EXISTS "Managers can update active events; owners/admins can update any" ON public.events;
DROP POLICY IF EXISTS "Only system admins and org owners can delete events" ON public.events;

CREATE POLICY "Users can view accessible events" ON public.events
  FOR SELECT
  USING (
    -- System admin sees all
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR
    -- Org owner sees all
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR
    -- Event managers see non-deleted events they manage
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.user_id = auth.uid()
          AND em.event_id = public.events.id
          AND em.role = 'EventManager'
      )
    )
  );

CREATE POLICY "System admins and org owners can create events" ON public.events
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  );

CREATE POLICY "Managers can update active events; owners/admins can update any" ON public.events
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR
    (
      status = 'active'
      AND deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.user_id = auth.uid()
          AND em.event_id = public.events.id
          AND em.role = 'EventManager'
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR
    (
      status = 'active'
      AND deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.event_members em
        WHERE em.user_id = auth.uid()
          AND em.event_id = public.events.id
          AND em.role = 'EventManager'
      )
    )
  );

CREATE POLICY "Only system admins and org owners can delete events" ON public.events
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  );

-- 6) Event managers policies
DROP POLICY IF EXISTS "Users can view their own event memberships" ON public.event_members;
DROP POLICY IF EXISTS "Users can view related event memberships" ON public.event_members;
DROP POLICY IF EXISTS "System admins and org owners can manage event managers" ON public.event_members;

CREATE POLICY "Users can view related event memberships" ON public.event_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_members.event_id
        AND em.role = 'EventManager'
    )
  );

CREATE POLICY "System admins and org owners can manage event managers" ON public.event_members
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  );

CREATE POLICY "System admins and org owners can update event managers" ON public.event_members
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  );

CREATE POLICY "System admins and org owners can delete event managers" ON public.event_members
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
  );

-- 7) Event permission policies
DROP POLICY IF EXISTS "Users can view their own event permissions" ON public.event_member_permissions;
DROP POLICY IF EXISTS "Org owners and Event managers can view all event permissions" ON public.event_member_permissions;
DROP POLICY IF EXISTS "Users can view related event permissions" ON public.event_member_permissions;
DROP POLICY IF EXISTS "Privileged users can manage event permissions" ON public.event_member_permissions;
DROP POLICY IF EXISTS "Privileged users can update event permissions" ON public.event_member_permissions;
DROP POLICY IF EXISTS "Privileged users can delete event permissions" ON public.event_member_permissions;

CREATE POLICY "Users can view related event permissions" ON public.event_member_permissions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_member_permissions.event_id
        AND em.role = 'EventManager'
    )
  );

CREATE POLICY "Privileged users can manage event permissions" ON public.event_member_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_member_permissions.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Privileged users can update event permissions" ON public.event_member_permissions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_member_permissions.event_id
        AND em.role = 'EventManager'
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
        AND em.event_id = public.event_member_permissions.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "Privileged users can delete event permissions" ON public.event_member_permissions
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_member_permissions.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );

-- 8) Event activity log policies
DROP POLICY IF EXISTS "Users can view recent activity for accessible events" ON public.event_activity_log;
DROP POLICY IF EXISTS "Privileged users can write event activity" ON public.event_activity_log;

CREATE POLICY "Users can view recent activity for accessible events" ON public.event_activity_log
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_activity_log.event_id
        AND em.role = 'EventManager'
    )
  );

CREATE POLICY "Privileged users can write event activity" ON public.event_activity_log
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'OrgOwner')
    OR EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.events e ON e.id = em.event_id
      WHERE em.user_id = auth.uid()
        AND em.event_id = public.event_activity_log.event_id
        AND em.role = 'EventManager'
        AND e.status = 'active'
        AND e.deleted_at IS NULL
    )
  );
