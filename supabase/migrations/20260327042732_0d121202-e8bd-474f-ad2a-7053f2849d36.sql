
-- Add tracking columns to reasoning_board_state
ALTER TABLE public.reasoning_board_state
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS step_1_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_2_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_3_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone NOT NULL DEFAULT now();

-- Add detailed submission columns
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS step_1_text text,
  ADD COLUMN IF NOT EXISTS step_2_chips jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS step_3_reflection text;

-- Enable realtime for professor dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reasoning_board_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
