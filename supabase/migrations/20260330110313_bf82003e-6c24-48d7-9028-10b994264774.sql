
CREATE TABLE public.board_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  event_type text NOT NULL,
  evidence_type text,
  evidence_id text,
  quadrant text,
  paired_with text,
  sequence_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.board_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own board events"
ON public.board_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own board events"
ON public.board_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins select all board_events"
ON public.board_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Professors read board events for own classes"
ON public.board_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM student_enrollments se
    JOIN classes c ON c.id = se.class_id
    WHERE se.user_id = board_events.user_id
      AND c.instructor_id = auth.uid()
  )
);
