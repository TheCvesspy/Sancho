-- ============================================================
-- Migration: RBAC Redesign & Cleanup
-- Refactors the role model to a 3-tier hierarchy (Platform, Org, Event)
-- Removes obsolete team roles and introduces granular permissions
-- ============================================================

-- 1. DELETE stale records
-- Before altering the ENUM, we must drop rows that use the retired roles
DELETE FROM public.event_members
WHERE role IN ('NarrativeTeam', 'LogisticsTeam', 'FinanceTeam', 'NPCTeam', 'Player');

DELETE FROM public.org_members
WHERE role = 'OrgAdmin';

DELETE FROM public.role_module_permissions
WHERE role NOT IN ('SystemAdmin', 'OrgOwner', 'EventManager');

-- 2. DROP constraints and policies that depend on the ENUM
ALTER TABLE public.event_members
  DROP CONSTRAINT IF EXISTS valid_event_role;

ALTER TABLE public.org_members
  DROP CONSTRAINT IF EXISTS valid_org_role;

DROP POLICY IF EXISTS "Org owners can view all org members" ON public.org_members;

-- 3. ALTER app_role ENUM
-- Postgres cannot safely drop enum values if they are used, but we've deleted the rows.
-- The safest way is to rename the old type and create a new one.
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM (
  'SystemAdmin',
  'OrgOwner',
  'EventManager'
);

ALTER TABLE public.event_members
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

ALTER TABLE public.org_members
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

ALTER TABLE public.role_module_permissions
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

DROP TYPE public.app_role_old;

-- 4. ALTER module_permission ENUM
-- 'admin' is replaced by 'write' for EventManagers. Pure granular ones are none/read/write.
UPDATE public.role_module_permissions
SET permission = 'write'
WHERE permission = 'admin';

ALTER TYPE public.module_permission RENAME TO module_permission_old;

CREATE TYPE public.module_permission AS ENUM (
  'none', 'read', 'write'
);

ALTER TABLE public.role_module_permissions
  ALTER COLUMN permission DROP DEFAULT,
  ALTER COLUMN permission TYPE public.module_permission USING permission::text::public.module_permission,
  ALTER COLUMN permission SET DEFAULT 'none'::public.module_permission;

-- Drop 'admin' value
DROP TYPE public.module_permission_old;

-- 5. RECREATE Constraints and Policies
ALTER TABLE public.event_members
  ADD CONSTRAINT valid_event_role CHECK (role = 'EventManager');

ALTER TABLE public.org_members
  ADD CONSTRAINT valid_org_role CHECK (role = 'OrgOwner');

CREATE POLICY "Org owners can view all org members" ON public.org_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = auth.uid()
        AND om.role = 'OrgOwner'
    )
  );

-- 6. CREATE event_member_permissions Table
CREATE TABLE IF NOT EXISTS public.event_member_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,
  permission  public.module_permission NOT NULL DEFAULT 'none',
  granted_by  UUID REFERENCES public.user_profiles(id),
  granted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id, module)
);

ALTER TABLE public.event_member_permissions ENABLE ROW LEVEL SECURITY;

-- 7. RLS for event_member_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own event permissions'
      AND tablename = 'event_member_permissions'
  ) THEN
    CREATE POLICY "Users can view their own event permissions"
      ON public.event_member_permissions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Org owners and Event managers can view all event permissions'
      AND tablename = 'event_member_permissions'
  ) THEN
    CREATE POLICY "Org owners and Event managers can view all event permissions"
      ON public.event_member_permissions
      FOR SELECT USING (
        -- Is OrgOwner
        EXISTS (
          SELECT 1 FROM public.org_members
          WHERE user_id = auth.uid() AND role = 'OrgOwner'
        )
        OR
        -- Is EventManager for this specific event
        EXISTS (
          SELECT 1 FROM public.event_members
          WHERE user_id = auth.uid() AND event_id = event_member_permissions.event_id AND role = 'EventManager'
        )
      );
  END IF;
END $$;
