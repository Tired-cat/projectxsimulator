
-- Tighten the insert policy to validate class+simulation relationship
DROP POLICY "Anyone can insert student responses" ON public.student_responses;
CREATE POLICY "Validated student response inserts"
  ON public.student_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.simulations s
      WHERE s.id = student_responses.simulation_id
        AND s.class_id = student_responses.class_id
        AND s.status = 'active'
    )
  );
