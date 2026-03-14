-- ============================================================
-- Migration: Remove notes from faction relationships
-- ============================================================

ALTER TABLE public.narrative_faction_relationships DROP COLUMN IF EXISTS notes;
