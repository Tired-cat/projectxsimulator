CREATE POLICY "Admins insert student_enrollments"
ON public.student_enrollments FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));