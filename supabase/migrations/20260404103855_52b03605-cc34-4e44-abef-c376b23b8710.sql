
CREATE TABLE public.post_simulation_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  q1_story_accuracy text,
  q2_expression_gaps text,
  q3_annotation_usefulness text,
  q4_unexpected_conflicts text,
  q5_general_feedback text,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_simulation_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own reflections"
  ON public.post_simulation_reflections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own reflections"
  ON public.post_simulation_reflections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins select all reflections"
  ON public.post_simulation_reflections FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Professors read reflections for own classes"
  ON public.post_simulation_reflections FOR SELECT TO authenticated
  USING (is_professor_of_student(auth.uid(), user_id));
