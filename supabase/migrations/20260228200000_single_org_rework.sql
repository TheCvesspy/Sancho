-- ============================================================
-- Migration: Single-Organization Rework
-- Replace multi-tenant (tenants + tenant_members) with a single
-- implicit organization model using public.org_members.
-- ============================================================

-- 1. Create org_members table (replaces tenant_members)
CREATE TABLE IF NOT EXISTS public.org_members (
  user_id    UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_org_role CHECK (role IN ('OrgOwner', 'OrgAdmin'))
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing data from tenant_members
INSERT INTO public.org_members (user_id, role, created_at)
SELECT DISTINCT ON (user_id)
  user_id,
  role,
  created_at
FROM public.tenant_members
WHERE role IN ('OrgOwner', 'OrgAdmin')
ORDER BY user_id, CASE role WHEN 'OrgOwner' THEN 0 WHEN 'OrgAdmin' THEN 1 END
ON CONFLICT (user_id) DO NOTHING;

-- 3. Drop old tenant-based RLS policy on events (depends on tenant_id)
DROP POLICY IF EXISTS "Users can view events in their tenants" ON public.events;

-- 4. Remove tenant_id from events (events belong to the implicit org now)
ALTER TABLE public.events DROP COLUMN IF EXISTS tenant_id;


-- 4. Drop tenant_members (depends on tenants FK — must go first)
DROP TABLE IF EXISTS public.tenant_members CASCADE;

-- 5. Drop tenants table
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 6. Add RLS policies for org_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own org membership'
      AND tablename = 'org_members'
  ) THEN
    CREATE POLICY "Users can view their own org membership" ON public.org_members
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Org owners can view all org members'
      AND tablename = 'org_members'
  ) THEN
    CREATE POLICY "Org owners can view all org members" ON public.org_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.org_members om
          WHERE om.user_id = auth.uid()
            AND om.role IN ('OrgOwner', 'OrgAdmin')
        )
      );
  END IF;
END $$;

-- 7. Update handle_new_user() trigger to use org_members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile record
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- If this is the designated owner, grant SystemAdmin + OrgOwner
  IF new.email = 'cvesspy@gmail.com' THEN
    INSERT INTO public.system_admins (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.org_members (user_id, role)
    VALUES (new.id, 'OrgOwner')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
