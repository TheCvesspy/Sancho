-- 1. Extend user_profiles with additional fields
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS locale       TEXT NOT NULL DEFAULT 'en';

-- 2. Ensure RLS is enabled (should already be, but safe to repeat)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_profiles
-- Users can only see and update their own profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 4. Create the 'avatars' storage bucket
-- Note: inserting into storage.buckets usually requires superuser or specific permissions. 
-- In a Supabase migration, this works if run via the SQL editor or CLI with appropriate keys.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies
-- Only the owner can upload, update, or delete their own avatar.
-- Avatars are stored at path: {auth.uid()}/avatar.jpg (or similar)
CREATE POLICY "Avatar Owner Insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar Owner Select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar Owner Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar Owner Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
