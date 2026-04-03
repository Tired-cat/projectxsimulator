
-- 1. Create helper functions to break RLS recursion

-- Check if a user is enrolled in a specific class (used by classes table policies)
CREATE OR REPLACE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE user_id = _user_id AND class_id = _class_id
  );
$$;

-- Check if a user (professor) owns a class that a student is enrolled in
CREATE OR REPLACE FUNCTION public.is_professor_of_student(_professor_id uuid, _student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.classes c ON c.id = se.class_id
    WHERE se.user_id = _student_user_id AND c.instructor_id = _professor_id
  );
$$;

-- Check if professor owns a class
CREATE OR REPLACE FUNCTION public.is_class_instructor(_professor_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id AND instructor_id = _professor_id
  );
$$;

-- 2. Fix classes table: drop recursive policy, add non-recursive one
DROP POLICY IF EXISTS "Enrolled students can read their classes" ON public.classes;
CREATE POLICY "Enrolled students can read their classes"
ON public.classes FOR SELECT TO authenticated
USING (public.is_enrolled_in_class(auth.uid(), id));

-- 3. Fix student_enrollments table: drop recursive policy, add non-recursive one
DROP POLICY IF EXISTS "Professors read enrollments for own classes" ON public.student_enrollments;
CREATE POLICY "Professors read enrollments for own classes"
ON public.student_enrollments FOR SELECT TO authenticated
USING (public.is_class_instructor(auth.uid(), class_id));

-- 4. Fix all other tables that reference student_enrollments+classes in their policies

-- sessions
DROP POLICY IF EXISTS "Professors read sessions for own classes" ON public.sessions;
CREATE POLICY "Professors read sessions for own classes"
ON public.sessions FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- submissions
DROP POLICY IF EXISTS "Professors read submissions for own classes" ON public.submissions;
CREATE POLICY "Professors read submissions for own classes"
ON public.submissions FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- resets
DROP POLICY IF EXISTS "Professors read resets for own classes" ON public.resets;
CREATE POLICY "Professors read resets for own classes"
ON public.resets FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- allocation_events
DROP POLICY IF EXISTS "Professors read allocation events for own classes" ON public.allocation_events;
CREATE POLICY "Professors read allocation events for own classes"
ON public.allocation_events FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- navigation_events
DROP POLICY IF EXISTS "Professors read navigation events for own classes" ON public.navigation_events;
CREATE POLICY "Professors read navigation events for own classes"
ON public.navigation_events FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- board_events
DROP POLICY IF EXISTS "Professors read board events for own classes" ON public.board_events;
CREATE POLICY "Professors read board events for own classes"
ON public.board_events FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- tutorial_events
DROP POLICY IF EXISTS "Professors read tutorial_events for own classes" ON public.tutorial_events;
CREATE POLICY "Professors read tutorial_events for own classes"
ON public.tutorial_events FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- ai_feedback_events
DROP POLICY IF EXISTS "Professors read ai_feedback_events for own classes" ON public.ai_feedback_events;
CREATE POLICY "Professors read ai_feedback_events for own classes"
ON public.ai_feedback_events FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));

-- reasoning_board_state
DROP POLICY IF EXISTS "Professors read board states for own classes" ON public.reasoning_board_state;
CREATE POLICY "Professors read board states for own classes"
ON public.reasoning_board_state FOR SELECT TO authenticated
USING (public.is_professor_of_student(auth.uid(), user_id));
