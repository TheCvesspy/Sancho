-- ============================================================
-- Migration: Invite-Only Registration
-- Adds public.invite_tokens and updates handle_new_user trigger
-- to enforce registration gate.
-- ============================================================

-- 1. Create invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   TEXT NOT NULL UNIQUE,   -- SHA-256 hex of raw token
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  email_hint   TEXT,                   -- Optional: pre-link to an email
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at      TIMESTAMPTZ,            -- NULL = unused
  used_by      UUID REFERENCES auth.users(id),
  revoked_at   TIMESTAMPTZ,            -- NULL = not revoked
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for invite_tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can manage invite tokens'
      AND tablename = 'invite_tokens'
  ) THEN
    CREATE POLICY "Admins can manage invite tokens" ON public.invite_tokens
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.org_members WHERE user_id = auth.uid() AND role = 'OrgOwner'
        )
      );
  END IF;
END $$;

-- 3. Utility function to validate token
CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invite_tokens
    WHERE token_hash = p_token_hash
      AND used_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Updated handle_new_user() trigger with registration gate
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_token_hash TEXT;
    v_token_id UUID;
BEGIN
  -- 1. Check if user already has a profile (should not happen on INSERT trigger but safe to check)
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = new.id) THEN
    RETURN new;
  END IF;

  -- 2. Registration Gate Logic
  -- Allow the designated owner always
  IF new.email = 'cvesspy@gmail.com' THEN
    v_token_hash := NULL; -- No token needed for owner
  ELSE
    -- Extract token hash from metadata
    v_token_hash := new.raw_user_meta_data->>'invite_token_hash';

    -- Validate token
    SELECT id INTO v_token_id
    FROM public.invite_tokens
    WHERE token_hash = v_token_hash
      AND used_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > now();

    IF v_token_id IS NULL THEN
      -- If no valid token, check if this email already has a profile 
      -- (This would happen if we allow Google login for existing users, 
      -- but Supabase Auth creates a new user record if it can't link)
      -- However, the trigger is on auth.users INSERT.
      RAISE EXCEPTION 'Registration requires a valid invite token. Please contact an administrator.';
    END IF;
  END IF;

  -- 3. Create profile record
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Mark token as used if applicable
  IF v_token_id IS NOT NULL THEN
    UPDATE public.invite_tokens
    SET used_at = now(),
        used_by = new.id
    WHERE id = v_token_id;
  END IF;

  -- 5. If this is the designated owner, grant SystemAdmin + OrgOwner
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
