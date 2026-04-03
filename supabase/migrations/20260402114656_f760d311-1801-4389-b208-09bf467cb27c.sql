CREATE POLICY "Admins delete student_enrollments"
ON public.student_enrollments
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));