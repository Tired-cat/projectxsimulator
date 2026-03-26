import { useState, useCallback, useMemo } from 'react';
import { X, GripVertical, FlaskConical, Check, Lock, AlertTriangle, CircleCheck } from 'lucide-react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import {
  REASONING_BLOCKS,
  BLOCK_PREREQUISITE,
  getSmartInsight,
  parseEvidenceChip,
  validateReasoningBoard,
} from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import { cn } from '@/lib/utils';
import { ReasoningNarrative } from './ReasoningNarrative';

const BLOCK_TITLE_MAP: Record<ReasoningBlockId, string> = {
  descriptive: 'Descriptive',
  diagnostic: 'Diagnostic',
  predictive: 'Predictive',
  prescriptive: 'Prescriptive',
};

export function ReasoningBoard() {
  const { board, addChip, removeChip, moveChip, contextualiseChip, draggingChip } = useReasoningBoard();
  const [hoveredBlock, setHoveredBlock] = useState<ReasoningBlockId | null>(null);
  const [internalDrag, setInternalDrag] = useState<{
    chip: EvidenceChip;
    fromBlock: ReasoningBlockId;
  } | null>(null);
  const [validationDismissed, setValidationDismissed] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  const totalChips = Object.values(board).reduce((s, arr) => s + arr.length, 0);
  const validation = useMemo(() => validateReasoningBoard(board), [board]);

  const isBlockUnlocked = useCallback((blockId: ReasoningBlockId) => {
    const prerequisite = BLOCK_PREREQUISITE[blockId];
    if (!prerequisite) return true;
    return board[prerequisite].length > 0;
  }, [board]);

  const getLockMessage = useCallback((blockId: ReasoningBlockId) => {
    const prerequisite = BLOCK_PREREQUISITE[blockId];
    if (!prerequisite) return null;
    return `Complete ${BLOCK_TITLE_MAP[prerequisite]} first.`;
  }, []);

  const handleBlockDragOver = useCallback((e: React.DragEvent, blockId: ReasoningBlockId) => {
    if (!isBlockUnlocked(blockId)) {
      setHoveredBlock(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setHoveredBlock(blockId);
  }, [isBlockUnlocked]);

  const handleBlockDragLeave = useCallback(() => {
    setHoveredBlock(null);
  }, []);

  const handleBlockDrop = useCallback((e: React.DragEvent, blockId: ReasoningBlockId) => {
    e.preventDefault();
    setHoveredBlock(null);

    if (!isBlockUnlocked(blockId)) return;

    if (internalDrag) {
      moveChip(internalDrag.fromBlock, blockId, internalDrag.chip.id);
      setInternalDrag(null);
      return;
    }

    const raw = e.dataTransfer.getData('application/evidence-chip');
    const chip = parseEvidenceChip(raw);
    if (chip) {
      addChip(blockId, chip);
    }
  }, [internalDrag, addChip, moveChip, isBlockUnlocked]);

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
    const chip = parseEvidenceChip(raw);
    if (chip) {
      contextualiseChip(blockId, targetChipId, chip);
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
              Fill in order: Descriptive, Diagnostic, Predictive, Prescriptive
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
              Click <strong>Reason</strong> on <strong>Channel Performance</strong> or <strong>Product Mix</strong>, then drag evidence here.
            </p>
            <p className="text-xs text-muted-foreground">
              Unlock blocks in sequence to build a valid reasoning chain.
            </p>
          </div>
        )}

        {totalChips > 0 && !validationDismissed && (
          <div
            data-testid="reasoning-validation"
            className={cn(
              'mt-3 px-2.5 py-1.5 rounded-md border text-[10px]',
              validation.isValid
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            <div className="flex items-center gap-1.5">
              {validation.isValid ? (
                <CircleCheck className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="font-semibold">
                {validation.isValid ? 'Reasoning chain complete' : 'Reasoning chain needs fixes'}
              </span>
              <button
                onClick={() => setShowValidationDetails(prev => !prev)}
                className="ml-auto underline underline-offset-2 hover:opacity-80"
              >
                {showValidationDetails ? 'Hide checks' : 'View checks'}
              </button>
              <button
                onClick={() => setValidationDismissed(true)}
                className="hover:opacity-80"
                title="Dismiss validation banner"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {showValidationDetails && (
              <div className="mt-1 space-y-0.5">
                {validation.errors.slice(0, 2).map((error, index) => (
                  <p key={`error-${index}`}>- {error}</p>
                ))}
                {validation.warnings.slice(0, 2).map((warning, index) => (
                  <p key={`warning-${index}`}>- {warning}</p>
                ))}
                {(validation.errors.length > 2 || validation.warnings.length > 2) && (
                  <p>+ additional checks hidden</p>
                )}
              </div>
            )}
          </div>
        )}

        {totalChips > 0 && validationDismissed && (
          <button
            onClick={() => setValidationDismissed(false)}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold',
              validation.isValid
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            {validation.isValid ? <CircleCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Show reasoning checks
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* 4 reasoning blocks */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {REASONING_BLOCKS.map((block) => {
              const chips = board[block.id];
              const isUnlocked = isBlockUnlocked(block.id);
              const lockMessage = getLockMessage(block.id);
              const isHovered = isUnlocked && hoveredBlock === block.id && (draggingChip !== null || internalDrag !== null);

              return (
                <div
                  key={block.id}
                  className={cn(
                    'flex flex-col rounded-xl border-2 transition-all duration-150 min-h-[140px]',
                    isHovered
                      ? 'border-dashed scale-[1.01] shadow-lg'
                      : 'border-border/60',
                    !isUnlocked && chips.length === 0 && 'opacity-75'
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
                      {!isUnlocked && chips.length === 0 ? (
                        <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </div>
                      ) : chips.length > 0 ? (
                        <div
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: block.color + '20', color: block.color }}
                        >
                          {chips.length}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Drop zone / chip list */}
                  <div className="flex-1 p-2 space-y-1.5">
                    {chips.length === 0 ? (
                      <div
                        className={cn(
                          'h-full min-h-[60px] flex flex-col items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground transition-colors gap-1 px-2',
                          isHovered ? 'border-current' : 'border-border/40'
                        )}
                        style={isHovered ? { borderColor: block.color, color: block.color } : undefined}
                      >
                        {isUnlocked ? (
                          <>
                            <span>{isHovered ? 'Drop evidence here' : 'Drop evidence here'}</span>
                            <span className="text-muted-foreground/50 italic text-[9px]">You can add multiple pieces of evidence here</span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              {lockMessage}
                            </span>
                            <span className="text-muted-foreground/50 italic text-[9px]">Fill blocks in sequence.</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {chips.map((chip, index) => (
                          <ChipCard
                            key={chip.id}
                            chip={chip}
                            blockId={block.id}
                            blockColor={block.color}
                            onRemove={() => removeChip(block.id, chip.id)}
                            onDragStart={(e) => handleChipDragStart(e, chip, block.id)}
                            onDragEnd={handleChipDragEnd}
                            onContextualiseDrop={(e) => handleContextualiseDrop(e, block.id, chip.id)}
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
}: {
  chip: EvidenceChip;
  blockId: ReasoningBlockId;
  blockColor: string;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onContextualiseDrop: (e: React.DragEvent) => void;
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
              {insight}
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
            ? 'Drop to contextualise'
            : 'Contextualise this - drag another bar here to support or explain this observation.'}
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
