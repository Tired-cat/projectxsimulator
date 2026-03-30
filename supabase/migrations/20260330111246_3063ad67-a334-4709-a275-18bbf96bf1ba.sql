
CREATE TABLE public.navigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  tab text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  time_spent_seconds integer,
  visit_number integer
);

ALTER TABLE public.navigation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own navigation events"
ON public.navigation_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own navigation events"
ON public.navigation_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Students update own navigation events"
ON public.navigation_events
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins select all navigation_events"
ON public.navigation_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Professors read navigation events for own classes"
ON public.navigation_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM student_enrollments se
    JOIN classes c ON c.id = se.class_id
    WHERE se.user_id = navigation_events.user_id
      AND c.instructor_id = auth.uid()
  )
);
