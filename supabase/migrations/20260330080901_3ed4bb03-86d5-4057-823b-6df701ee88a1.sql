
-- 1. Tighten professor SELECT on submissions: only for students in their classes
DROP POLICY IF EXISTS "Professors read all submissions" ON public.submissions;
CREATE POLICY "Professors read submissions for own classes"
ON public.submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.classes c ON c.id = se.class_id
    WHERE se.user_id = submissions.user_id
      AND c.instructor_id = auth.uid()
  )
);

-- 2. Tighten professor SELECT on sessions
DROP POLICY IF EXISTS "Professors read all sessions" ON public.sessions;
CREATE POLICY "Professors read sessions for own classes"
ON public.sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.classes c ON c.id = se.class_id
    WHERE se.user_id = sessions.user_id
      AND c.instructor_id = auth.uid()
  )
);

-- 3. Tighten professor SELECT on reasoning_board_state
DROP POLICY IF EXISTS "Professors read all board states" ON public.reasoning_board_state;
CREATE POLICY "Professors read board states for own classes"
ON public.reasoning_board_state FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.classes c ON c.id = se.class_id
    WHERE se.user_id = reasoning_board_state.user_id
      AND c.instructor_id = auth.uid()
  )
);

-- 4. Add admin SELECT policies (using has_role security definer function)
CREATE POLICY "Admins select all classes"
ON public.classes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'professor'::app_role) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'professor'::app_role
  AND auth.uid() IN (SELECT ur.user_id FROM public.user_roles ur)
) OR instructor_id = auth.uid());

-- Actually, the app_role enum only has 'student' and 'professor', not 'admin'.
-- Admin is determined by email. Let me use a different approach: create a function.
DROP POLICY IF EXISTS "Admins select all classes" ON public.classes;
