
-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND email = 'ashwonsouq@gmail.com'
  )
$$;

-- Admin SELECT policies for all tables
CREATE POLICY "Admins select all classes" ON public.classes
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all student_enrollments" ON public.student_enrollments
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all submissions" ON public.submissions
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all sessions" ON public.sessions
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all reasoning_board_state" ON public.reasoning_board_state
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all user_roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all simulations" ON public.simulations
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins select all student_responses" ON public.student_responses
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
