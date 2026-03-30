import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useTabs } from './TabContext';
import { useReasoningBoard } from './ReasoningBoardContext';

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface TutorialContextValue {
  active: boolean;
  step: TutorialStep;
  startTutorial: () => void;
  skipTutorial: () => void;
  advanceStep: () => void;
  completeAction: () => void;
  actionCompleted: boolean;
}

const NOOP = () => {};
const DEFAULT_VALUE: TutorialContextValue = {
  active: false,
  step: 1,
  startTutorial: NOOP,
  skipTutorial: NOOP,
  advanceStep: NOOP,
  completeAction: NOOP,
  actionCompleted: false,
};

const TutorialContext = createContext<TutorialContextValue>(DEFAULT_VALUE);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<TutorialStep>(1);
  const [actionCompleted, setActionCompleted] = useState(false);

  const { openTab, split } = useTabs();
  const { board } = useReasoningBoard();

  const startTutorial = useCallback(() => {
    openTab('decisions');
    setStep(1);
    setActionCompleted(false);
    setActive(true);
  }, [openTab]);

  const skipTutorial = useCallback(() => {
    setActive(false);
    setStep(1);
    setActionCompleted(false);
    openTab('home');
  }, [openTab]);

  const advanceStep = useCallback(() => {
    setActionCompleted(false);
    if (step < 9) {
      const next = (step + 1) as TutorialStep;
      setStep(next);

      // Close compare mode before steps that need a clean layout
      if (next === 4 || next === 7) {
        window.dispatchEvent(new Event('tutorial:close-compare'));
      }

      // Navigate to the right tab for each step
      if (next === 5) {
        openTab('reasoning'); // Show the board so students see the 4 quadrants
      } else if (next === 6) {
        openTab('decisions'); // Go back to decisions to drag the Reasoning Board tab
      } else if (next === 8) {
        openTab('reasoning'); // Show the generated narrative
      }
    } else {
      setActive(false);
      setStep(1);
      openTab('home');
    }
  }, [step, openTab]);

  const completeAction = useCallback(() => {
    setActionCompleted(true);
  }, []);

  // Step 1: budget bar dragged
  useEffect(() => {
    if (!active || step !== 1) return;
    const handler = () => setActionCompleted(true);
    window.addEventListener('tutorial:budget-adjusted', handler as EventListener);
    return () => window.removeEventListener('tutorial:budget-adjusted', handler as EventListener);
  }, [active, step]);

  // Step 2: view tab switched away from Budget
  useEffect(() => {
    if (!active || step !== 2) return;
    const handler = () => setActionCompleted(true);
    window.addEventListener('tutorial:view-switched', handler as EventListener);
    return () => window.removeEventListener('tutorial:view-switched', handler as EventListener);
  }, [active, step]);

  // Step 4: compare mode activated
  useEffect(() => {
    if (!active || step !== 4) return;
    const handler = () => setActionCompleted(true);
    window.addEventListener('tutorial:compare-activated', handler as EventListener);
    return () => window.removeEventListener('tutorial:compare-activated', handler as EventListener);
  }, [active, step]);

  // Step 6: split view opened (user dragged Reasoning Board tab to split zone)
  useEffect(() => {
    if (!active || step !== 6) return;
    if (split.enabled) setActionCompleted(true);
  }, [active, step, split.enabled]);

  // Step 7: chip added to the reasoning board
  useEffect(() => {
    if (!active || step !== 7) return;
    const totalChips = Object.values(board).reduce((s, arr) => s + arr.length, 0);
    if (totalChips > 0) setActionCompleted(true);
  }, [active, step, board]);

  return (
    <TutorialContext.Provider value={{
      active,
      step,
      startTutorial,
      skipTutorial,
      advanceStep,
      completeAction,
      actionCompleted,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
