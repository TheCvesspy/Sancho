-- Redesign primary key for event_member_permissions to allow PostgREST upsert to work correctly
-- PostgREST 'merge-duplicates' requires conflict resolution on the PRIMARY KEY.

-- 1. Drop the surrogate PK constraint
ALTER TABLE event_member_permissions DROP CONSTRAINT IF EXISTS event_member_permissions_pkey;

-- 2. Drop the surrogate ID column (nothing references it)
ALTER TABLE event_member_permissions DROP COLUMN IF EXISTS id;

-- 3. Drop the now-redundant unique constraint (since it will become the PK)
ALTER TABLE event_member_permissions DROP CONSTRAINT IF EXISTS event_member_permissions_event_id_user_id_module_key;

-- 4. Add the new composite primary key
ALTER TABLE event_member_permissions ADD PRIMARY KEY (event_id, user_id, module);
