import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

interface SubmitOptions {
  sessionId: string | null;
  startedAt: string | null;
  finalDecision: string;
  cardsOnBoardCount: number;
  boardCards: Record<string, unknown[]> | Json;
  adjustmentsMade: number;
  forceSave: () => Promise<void>;
  completeSession: () => Promise<void>;
}

/** Compute a reasoning score 0–100 from board state */
function computeReasoningScore(
  boardCards: Record<string, unknown[]> | Json,
  adjustmentsMade: number,
): number {
  const cards = (boardCards && typeof boardCards === 'object' && !Array.isArray(boardCards))
    ? boardCards as Record<string, unknown[]>
    : {} as Record<string, unknown[]>;

  // Effort (40 pts): min(adjustments, 10) / 10 × 40
  const effort = (Math.min(adjustmentsMade, 10) / 10) * 40;

  // Blocks filled (40 pts): blocks with ≥1 chip / 4 × 40
  const blocksFilled = Object.values(cards).filter(
    (arr) => Array.isArray(arr) && arr.length > 0,
  ).length;
  const blocksScore = (blocksFilled / 4) * 40;

  // Cards placed (20 pts): min(totalChips, 4) / 4 × 20
  const totalChips = Object.values(cards).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
  const cardsScore = (Math.min(totalChips, 4) / 4) * 20;

  return Math.round(effort + blocksScore + cardsScore);
}

export function useSubmission({
  sessionId,
  startedAt,
  finalDecision,
  cardsOnBoardCount,
  boardCards,
  adjustmentsMade,
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
      (Date.now() - new Date(startedAt).getTime()) / 1000,
    );

    // Compute reasoning score
    const reasoning_score = computeReasoningScore(boardCards, adjustmentsMade);

    // Create submission
    await supabase.from('submissions').insert({
      session_id: sessionId,
      user_id: user.id,
      final_decision: finalDecision,
      cards_on_board_count: cardsOnBoardCount,
      time_elapsed_seconds: elapsed,
      reasoning_score,
    });

    // Mark session complete
    await completeSession();
  }, [sessionId, user, startedAt, finalDecision, cardsOnBoardCount, boardCards, adjustmentsMade, forceSave, completeSession]);

  return { submit };
}
