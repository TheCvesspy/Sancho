-- Raise avatar bucket file size limit from 2MB to 5MB
-- Images larger than 5MB are automatically downscaled on the client before upload

UPDATE storage.buckets
SET file_size_limit = 5242880  -- 5MB
WHERE id = 'avatars';
