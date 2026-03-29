
-- Classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  section_code text NOT NULL,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Professors can read their own classes
CREATE POLICY "Professors read own classes"
  ON public.classes FOR SELECT TO authenticated
  USING (instructor_id = auth.uid());

-- Professors can insert their own classes
CREATE POLICY "Professors insert own classes"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (instructor_id = auth.uid());

-- Professors can update their own classes
CREATE POLICY "Professors update own classes"
  ON public.classes FOR UPDATE TO authenticated
  USING (instructor_id = auth.uid());

-- Professors can delete their own classes
CREATE POLICY "Professors delete own classes"
  ON public.classes FOR DELETE TO authenticated
  USING (instructor_id = auth.uid());

-- Simulations table
CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  results_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- Professors can read simulations for their classes
CREATE POLICY "Professors read own simulations"
  ON public.simulations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.instructor_id = auth.uid()
  ));

-- Professors can insert simulations for their classes
CREATE POLICY "Professors insert own simulations"
  ON public.simulations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.instructor_id = auth.uid()
  ));

-- Professors can update simulations for their classes
CREATE POLICY "Professors update own simulations"
  ON public.simulations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.instructor_id = auth.uid()
  ));
