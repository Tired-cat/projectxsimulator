ALTER TABLE public.sessions
  ADD COLUMN class_id uuid REFERENCES public.classes(id);