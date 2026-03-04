import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useTabs } from './TabContext';
import { useReasoningBoard } from './ReasoningBoardContext';

export type TutorialStep = 1 | 2 | 3;

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

  const { split, openTab } = useTabs();
  const { board } = useReasoningBoard();

  const startTutorial = useCallback(() => {
    // Navigate to decisions tab so the UI is visible
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
    if (step < 3) {
      const next = (step + 1) as TutorialStep;
      setStep(next);
      // Step 2 needs decisions view, step 3 needs reasoning board
      if (next === 3) {
        openTab('reasoning');
      }
    } else {
      // Tutorial complete
      setActive(false);
      setStep(1);
      openTab('home');
    }
  }, [step, openTab]);

  const completeAction = useCallback(() => {
    setActionCompleted(true);
  }, []);

  // Step 1: watch for split view activation
  useEffect(() => {
    if (!active || step !== 1) return;
    if (split.enabled) {
      setActionCompleted(true);
    }
  }, [active, step, split.enabled]);

  // Step 2: watch for any chip added to the board
  useEffect(() => {
    if (!active || step !== 2) return;
    const totalChips = Object.values(board).reduce((s, arr) => s + arr.length, 0);
    if (totalChips > 0) {
      setActionCompleted(true);
    }
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
