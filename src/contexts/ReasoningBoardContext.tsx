import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { EvidenceChip, ReasoningBlockId, ReasoningBoardState } from '@/types/evidenceChip';

interface ReasoningBoardContextValue {
  board: ReasoningBoardState;
  addChip: (blockId: ReasoningBlockId, chip: EvidenceChip) => void;
  removeChip: (blockId: ReasoningBlockId, chipId: string) => void;
  moveChip: (fromBlock: ReasoningBlockId, toBlock: ReasoningBlockId, chipId: string) => void;
  contextualiseChip: (blockId: ReasoningBlockId, targetChipId: string, contextChip: EvidenceChip) => void;
  draggingChip: EvidenceChip | null;
  setDraggingChip: (chip: EvidenceChip | null) => void;
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

  const addChip = useCallback((blockId: ReasoningBlockId, chip: EvidenceChip) => {
    setBoard(prev => ({
      ...prev,
      [blockId]: [...prev[blockId], chip],
    }));
  }, []);

  const removeChip = useCallback((blockId: ReasoningBlockId, chipId: string) => {
    setBoard(prev => ({
      ...prev,
      [blockId]: prev[blockId].filter(c => c.id !== chipId),
    }));
  }, []);

  const moveChip = useCallback((fromBlock: ReasoningBlockId, toBlock: ReasoningBlockId, chipId: string) => {
    setBoard(prev => {
      const chip = prev[fromBlock].find(c => c.id === chipId);
      if (!chip || fromBlock === toBlock) return prev;
      return {
        ...prev,
        [fromBlock]: prev[fromBlock].filter(c => c.id !== chipId),
        [toBlock]: [...prev[toBlock], chip],
      };
    });
  }, []);

  const contextualiseChip = useCallback((blockId: ReasoningBlockId, targetChipId: string, contextChip: EvidenceChip) => {
    setBoard(prev => ({
      ...prev,
      [blockId]: prev[blockId].map(c =>
        c.id === targetChipId ? { ...c, contextChip } : c
      ),
    }));
  }, []);

  return (
    <ReasoningBoardContext.Provider value={{
      board,
      addChip,
      removeChip,
      moveChip,
      contextualiseChip,
      draggingChip,
      setDraggingChip,
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
