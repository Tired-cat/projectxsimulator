import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReasoningBoardState } from '@/types/evidenceChip';

const DEBOUNCE_MS = 1500;
const SAVED_INDICATOR_MS = 2000;

interface AutoSaveOptions {
  sessionId: string | null;
  userId: string | undefined;
  board: ReasoningBoardState;
  writtenDiagnosis: string;
  isCompleted: boolean;
}

export function useAutoSave({ sessionId, userId, board, writtenDiagnosis, isCompleted }: AutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [adjustmentsMade, setAdjustmentsMade] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout>>();
  const prevStateRef = useRef<string>('');
  const isFirstRender = useRef(true);

  // Serialize the current state for comparison
  const currentState = JSON.stringify({ board, writtenDiagnosis });

  const doSave = useCallback(async () => {
    if (!sessionId || !userId || isCompleted) return;

    setSaveStatus('saving');

    // Convert board to a flat array of cards for storage
    const allCards = Object.entries(board).flatMap(([blockId, chips]) =>
      chips.map(chip => ({ ...chip, blockId }))
    );

    const { error } = await supabase
      .from('reasoning_board_state')
      .update({
        cards: allCards,
        written_diagnosis: writtenDiagnosis || null,
        adjustments_made: adjustmentsMade + 1,
        last_saved_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    } else {
      setAdjustmentsMade(prev => prev + 1);
      setSaveStatus('saved');

      // Clear "saved" indicator after a delay
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
      savedIndicatorRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, SAVED_INDICATOR_MS);
    }
  }, [sessionId, userId, board, writtenDiagnosis, adjustmentsMade, isCompleted]);

  // Debounced auto-save on state changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevStateRef.current = currentState;
      return;
    }

    if (!sessionId || !userId || isCompleted) return;
    if (currentState === prevStateRef.current) return;

    prevStateRef.current = currentState;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentState, sessionId, userId, isCompleted, doSave]);

  // Force an immediate save (used before submit)
  const forceSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await doSave();
  }, [doSave]);

  // Initialize adjustments count from saved state
  const initAdjustments = useCallback((count: number) => {
    setAdjustmentsMade(count);
  }, []);

  return { saveStatus, adjustmentsMade, forceSave, initAdjustments };
}
