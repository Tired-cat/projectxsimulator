
-- Allow admins to delete classes
CREATE POLICY "Admins delete classes"
ON public.classes FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to delete profiles (for hard delete flow)
CREATE POLICY "Admins delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
