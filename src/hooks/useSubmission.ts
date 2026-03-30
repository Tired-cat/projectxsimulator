import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReasoningBoardState, REASONING_SEQUENCE } from '@/types/evidenceChip';

interface ChannelSpend {
  tiktok: number;
  instagram: number;
  facebook: number;
  newspaper: number;
}

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
  channelSpend: ChannelSpend;
  feedbackRoundsUsed: number;
  generatedStory: string;
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
  channelSpend,
  feedbackRoundsUsed,
  generatedStory,
}: SubmitOptions) {
  const { user } = useAuth();

  const submit = useCallback(async () => {
    if (!sessionId || !user || !startedAt) return;

    await forceSave();

    const elapsed = Math.round(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );

    const reasoning_score = computeReasoningScore(board, adjustmentsMade);

    const contextPairsCount = Object.values(board).reduce(
      (sum, chips) => sum + chips.filter((c: any) => c.contextChips?.length > 0 || c.contextChip).length,
      0,
    );

    await supabase.from('submissions').insert({
      session_id: sessionId,
      user_id: user.id,
      final_decision: finalDecision,
      cards_on_board_count: cardsOnBoardCount,
      time_elapsed_seconds: elapsed,
      reasoning_score,
      used_ai: usedAi,
      generated_story: generatedStory || null,
      descriptive_card_count: board.descriptive?.length ?? 0,
      diagnostic_card_count: board.diagnostic?.length ?? 0,
      prescriptive_card_count: board.prescriptive?.length ?? 0,
      predictive_card_count: board.predictive?.length ?? 0,
      contextualise_pairs_count: contextPairsCount,
      final_tiktok_spend: channelSpend.tiktok,
      final_instagram_spend: channelSpend.instagram,
      final_facebook_spend: channelSpend.facebook,
      final_newspaper_spend: channelSpend.newspaper,
      feedback_rounds_used: feedbackRoundsUsed,
    });

    await completeSession();
  }, [sessionId, user, startedAt, finalDecision, cardsOnBoardCount, board, adjustmentsMade, usedAi, forceSave, completeSession, channelSpend, feedbackRoundsUsed, generatedStory]);

  return { submit };
}
