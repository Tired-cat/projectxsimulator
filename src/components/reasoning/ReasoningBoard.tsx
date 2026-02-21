import { useState, useCallback } from 'react';
import { X, GripVertical, FlaskConical } from 'lucide-react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { REASONING_BLOCKS, getSmartInsight } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { cn } from '@/lib/utils';

export function ReasoningBoard() {
  const { board, addChip, removeChip, moveChip, draggingChip } = useReasoningBoard();
  const [hoveredBlock, setHoveredBlock] = useState<ReasoningBlockId | null>(null);
  // Track which chip is being dragged within the board (for inter-block moves)
  const [internalDrag, setInternalDrag] = useState<{
    chip: EvidenceChip;
    fromBlock: ReasoningBlockId;
  } | null>(null);

  const totalChips = Object.values(board).reduce((s, arr) => s + arr.length, 0);

  const handleBlockDragOver = useCallback((e: React.DragEvent, blockId: ReasoningBlockId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setHoveredBlock(blockId);
  }, []);

  const handleBlockDragLeave = useCallback(() => {
    setHoveredBlock(null);
  }, []);

  const handleBlockDrop = useCallback((e: React.DragEvent, blockId: ReasoningBlockId) => {
    e.preventDefault();
    setHoveredBlock(null);

    // Internal board move
    if (internalDrag) {
      moveChip(internalDrag.fromBlock, blockId, internalDrag.chip.id);
      setInternalDrag(null);
      return;
    }

    // Drop from dashboard
    const raw = e.dataTransfer.getData('application/evidence-chip');
    if (raw) {
      try {
        const chip: EvidenceChip = JSON.parse(raw);
        addChip(blockId, chip);
      } catch { /* ignore */ }
    }
  }, [internalDrag, addChip, moveChip]);

  const handleChipDragStart = useCallback((
    e: React.DragEvent,
    chip: EvidenceChip,
    fromBlock: ReasoningBlockId
  ) => {
    setInternalDrag({ chip, fromBlock });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/evidence-chip', JSON.stringify(chip));
  }, []);

  const handleChipDragEnd = useCallback(() => {
    setInternalDrag(null);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Reasoning Board</h2>
            <p className="text-xs text-muted-foreground">
              Drag evidence from Channel Performance into the blocks below
            </p>
          </div>
          {totalChips > 0 && (
            <div className="ml-auto px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              {totalChips} {totalChips === 1 ? 'chip' : 'chips'}
            </div>
          )}
        </div>

        {/* Instructions hint */}
        {totalChips === 0 && (
          <div className="mt-4 p-3 bg-muted/50 border border-dashed border-border rounded-lg text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              🧪 Click <strong>Reason</strong> on <strong>Channel Performance</strong> or <strong>Product Mix</strong>, then drag a bar or pie segment here
            </p>
            <p className="text-xs text-muted-foreground">
              — or hover over any KPI value in <strong>My Decisions</strong> and drag it here
            </p>
          </div>
        )}
      </div>

      {/* 4 reasoning blocks */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">
        {REASONING_BLOCKS.map((block) => {
          const chips = board[block.id];
          const isHovered = hoveredBlock === block.id && (draggingChip !== null || internalDrag !== null);

          return (
            <div
              key={block.id}
              className={cn(
                'flex flex-col rounded-xl border-2 transition-all duration-150 min-h-[200px]',
                isHovered
                  ? 'border-dashed scale-[1.01] shadow-lg'
                  : 'border-border/60'
              )}
              style={{
                backgroundColor: isHovered ? block.bgColor : 'hsl(var(--card))',
                borderColor: isHovered ? block.color : undefined,
              }}
              onDragOver={(e) => handleBlockDragOver(e, block.id)}
              onDragLeave={handleBlockDragLeave}
              onDrop={(e) => handleBlockDrop(e, block.id)}
            >
              {/* Block header */}
              <div
                className="flex-shrink-0 px-4 pt-3 pb-2 rounded-t-xl border-b border-border/40"
                style={{ backgroundColor: block.bgColor }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold" style={{ color: block.color }}>
                      {block.title}
                    </div>
                    <div className="text-xs text-muted-foreground italic">
                      {block.question}
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <div
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: block.color + '20', color: block.color }}
                    >
                      {chips.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Drop zone / chip list */}
              <div className="flex-1 p-3 space-y-2">
                {chips.length === 0 ? (
                  <div
                    className={cn(
                      'h-full min-h-[100px] flex items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground transition-colors',
                      isHovered ? 'border-current' : 'border-border/40'
                    )}
                    style={isHovered ? { borderColor: block.color, color: block.color } : undefined}
                  >
                    {isHovered ? '↓ Drop evidence here' : 'Drop evidence here'}
                  </div>
                ) : (
                  chips.map((chip) => (
                    <ChipCard
                      key={chip.id}
                      chip={chip}
                      blockId={block.id}
                      blockColor={block.color}
                      onRemove={() => removeChip(block.id, chip.id)}
                      onDragStart={(e) => handleChipDragStart(e, chip, block.id)}
                      onDragEnd={handleChipDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Individual chip card inside the board
function ChipCard({
  chip,
  blockId,
  blockColor,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  chip: EvidenceChip;
  blockId: ReasoningBlockId;
  blockColor: string;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const insight = getSmartInsight(chip, blockId);
  const isDelta = chip.chipKind === 'delta-increase' || chip.chipKind === 'delta-decrease';
  const isIncrease = chip.chipKind === 'delta-increase';
  const isDecrease = chip.chipKind === 'delta-decrease';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex items-start gap-2 p-2.5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Drag handle */}
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 flex-shrink-0" />

      {/* Chip content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isDelta && (
            <span className={`text-xs ${isIncrease ? 'text-green-600' : 'text-red-500'}`}>
              {isIncrease ? '▲' : '▼'}
            </span>
          )}
          <span className="text-xs font-semibold text-foreground truncate">{chip.label}:</span>
          <span className="text-xs font-bold flex-shrink-0" style={{ color: blockColor }}>
            {chip.value}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{chip.context}</div>
        {/* Smart insight */}
        {insight && (
          <div className={`mt-1.5 px-2 py-1 rounded text-[10px] font-medium ${
            isIncrease ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
            isDecrease ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
            'bg-primary/10 text-primary'
          }`}>
            💡 {insight}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
