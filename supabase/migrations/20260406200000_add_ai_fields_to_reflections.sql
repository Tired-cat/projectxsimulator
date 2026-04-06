ALTER TABLE public.post_simulation_reflections
  ADD COLUMN IF NOT EXISTS used_ai boolean,
  ADD COLUMN IF NOT EXISTS ai_chat_link text;
