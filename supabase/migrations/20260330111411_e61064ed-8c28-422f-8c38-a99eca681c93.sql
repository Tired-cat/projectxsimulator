
CREATE TABLE public.resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  reset_type text NOT NULL,
  cards_cleared integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own resets"
ON public.resets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own resets"
ON public.resets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins select all resets"
ON public.resets
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Professors read resets for own classes"
ON public.resets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM student_enrollments se
    JOIN classes c ON c.id = se.class_id
    WHERE se.user_id = resets.user_id
      AND c.instructor_id = auth.uid()
  )
);
