
ALTER TABLE public.sessions
  ADD COLUMN tutorial_opened boolean NOT NULL DEFAULT false,
  ADD COLUMN tutorial_completed boolean NOT NULL DEFAULT false;
