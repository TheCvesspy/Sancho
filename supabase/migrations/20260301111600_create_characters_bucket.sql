-- ============================================================
-- Migration: Create Characters Storage Bucket
-- Ensures the 'characters' bucket exists for attachments and photos.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'characters',
  'characters',
  false,
  20971520, -- 20MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for 'characters' bucket are already handled by general policies 
-- in characters_context_v1, which references public.character_attachments.
-- However, we need to ensure users can actually upload to the storage path.
-- The backend uses the service role key for storage operations, so RLS on bucket objects
-- is bypassed by the backend API.
