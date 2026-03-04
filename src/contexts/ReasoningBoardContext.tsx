import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { EvidenceChip, ReasoningBlockId, ReasoningBoardState } from '@/types/evidenceChip';
import { generateNarrativeSentence } from '@/types/evidenceChip';

interface NarrativeEntry {
  id: string;
  text: string;
}

interface ReasoningBoardContextValue {
  board: ReasoningBoardState;
  addChip: (blockId: ReasoningBlockId, chip: EvidenceChip) => void;
  removeChip: (blockId: ReasoningBlockId, chipId: string) => void;
  moveChip: (fromBlock: ReasoningBlockId, toBlock: ReasoningBlockId, chipId: string) => void;
  draggingChip: EvidenceChip | null;
  setDraggingChip: (chip: EvidenceChip | null) => void;
  narrative: NarrativeEntry[];
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
  const [narrative, setNarrative] = useState<NarrativeEntry[]>([]);

  const appendNarrative = useCallback((chip: EvidenceChip, blockId: ReasoningBlockId) => {
    setNarrative(prev => {
      const sentence = generateNarrativeSentence(chip, blockId, prev.length);
      return [...prev, { id: `nar-${Date.now()}-${Math.random()}`, text: sentence }];
    });
  }, []);

  const addChip = useCallback((blockId: ReasoningBlockId, chip: EvidenceChip) => {
    setBoard(prev => ({
      ...prev,
      [blockId]: [...prev[blockId], chip],
    }));
    appendNarrative(chip, blockId);
  }, [appendNarrative]);

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

  return (
    <ReasoningBoardContext.Provider value={{
      board,
      addChip,
      removeChip,
      moveChip,
      draggingChip,
      setDraggingChip,
      narrative,
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
