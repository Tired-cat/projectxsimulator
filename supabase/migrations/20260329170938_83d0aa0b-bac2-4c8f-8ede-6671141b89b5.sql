
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own enrollments" ON public.student_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Students insert own enrollments" ON public.student_enrollments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Professors read enrollments for own classes" ON public.student_enrollments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = student_enrollments.class_id AND c.instructor_id = auth.uid())
  );
