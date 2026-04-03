import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { isDuplicateChip } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId, ReasoningBoardState } from '@/types/evidenceChip';

interface ReasoningBoardContextValue {
  board: ReasoningBoardState;
  addChip: (blockId: ReasoningBlockId, chip: EvidenceChip) => void;
  removeChip: (blockId: ReasoningBlockId, chipId: string) => void;
  moveChip: (fromBlock: ReasoningBlockId, toBlock: ReasoningBlockId, chipId: string) => void;
  contextualiseChip: (blockId: ReasoningBlockId, targetChipId: string, contextChip: EvidenceChip) => void;
  updateChipAnnotation: (blockId: ReasoningBlockId, chipId: string, annotation: string) => void;
  clearBoard: () => void;
  draggingChip: EvidenceChip | null;
  setDraggingChip: (chip: EvidenceChip | null) => void;
  reasonMode: boolean;
  toggleReasonMode: () => void;
  writtenDiagnosis: string;
  setWrittenDiagnosis: (val: string) => void;
  loadBoard: (state: ReasoningBoardState, diagnosis: string) => void;
}

const ReasoningBoardContext = createContext<ReasoningBoardContextValue | null>(null);

const EMPTY_BOARD: ReasoningBoardState = {
  descriptive: [],
  diagnostic: [],
  predictive: [],
  prescriptive: [],
};

export function ReasoningBoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<ReasoningBoardState>(EMPTY_BOARD);
  const [draggingChip, setDraggingChip] = useState<EvidenceChip | null>(null);
  const [reasonMode, setReasonMode] = useState(false);
  const [writtenDiagnosis, setWrittenDiagnosis] = useState('');

  const toggleReasonMode = useCallback(() => {
    setReasonMode(prev => !prev);
  }, []);

  const loadBoard = useCallback((state: ReasoningBoardState, diagnosis: string) => {
    setBoard(state);
    setWrittenDiagnosis(diagnosis);
  }, []);
  const addChip = useCallback((blockId: ReasoningBlockId, chip: EvidenceChip) => {
    setBoard(prev => {
      if (isDuplicateChip(prev[blockId], chip)) return prev;
      return {
        ...prev,
        [blockId]: [...prev[blockId], chip],
      };
    });
  }, []);

  const removeChip = useCallback((blockId: ReasoningBlockId, chipId: string) => {
    setBoard(prev => {
      const chip = prev[blockId].find(c => c.id === chipId);
      if (chip) {
        window.dispatchEvent(new CustomEvent('board:remove-chip', {
          detail: { evidenceId: chip.sourceId, quadrant: blockId },
        }));
      }
      return {
        ...prev,
        [blockId]: prev[blockId].filter(c => c.id !== chipId),
      };
    });
  }, []);

  const moveChip = useCallback((fromBlock: ReasoningBlockId, toBlock: ReasoningBlockId, chipId: string) => {
    setBoard(prev => {
      const chip = prev[fromBlock].find(c => c.id === chipId);
      if (!chip || fromBlock === toBlock) return prev;
      const fromList = prev[fromBlock].filter(c => c.id !== chipId);
      if (isDuplicateChip(prev[toBlock], chip)) {
        return {
          ...prev,
          [fromBlock]: fromList,
        };
      }
      return {
        ...prev,
        [fromBlock]: fromList,
        [toBlock]: [...prev[toBlock], chip],
      };
    });
  }, []);

  const contextualiseChip = useCallback((blockId: ReasoningBlockId, targetChipId: string, contextChip: EvidenceChip) => {
    setBoard(prev => ({
      ...prev,
      [blockId]: prev[blockId].map(c => {
        if (c.id !== targetChipId) return c;
        const existing = c.contextChips ?? (c.contextChip ? [c.contextChip] : []);
        // Prevent duplicate context chips by sourceId
        if (existing.some(ec => ec.sourceId === contextChip.sourceId)) return c;
        const updated = [...existing, contextChip];
        return { ...c, contextChips: updated, contextChip: updated[0] };
      }),
    }));
  }, []);

  const clearBoard = useCallback(() => {
    setBoard(prev => {
      const totalCards = Object.values(prev).reduce((s, arr) => s + arr.length, 0);
      window.dispatchEvent(new CustomEvent('board:clear', { detail: { cardsCleared: totalCards } }));
      return EMPTY_BOARD;
    });
    setWrittenDiagnosis('');
  }, []);

  return (
    <ReasoningBoardContext.Provider value={{
      board,
      addChip,
      removeChip,
      moveChip,
      contextualiseChip,
      clearBoard,
      draggingChip,
      setDraggingChip,
      reasonMode,
      toggleReasonMode,
      writtenDiagnosis,
      setWrittenDiagnosis,
      loadBoard,
    }}>
      {children}
    </ReasoningBoardContext.Provider>
  );
}

export function useReasoningBoard() {
  const ctx = useContext(ReasoningBoardContext);
  if (!ctx) throw new Error('useReasoningBoard must be used within ReasoningBoardProvider');
  return ctx;
}
