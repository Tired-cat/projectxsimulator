import { useState, useCallback } from 'react';
import { X, GripVertical, FlaskConical, Check } from 'lucide-react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { REASONING_BLOCKS, getSmartInsight } from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { cn } from '@/lib/utils';
import { ReasoningNarrative } from './ReasoningNarrative';

export function ReasoningBoard() {
  const { board, addChip, removeChip, moveChip, contextualiseChip, draggingChip } = useReasoningBoard();
  const [hoveredBlock, setHoveredBlock] = useState<ReasoningBlockId | null>(null);
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

    if (internalDrag) {
      moveChip(internalDrag.fromBlock, blockId, internalDrag.chip.id);
      setInternalDrag(null);
      return;
    }

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

  // Handle contextualise drop on a chip card
  const handleContextualiseDrop = useCallback((
    e: React.DragEvent,
    blockId: ReasoningBlockId,
    targetChipId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // If it's an internal drag (moving a chip between blocks), don't contextualise
    if (internalDrag) return;

    const raw = e.dataTransfer.getData('application/evidence-chip');
    if (raw) {
      try {
        const chip: EvidenceChip = JSON.parse(raw);
        contextualiseChip(blockId, targetChipId, chip);
      } catch { /* ignore */ }
    }
  }, [internalDrag, contextualiseChip]);

  return (
    <div className="h-full flex flex-col overflow-hidden" data-tutorial="reasoning-board">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">Reasoning Board</h2>
            <p className="text-[10px] text-muted-foreground truncate">
              Drag evidence from Channel Performance into the blocks below
            </p>
          </div>
          {totalChips > 0 && (
            <div className="ml-auto px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              {totalChips} {totalChips === 1 ? 'chip' : 'chips'}
            </div>
          )}
        </div>

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
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start">
        {REASONING_BLOCKS.map((block) => {
          const chips = board[block.id];
          const isHovered = hoveredBlock === block.id && (draggingChip !== null || internalDrag !== null);

          return (
            <div
              key={block.id}
              className={cn(
                'flex flex-col rounded-xl border-2 transition-all duration-150 min-h-[140px]',
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
                className="flex-shrink-0 px-3 pt-2 pb-1.5 rounded-t-xl border-b border-border/40"
                style={{ backgroundColor: block.bgColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-bold" style={{ color: block.color }}>
                      {block.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground italic truncate">
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
              <div className="flex-1 p-2 space-y-1.5">
                {chips.length === 0 ? (
                  <div
                    className={cn(
                      'h-full min-h-[60px] flex flex-col items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground transition-colors gap-1',
                      isHovered ? 'border-current' : 'border-border/40'
                    )}
                    style={isHovered ? { borderColor: block.color, color: block.color } : undefined}
                  >
                    <span>{isHovered ? '↓ Drop evidence here' : 'Drop evidence here'}</span>
                    <span className="text-muted-foreground/50 italic text-[9px]">You can add multiple pieces of evidence here</span>
                  </div>
                ) : (
                  <>
                  {chips.map((chip) => (
                    <ChipCard
                      key={chip.id}
                      chip={chip}
                      blockId={block.id}
                      blockColor={block.color}
                      onRemove={() => removeChip(block.id, chip.id)}
                      onDragStart={(e) => handleChipDragStart(e, chip, block.id)}
                      onDragEnd={handleChipDragEnd}
                      onContextualiseDrop={(e) => handleContextualiseDrop(e, block.id, chip.id)}
                      isDraggingExternal={draggingChip !== null || internalDrag !== null}
                    />
                  ))}
                  <div className="text-[9px] text-muted-foreground/40 italic text-center pt-0.5">
                    You can add multiple pieces of evidence here
                  </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative sections */}
      <div data-tutorial="narrative">
        <ReasoningNarrative />
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
  onContextualiseDrop,
  isDraggingExternal,
}: {
  chip: EvidenceChip;
  blockId: ReasoningBlockId;
  blockColor: string;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onContextualiseDrop: (e: React.DragEvent) => void;
  isDraggingExternal: boolean;
}) {
  const [contextHover, setContextHover] = useState(false);
  const insight = getSmartInsight(chip, blockId);
  const isDelta = chip.chipKind === 'delta-increase' || chip.chipKind === 'delta-decrease';
  const isIncrease = chip.chipKind === 'delta-increase';
  const isDecrease = chip.chipKind === 'delta-decrease';
  const hasContext = !!chip.contextChip;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex flex-col bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start gap-2 p-2.5">
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

      {/* Contextualise zone */}
      {!hasContext ? (
        <div
          className={cn(
            'mx-2.5 mb-2 px-2 py-1.5 rounded border border-dashed text-[10px] text-center transition-all',
            contextHover
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border/50 text-muted-foreground/60'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextHover(true);
          }}
          onDragLeave={() => setContextHover(false)}
          onDrop={(e) => {
            setContextHover(false);
            onContextualiseDrop(e);
          }}
        >
          {contextHover
            ? '↓ Drop to contextualise'
            : 'Contextualise this — drag another bar here to support or explain this observation.'}
        </div>
      ) : (
        <div className="mx-2.5 mb-2 px-2 py-1.5 rounded border border-border bg-muted/30 text-[10px] flex items-center gap-1.5">
          <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
          <span className="text-foreground/70 truncate">
            Contextualised with <strong>{chip.contextChip!.label}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
