import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReasoningBoardState, REASONING_SEQUENCE } from '@/types/evidenceChip';

interface SubmitOptions {
  sessionId: string | null;
  startedAt: string | null;
  finalDecision: string;
  cardsOnBoardCount: number;
  board: ReasoningBoardState;
  adjustmentsMade: number;
  usedAi: boolean;
  forceSave: () => Promise<void>;
  completeSession: () => Promise<void>;
}

function computeReasoningScore(board: ReasoningBoardState, adjustmentsMade: number): number {
  const blocks: (keyof ReasoningBoardState)[] = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'];
  const filledBlocks = blocks.filter(b => board[b]?.length > 0).length;
  const totalChips = blocks.reduce((sum, b) => sum + (board[b]?.length ?? 0), 0);

  const effort = (Math.min(adjustmentsMade, 10) / 10) * 40;
  const qualityBlocks = (filledBlocks / 4) * 40;
  const qualityCards = (Math.min(totalChips, 4) / 4) * 20;

  return Math.round(effort + qualityBlocks + qualityCards);
}

export function useSubmission({
  sessionId,
  startedAt,
  finalDecision,
  cardsOnBoardCount,
  board,
  adjustmentsMade,
  usedAi,
  forceSave,
  completeSession,
}: SubmitOptions) {
  const { user } = useAuth();

  const submit = useCallback(async () => {
    if (!sessionId || !user || !startedAt) return;

    await forceSave();

    const elapsed = Math.round(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );

    const reasoning_score = computeReasoningScore(board, adjustmentsMade);

    await supabase.from('submissions').insert({
      session_id: sessionId,
      user_id: user.id,
      final_decision: finalDecision,
      cards_on_board_count: cardsOnBoardCount,
      time_elapsed_seconds: elapsed,
      reasoning_score,
      used_ai: usedAi,
    });

    await completeSession();
  }, [sessionId, user, startedAt, finalDecision, cardsOnBoardCount, board, adjustmentsMade, usedAi, forceSave, completeSession]);

  return { submit };
}
