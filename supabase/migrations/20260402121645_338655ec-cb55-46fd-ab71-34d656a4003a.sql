
-- 1. Create a security-definer RPC for class code lookup (no auth required)
CREATE OR REPLACE FUNCTION public.lookup_class_by_code(_class_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, name FROM public.classes WHERE class_code = _class_code LIMIT 1;
$$;

-- 2. Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anyone can lookup classes by section code" ON public.classes;

-- 3. Drop the overly permissive authenticated policy
DROP POLICY IF EXISTS "Authenticated users can read classes" ON public.classes;

-- 4. Add scoped policy: enrolled students can read their own classes
CREATE POLICY "Enrolled students can read their classes"
ON public.classes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_enrollments.class_id = classes.id
      AND student_enrollments.user_id = auth.uid()
  )
);
