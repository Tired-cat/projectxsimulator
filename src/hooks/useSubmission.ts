import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubmitOptions {
  sessionId: string | null;
  startedAt: string | null;
  finalDecision: string;
  cardsOnBoardCount: number;
  forceSave: () => Promise<void>;
  completeSession: () => Promise<void>;
}

export function useSubmission({
  sessionId,
  startedAt,
  finalDecision,
  cardsOnBoardCount,
  forceSave,
  completeSession,
}: SubmitOptions) {
  const { user } = useAuth();

  const submit = useCallback(async () => {
    if (!sessionId || !user || !startedAt) return;

    // Save final state
    await forceSave();

    // Calculate time elapsed
    const elapsed = Math.round(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );

    // Create submission
    await supabase.from('submissions').insert({
      session_id: sessionId,
      user_id: user.id,
      final_decision: finalDecision,
      cards_on_board_count: cardsOnBoardCount,
      time_elapsed_seconds: elapsed,
    });

    // Mark session complete
    await completeSession();
  }, [sessionId, user, startedAt, finalDecision, cardsOnBoardCount, forceSave, completeSession]);

  return { submit };
}
