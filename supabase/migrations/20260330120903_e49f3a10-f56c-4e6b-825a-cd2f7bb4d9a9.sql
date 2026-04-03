
CREATE TABLE public.tutorial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  step_number integer,
  total_steps integer,
  time_spent_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutorial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own tutorial_events"
  ON public.tutorial_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own tutorial_events"
  ON public.tutorial_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins select all tutorial_events"
  ON public.tutorial_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Professors read tutorial_events for own classes"
  ON public.tutorial_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN classes c ON c.id = se.class_id
      WHERE se.user_id = tutorial_events.user_id
        AND c.instructor_id = auth.uid()
    )
  );
