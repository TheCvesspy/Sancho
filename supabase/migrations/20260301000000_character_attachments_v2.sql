-- ============================================================
-- Migration: Character Attachments v2
-- Adds display_name, document_status, and source_type columns
-- to support document metadata, status workflow, and Google Drive links.
-- ============================================================

ALTER TABLE public.character_attachments
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS document_status TEXT NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'Upload';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'character_attachments_doc_status_check'
      AND conrelid = 'public.character_attachments'::regclass
  ) THEN
    ALTER TABLE public.character_attachments
      ADD CONSTRAINT character_attachments_doc_status_check
        CHECK (document_status IN ('Draft', 'Ready to Review', 'Final'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'character_attachments_source_type_check'
      AND conrelid = 'public.character_attachments'::regclass
  ) THEN
    ALTER TABLE public.character_attachments
      ADD CONSTRAINT character_attachments_source_type_check
        CHECK (source_type IN ('Upload', 'GoogleDrive'));
  END IF;
END $$;
