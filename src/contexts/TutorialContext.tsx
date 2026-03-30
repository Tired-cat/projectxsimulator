import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useTabs } from './TabContext';
import { useReasoningBoard } from './ReasoningBoardContext';

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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

  const { openTab } = useTabs();
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
    if (step < 8) {
      const next = (step + 1) as TutorialStep;
      setStep(next);

      // Close compare mode before steps that need a clean single-chart layout
      if (next === 4 || next === 6) {
        window.dispatchEvent(new Event('tutorial:close-compare'));
      }

      // Navigate to the right tab for each step
      if (next === 5) {
        // Show the reasoning board so students see the 4 quadrants
        openTab('reasoning');
      } else if (next === 6) {
        // Go back to decisions so the Reason button and chart are visible
        openTab('decisions');
      } else if (next === 7) {
        // Show the narrative that was built from evidence
        openTab('reasoning');
      }
      // Steps 1–4 and 8 stay on whatever tab they're on (decisions or reasoning)
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

  // Step 1: watch for any budget adjustment
  useEffect(() => {
    if (!active || step !== 1) return;
    const onBudgetAdjusted = () => setActionCompleted(true);
    window.addEventListener('tutorial:budget-adjusted', onBudgetAdjusted as EventListener);
    return () => window.removeEventListener('tutorial:budget-adjusted', onBudgetAdjusted as EventListener);
  }, [active, step]);

  // Step 2: watch for view tab switch (away from Budget tab)
  useEffect(() => {
    if (!active || step !== 2) return;
    const onViewSwitched = () => setActionCompleted(true);
    window.addEventListener('tutorial:view-switched', onViewSwitched as EventListener);
    return () => window.removeEventListener('tutorial:view-switched', onViewSwitched as EventListener);
  }, [active, step]);

  // Step 4: watch for compare mode activation
  useEffect(() => {
    if (!active || step !== 4) return;
    const onCompareActivated = () => setActionCompleted(true);
    window.addEventListener('tutorial:compare-activated', onCompareActivated as EventListener);
    return () => window.removeEventListener('tutorial:compare-activated', onCompareActivated as EventListener);
  }, [active, step]);

  // Step 6: watch for any chip added to the reasoning board
  useEffect(() => {
    if (!active || step !== 6) return;
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
