
CREATE INDEX IF NOT EXISTS idx_board_events_session_id ON public.board_events (session_id);
CREATE INDEX IF NOT EXISTS idx_board_events_user_id ON public.board_events (user_id);

CREATE INDEX IF NOT EXISTS idx_allocation_events_session_id ON public.allocation_events (session_id);
CREATE INDEX IF NOT EXISTS idx_allocation_events_user_id ON public.allocation_events (user_id);

CREATE INDEX IF NOT EXISTS idx_navigation_events_session_id ON public.navigation_events (session_id);
CREATE INDEX IF NOT EXISTS idx_navigation_events_user_id ON public.navigation_events (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_events_session_id ON public.ai_feedback_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_events_user_id ON public.ai_feedback_events (user_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_events_session_id ON public.tutorial_events (session_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_events_user_id ON public.tutorial_events (user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON public.submissions (session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions (user_id);

CREATE INDEX IF NOT EXISTS idx_post_simulation_reflections_session_id ON public.post_simulation_reflections (session_id);
CREATE INDEX IF NOT EXISTS idx_post_simulation_reflections_user_id ON public.post_simulation_reflections (user_id);

CREATE INDEX IF NOT EXISTS idx_resets_session_id ON public.resets (session_id);
CREATE INDEX IF NOT EXISTS idx_resets_user_id ON public.resets (user_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_user_id ON public.student_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON public.student_enrollments (class_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON public.sessions (class_id);
