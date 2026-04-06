ALTER TABLE public.post_simulation_reflections
  ADD COLUMN used_ai boolean DEFAULT false,
  ADD COLUMN ai_chat_link text;