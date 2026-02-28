-- 1. Create New ENUMs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
          'SystemAdmin', 'OrgOwner', 'OrgAdmin', 'EventManager', 'NarrativeTeam', 'LogisticsTeam', 'FinanceTeam', 'NPCTeam', 'Player'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'module_permission') THEN
        CREATE TYPE public.module_permission AS ENUM ('none', 'read', 'write', 'admin');
    END IF;
END $$;

-- 2. Create System Admins Table
CREATE TABLE IF NOT EXISTS public.system_admins (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES public.user_profiles(id)
);

-- 3. Create Role-Module Permission Matrix Table
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  permission public.module_permission NOT NULL DEFAULT 'none',
  PRIMARY KEY (role, module)
);

-- 4. Seed Permission Matrix
-- Modules: event_management, narrative, logistics, finance, npc_org, characters, communications

INSERT INTO public.role_module_permissions (role, module, permission) VALUES
-- SystemAdmin (Full Access)
('SystemAdmin', 'event_management', 'admin'),
('SystemAdmin', 'narrative', 'admin'),
('SystemAdmin', 'logistics', 'admin'),
('SystemAdmin', 'finance', 'admin'),
('SystemAdmin', 'npc_org', 'admin'),
('SystemAdmin', 'characters', 'admin'),
('SystemAdmin', 'communications', 'admin'),
-- OrgOwner (Full Access)
('OrgOwner', 'event_management', 'admin'),
('OrgOwner', 'narrative', 'admin'),
('OrgOwner', 'logistics', 'admin'),
('OrgOwner', 'finance', 'admin'),
('OrgOwner', 'npc_org', 'admin'),
('OrgOwner', 'characters', 'admin'),
('OrgOwner', 'communications', 'admin'),
-- OrgAdmin (Write Access)
('OrgAdmin', 'event_management', 'write'),
('OrgAdmin', 'narrative', 'write'),
('OrgAdmin', 'logistics', 'write'),
('OrgAdmin', 'finance', 'write'),
('OrgAdmin', 'npc_org', 'write'),
('OrgAdmin', 'characters', 'write'),
('OrgAdmin', 'communications', 'write'),
-- EventManager (Full Event Access)
('EventManager', 'event_management', 'admin'),
('EventManager', 'narrative', 'write'),
('EventManager', 'logistics', 'write'),
('EventManager', 'finance', 'write'),
('EventManager', 'npc_org', 'write'),
('EventManager', 'characters', 'write'),
('EventManager', 'communications', 'admin'),
-- NarrativeTeam
('NarrativeTeam', 'event_management', 'read'),
('NarrativeTeam', 'narrative', 'admin'),
('NarrativeTeam', 'logistics', 'none'),
('NarrativeTeam', 'finance', 'none'),
('NarrativeTeam', 'npc_org', 'read'),
('NarrativeTeam', 'characters', 'read'),
('NarrativeTeam', 'communications', 'read'),
-- LogisticsTeam
('LogisticsTeam', 'event_management', 'read'),
('LogisticsTeam', 'narrative', 'none'),
('LogisticsTeam', 'logistics', 'admin'),
('LogisticsTeam', 'finance', 'none'),
('LogisticsTeam', 'npc_org', 'read'),
('LogisticsTeam', 'characters', 'none'),
('LogisticsTeam', 'communications', 'read'),
-- FinanceTeam
('FinanceTeam', 'event_management', 'read'),
('FinanceTeam', 'narrative', 'none'),
('FinanceTeam', 'logistics', 'none'),
('FinanceTeam', 'finance', 'admin'),
('FinanceTeam', 'npc_org', 'read'),
('FinanceTeam', 'characters', 'none'),
('FinanceTeam', 'communications', 'read'),
-- NPCTeam
('NPCTeam', 'event_management', 'read'),
('NPCTeam', 'narrative', 'read'),
('NPCTeam', 'logistics', 'none'),
('NPCTeam', 'finance', 'none'),
('NPCTeam', 'npc_org', 'admin'),
('NPCTeam', 'characters', 'read'),
('NPCTeam', 'communications', 'read'),
-- Player
('Player', 'event_management', 'read'),
('Player', 'narrative', 'none'),
('Player', 'logistics', 'none'),
('Player', 'finance', 'none'),
('Player', 'npc_org', 'none'),
('Player', 'characters', 'write'),
('Player', 'communications', 'read')
ON CONFLICT (role, module) DO UPDATE SET permission = EXCLUDED.permission;

-- 5. Rework Tenant Members Table
-- Add new role column if doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_members' AND column_name='role') THEN
        ALTER TABLE public.tenant_members ADD COLUMN role public.app_role;
    END IF;
END $$;

-- Migrate existing data (Owner -> OrgOwner)
-- Check if roles column still exists before update
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_members' AND column_name='roles') THEN
        UPDATE public.tenant_members 
        SET role = 'OrgOwner' 
        WHERE 'owner' = ANY(roles);

        UPDATE public.tenant_members 
        SET role = 'OrgAdmin' 
        WHERE 'admin' = ANY(roles) AND role IS NULL;

        -- Default for others (if any)
        UPDATE public.tenant_members SET role = 'OrgAdmin' WHERE role IS NULL;

        -- Make role NOT NULL and drop the old column
        ALTER TABLE public.tenant_members ALTER COLUMN role SET NOT NULL;
        
        -- Drop PK which is on (tenant_id, user_id)
        ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_pkey;
        
        -- Add new composite PK
        ALTER TABLE public.tenant_members ADD PRIMARY KEY (tenant_id, user_id, role);

        -- Drop old column
        ALTER TABLE public.tenant_members DROP COLUMN roles;
    END IF;
END $$;

-- 6. Create Event Members Table
CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_event_role CHECK (role IN (
    'EventManager','NarrativeTeam','LogisticsTeam','FinanceTeam','NPCTeam','Player'
  )),
  UNIQUE(event_id, user_id, role)
);

-- 7. Update handle_new_user() trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- If this is the specific owner email, we ensure a default tenant exists and assign them roles
  IF new.email = 'cvesspy@gmail.com' THEN
    -- Grant System Admin
    INSERT INTO public.system_admins (user_id) VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Check if a tenant already exists, if not create 'Sancho Default Tenant'
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (name) VALUES ('Sancho Default Tenant') RETURNING id INTO v_tenant_id;
    END IF;
    
    -- Assign OrgOwner role
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, new.id, 'OrgOwner')
    ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable RLS on new tables
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- 9. Add RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System admins can view all system admins' AND tablename = 'system_admins') THEN
        CREATE POLICY "System admins can view all system admins" ON public.system_admins
          FOR SELECT USING (EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view role permissions' AND tablename = 'role_module_permissions') THEN
        CREATE POLICY "Everyone can view role permissions" ON public.role_module_permissions
          FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own event memberships' AND tablename = 'event_members') THEN
        CREATE POLICY "Users can view their own event memberships" ON public.event_members
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 10. Drop old ENUM
DROP TYPE IF EXISTS public.tenant_role CASCADE;
