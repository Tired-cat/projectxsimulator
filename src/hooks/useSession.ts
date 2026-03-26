import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReasoningBoardState } from '@/types/evidenceChip';

const SCENARIO_ID = 'scenario-1';

interface SimSession {
  id: string;
  startedAt: string;
  isCompleted: boolean;
  completedAt: string | null;
}

interface SavedBoardState {
  cards: any;
  writtenDiagnosis: string | null;
  adjustmentsMade: number;
}

export function useSession(userId: string | undefined) {
  const [session, setSession] = useState<SimSession | null>(null);
  const [savedState, setSavedState] = useState<SavedBoardState | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize or resume session
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      setLoading(true);

      // Check for existing session
      const { data: existing } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('scenario_id', SCENARIO_ID)
        .single();

      if (existing) {
        setSession({
          id: existing.id,
          startedAt: existing.started_at,
          isCompleted: existing.is_completed,
          completedAt: existing.completed_at,
        });

        // Load saved board state
        const { data: boardState } = await supabase
          .from('reasoning_board_state')
          .select('*')
          .eq('session_id', existing.id)
          .single();

        if (boardState) {
          setSavedState({
            cards: boardState.cards,
            writtenDiagnosis: boardState.written_diagnosis,
            adjustmentsMade: boardState.adjustments_made,
          });
        }
      } else {
        // Create new session
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({ user_id: userId, scenario_id: SCENARIO_ID })
          .select()
          .single();

        if (newSession) {
          setSession({
            id: newSession.id,
            startedAt: newSession.started_at,
            isCompleted: newSession.is_completed,
            completedAt: newSession.completed_at,
          });

          // Create empty board state
          await supabase
            .from('reasoning_board_state')
            .insert({
              session_id: newSession.id,
              user_id: userId,
              cards: [],
              written_diagnosis: null,
              adjustments_made: 0,
            });
        }
      }

      setLoading(false);
    };

    initSession();
  }, [userId]);

  return { session, savedState, loading, setSession };
}
