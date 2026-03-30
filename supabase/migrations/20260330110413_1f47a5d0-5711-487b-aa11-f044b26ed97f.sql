
CREATE TABLE public.allocation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  channel text NOT NULL,
  previous_value integer,
  new_value integer,
  sequence_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allocation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own allocation events"
ON public.allocation_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own allocation events"
ON public.allocation_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins select all allocation_events"
ON public.allocation_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Professors read allocation events for own classes"
ON public.allocation_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM student_enrollments se
    JOIN classes c ON c.id = se.class_id
    WHERE se.user_id = allocation_events.user_id
      AND c.instructor_id = auth.uid()
  )
);
