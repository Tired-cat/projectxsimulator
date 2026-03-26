import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReasoningBoardState } from '@/types/evidenceChip';

interface SubmitOptions {
  sessionId: string | null;
  userId: string | undefined;
  sessionStartedAt: string | null;
  board: ReasoningBoardState;
  writtenDiagnosis: string;
  forceSave: () => Promise<void>;
  onCompleted: () => void;
}

export function useSubmit({
  sessionId,
  userId,
  sessionStartedAt,
  board,
  writtenDiagnosis,
  forceSave,
  onCompleted,
}: SubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submit = useCallback(async () => {
    if (!sessionId || !userId || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);

    try {
      // 1. Force save the final state
      await forceSave();

      // 2. Calculate total cards on board
      const cardsOnBoardCount = Object.values(board).reduce(
        (sum, chips) => sum + chips.length,
        0
      );

      // 3. Calculate time elapsed
      const now = new Date();
      const startedAt = sessionStartedAt ? new Date(sessionStartedAt) : now;
      const timeElapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

      // 4. Create submission record
      await supabase.from('submissions').insert({
        session_id: sessionId,
        user_id: userId,
        final_decision: writtenDiagnosis || 'No written diagnosis provided',
        cards_on_board_count: cardsOnBoardCount,
        time_elapsed_seconds: timeElapsedSeconds,
      });

      // 5. Mark session as completed
      await supabase
        .from('sessions')
        .update({
          is_completed: true,
          completed_at: now.toISOString(),
        })
        .eq('id', sessionId);

      setIsSubmitted(true);
      onCompleted();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, userId, sessionStartedAt, board, writtenDiagnosis, forceSave, isSubmitting, isSubmitted, onCompleted]);

  return { submit, isSubmitting, isSubmitted, setIsSubmitted };
}
