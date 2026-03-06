-- Performance indexes migration
-- Adds indexes required for RLS policies and common query patterns.
-- Without these, every authenticated query triggers sequential scans on
-- permission/membership tables, causing severe latency under concurrent load.

-- ============================================================
-- PERMISSION & MEMBERSHIP TABLES (hit by every RLS policy)
-- ============================================================

-- event_member_permissions: RLS queries by (user_id, event_id, module).
-- The PK is (event_id, user_id, module), which doesn't help user-first lookups.
CREATE INDEX IF NOT EXISTS idx_emp_user_event_module
    ON public.event_member_permissions (user_id, event_id, module);

-- event_members: RLS checks user membership on every event/character row read.
CREATE INDEX IF NOT EXISTS idx_em_user_event
    ON public.event_members (user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_em_event_role
    ON public.event_members (event_id, role);

-- system_admins: checked in RLS policies on every privileged operation.
CREATE INDEX IF NOT EXISTS idx_sa_user
    ON public.system_admins (user_id);

-- org_members: checked in RLS policies alongside system_admins.
CREATE INDEX IF NOT EXISTS idx_om_user_role
    ON public.org_members (user_id, role);

-- ============================================================
-- SOFT-DELETE PARTIAL INDEXES
-- All list queries filter on deleted_at IS NULL; partial indexes
-- skip deleted rows entirely, shrinking scan size dramatically.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_active
    ON public.events (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_active_status
    ON public.events (status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_characters_active_event
    ON public.characters (event_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_characters_active_event_status
    ON public.characters (event_id, status, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- CHARACTER SUB-TABLE INDEXES
-- ============================================================

-- Attachment filtering by review status and sort
CREATE INDEX IF NOT EXISTS idx_char_attach_status
    ON public.character_attachments (character_id, document_status, uploaded_at DESC);

-- Attachment filtering by source type
CREATE INDEX IF NOT EXISTS idx_char_attach_source
    ON public.character_attachments (character_id, source_type, uploaded_at DESC);

-- ============================================================
-- EVENT ACTIVITY LOG
-- ============================================================

-- Queries by actor (who did what)
CREATE INDEX IF NOT EXISTS idx_activity_actor
    ON public.event_activity_log (actor_user_id, created_at DESC);

-- Queries by entity (all activity for a specific character/item)
CREATE INDEX IF NOT EXISTS idx_activity_entity
    ON public.event_activity_log (entity_type, entity_id, created_at DESC);
