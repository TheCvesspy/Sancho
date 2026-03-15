-- Add theme preference column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'system';

-- Restrict to valid theme values
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_theme_check CHECK (theme IN ('light', 'dark', 'system'));
