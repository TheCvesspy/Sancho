-- Create ENUM for tenant roles
CREATE TYPE public.tenant_role AS ENUM (
  'owner',
  'admin',
  'event_manager', 'event_viewer',
  'character_manager', 'character_viewer',
  'narrative_manager', 'narrative_viewer',
  'logistics_manager', 'logistics_viewer',
  'npc_manager', 'npc_viewer',
  'finance_manager', 'finance_viewer',
  'communications_manager', 'communications_viewer'
);

-- Create Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create User Profiles table (Linked to auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Tenant Members table
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  roles public.tenant_role[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Handle new user signups automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- If this is the specific owner email, we ensure a default tenant exists and assign them owner role
  IF new.email = 'cvesspy@gmail.com' THEN
    -- Check if a tenant already exists, if not create 'Sancho Default Tenant'
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (name) VALUES ('Sancho Default Tenant') RETURNING id INTO v_tenant_id;
    END IF;
    
    INSERT INTO public.tenant_members (tenant_id, user_id, roles)
    VALUES (v_tenant_id, new.id, ARRAY['owner']::public.tenant_role[]);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
