-- ============================================================
-- Migration: Create Narrative Storage Bucket
-- Ensures the 'narrative' bucket exists for faction sigils
-- and future narrative-context image uploads.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'narrative',
  'narrative',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- The backend uses the service role key for storage operations, so RLS on bucket objects
-- is bypassed by the backend API. No additional storage RLS policies needed.
