
CREATE TABLE public.ai_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  feedback_round integer NOT NULL DEFAULT 1,
  board_state_before jsonb NOT NULL,
  descriptive_cards_before integer NOT NULL DEFAULT 0,
  diagnostic_cards_before integer NOT NULL DEFAULT 0,
  prescriptive_cards_before integer NOT NULL DEFAULT 0,
  predictive_cards_before integer NOT NULL DEFAULT 0,
  contextualise_pairs_before integer NOT NULL DEFAULT 0,
  tiktok_spend_before integer,
  instagram_spend_before integer,
  facebook_spend_before integer,
  newspaper_spend_before integer,
  ai_feedback_text text,
  post_feedback_action text,
  time_adjusting_seconds integer,
  board_state_after jsonb,
  descriptive_cards_after integer,
  diagnostic_cards_after integer,
  prescriptive_cards_after integer,
  predictive_cards_after integer,
  contextualise_pairs_after integer,
  tiktok_spend_after integer,
  instagram_spend_after integer,
  facebook_spend_after integer,
  newspaper_spend_after integer,
  requested_at timestamptz NOT NULL DEFAULT now(),
  action_taken_at timestamptz
);

ALTER TABLE public.ai_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own ai_feedback_events"
  ON public.ai_feedback_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students read own ai_feedback_events"
  ON public.ai_feedback_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins select all ai_feedback_events"
  ON public.ai_feedback_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Professors read ai_feedback_events for own classes"
  ON public.ai_feedback_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN classes c ON c.id = se.class_id
      WHERE se.user_id = ai_feedback_events.user_id
        AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students update own ai_feedback_events"
  ON public.ai_feedback_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
