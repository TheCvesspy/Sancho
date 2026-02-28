-- Update the 'avatars' bucket to enforce security constraints
-- file_size_limit: 2MB (2,097,152 bytes)
-- allowed_mime_types: Standard image formats

UPDATE storage.buckets
SET 
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE id = 'avatars';
