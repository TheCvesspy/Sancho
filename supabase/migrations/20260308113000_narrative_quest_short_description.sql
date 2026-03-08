-- Add short description for quick quest identification across modules
ALTER TABLE public.narrative_quests
ADD COLUMN IF NOT EXISTS short_description TEXT;

