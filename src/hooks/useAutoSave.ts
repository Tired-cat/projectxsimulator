import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReasoningBoardState } from '@/types/evidenceChip';

const DEBOUNCE_MS = 1500;

interface AutoSaveOptions {
  sessionId: string | null;
  board: ReasoningBoardState;
  writtenDiagnosis: string;
  isCompleted: boolean;
}

export function useAutoSave({ sessionId, board, writtenDiagnosis, isCompleted }: AutoSaveOptions) {
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [boardStateId, setBoardStateId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeCountRef = useRef(0);
  const initialLoadDone = useRef(false);

  // Load existing board state on session init
  useEffect(() => {
    if (!sessionId || !user) return;

    const load = async () => {
      try {
        const { data } = await supabase
          .from('reasoning_board_state')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setBoardStateId(data.id);
          changeCountRef.current = data.adjustments_made;
          initialLoadDone.current = true;
          return data;
        } else {
          // Create initial record
          const { data: newRow } = await supabase
            .from('reasoning_board_state')
            .insert({
              session_id: sessionId,
              user_id: user.id,
              cards: JSON.parse(JSON.stringify(board)),
              written_diagnosis: writtenDiagnosis || null,
            })
            .select()
            .single();

          if (newRow) {
            setBoardStateId(newRow.id);
          }
          initialLoadDone.current = true;
          return newRow;
        }
      } catch (err) {
        console.error('AutoSave load error:', err);
        initialLoadDone.current = true; // Allow saving even if initial load fails
        return null;
      }
    };

    load();
  }, [sessionId, user]);

  // Debounced auto-save on board or diagnosis changes
  useEffect(() => {
    if (!boardStateId || !user || isCompleted || !initialLoadDone.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      changeCountRef.current += 1;

      await supabase
        .from('reasoning_board_state')
        .update({
          cards: JSON.parse(JSON.stringify(board)),
          written_diagnosis: writtenDiagnosis || null,
          adjustments_made: changeCountRef.current,
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', boardStateId);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [board, writtenDiagnosis, boardStateId, user, isCompleted]);

  // Force save (for submit)
  const forceSave = useCallback(async () => {
    if (!boardStateId || !user) return;
    changeCountRef.current += 1;
    await supabase
      .from('reasoning_board_state')
      .update({
        cards: JSON.parse(JSON.stringify(board)),
        written_diagnosis: writtenDiagnosis || null,
        adjustments_made: changeCountRef.current,
        last_saved_at: new Date().toISOString(),
      })
      .eq('id', boardStateId);
  }, [boardStateId, user, board, writtenDiagnosis]);

  return { saveStatus, forceSave, boardStateId, adjustmentsMade: changeCountRef.current };
}
