
-- sessions.class_id → SET NULL on class delete
ALTER TABLE public.sessions
DROP CONSTRAINT IF EXISTS sessions_class_id_fkey;

ALTER TABLE public.sessions
ADD CONSTRAINT sessions_class_id_fkey
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

-- student_enrollments.class_id → CASCADE on class delete
ALTER TABLE public.student_enrollments
DROP CONSTRAINT IF EXISTS student_enrollments_class_id_fkey;

ALTER TABLE public.student_enrollments
ADD CONSTRAINT student_enrollments_class_id_fkey
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- simulations.class_id → CASCADE on class delete
ALTER TABLE public.simulations
DROP CONSTRAINT IF EXISTS simulations_class_id_fkey;

ALTER TABLE public.simulations
ADD CONSTRAINT simulations_class_id_fkey
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- student_responses.class_id → CASCADE on class delete
ALTER TABLE public.student_responses
DROP CONSTRAINT IF EXISTS student_responses_class_id_fkey;

ALTER TABLE public.student_responses
ADD CONSTRAINT student_responses_class_id_fkey
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- classes.instructor_id → CASCADE on professor profile delete
ALTER TABLE public.classes
DROP CONSTRAINT IF EXISTS classes_instructor_id_fkey;

ALTER TABLE public.classes
ADD CONSTRAINT classes_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
