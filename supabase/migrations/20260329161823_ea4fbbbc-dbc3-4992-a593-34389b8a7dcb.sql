
-- Student responses table for simulation submissions
CREATE TABLE public.student_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_identifier text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (students enter via access code, no auth)
CREATE POLICY "Anyone can insert student responses"
  ON public.student_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Professors can read responses for their classes
CREATE POLICY "Professors read responses for own classes"
  ON public.student_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_responses.class_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Allow anon to read classes for access code lookup
CREATE POLICY "Anyone can lookup classes by section code"
  ON public.classes FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read active simulations for a class
CREATE POLICY "Anyone can read active simulations"
  ON public.simulations FOR SELECT
  TO anon
  USING (status = 'active');

-- Enable realtime for student_responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_responses;
