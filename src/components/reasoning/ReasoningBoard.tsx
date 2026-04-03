import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { X, GripVertical, FlaskConical, Check, Trash2, Pencil } from 'lucide-react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  REASONING_BLOCKS,
  getSmartInsight,
} from '@/types/evidenceChip';
import type { EvidenceChip, ReasoningBlockId } from '@/types/evidenceChip';
import type { EvidenceDragData, EvidenceDropData } from '@/lib/evidenceDnd';
import {
  getBlockDropId,
  getBoardChipDragId,
  getContextDropId,
} from '@/lib/evidenceDnd';
import { cn } from '@/lib/utils';
import { ReasoningNarrative } from './ReasoningNarrative';


export function ReasoningBoard() {
  const { board, removeChip, clearBoard } = useReasoningBoard();
  const [activeDrag, setActiveDrag] = useState<EvidenceDragData | null>(null);

  const totalChips = Object.values(board).reduce((s, arr) => s + arr.length, 0);

  // activeDrag is no longer driven by useDndMonitor —
  // the DndContext onDragEnd in Index.tsx handles all dispatch.
  // We keep activeDrag for visual hover highlighting only.

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
              Drag evidence into any block to build your reasoning
            </p>
          </div>
          {totalChips > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                {totalChips} {totalChips === 1 ? 'chip' : 'chips'}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Clear all cards">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Reasoning Board?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {totalChips} evidence {totalChips === 1 ? 'card' : 'cards'} from your board. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearBoard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear Board
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {totalChips === 0 && (
          <div className="mt-4 p-3 bg-muted/50 border border-dashed border-border rounded-lg text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Click <strong>Reason</strong> on <strong>Channel Performance</strong> or <strong>Product Mix</strong>, then drag evidence here.
            </p>
            <p className="text-xs text-muted-foreground">
              Follow the order: Descriptive → Diagnostic → Prescriptive → Predictive.
            </p>
          </div>
        )}

      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* 4 reasoning blocks */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {REASONING_BLOCKS.map((block, blockIndex) => {
              const chips = board[block.id];
              const stepNumber = blockIndex + 1;

              return (
                <BlockDropContainer key={block.id} blockId={block.id}>
                  {({ setNodeRef, isOver }) => {
                    const isHovered = isOver && !!activeDrag;

                    return (
                      <div
                        ref={setNodeRef}
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
                      >
                  {/* Block header */}
                  <div
                    className="flex-shrink-0 px-3 pt-2 pb-1.5 rounded-t-xl border-b border-border/40"
                    style={{ backgroundColor: block.bgColor }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                          style={{ backgroundColor: block.color }}
                        >
                          {stepNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold" style={{ color: block.color }}>
                            {block.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground italic truncate">
                            {block.question}
                          </div>
                        </div>
                      </div>
                      {chips.length > 0 ? (
                        <div
                          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
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
                        <span>Drop evidence here</span>
                        <span className="text-muted-foreground/50 italic text-[9px]">You can add multiple pieces of evidence here</span>
                        {block.id === 'predictive' && (
                          <span className="text-muted-foreground/50 italic text-[9px] text-center mt-0.5">
                            Fill Prescriptive first — predicts what happens after your action
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {chips.map((chip, index) => (
                          <ChipCard
                            key={`${chip.id}-${index}`}
                            chip={chip}
                            blockId={block.id}
                            blockColor={block.color}
                            onRemove={() => removeChip(block.id, chip.id)}
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
                  }}
                </BlockDropContainer>
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

function BlockDropContainer({
  blockId,
  children,
}: {
  blockId: ReasoningBlockId;
  children: (props: { setNodeRef: (element: HTMLElement | null) => void; isOver: boolean }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getBlockDropId(blockId),
    data: {
      kind: 'reasoning-block',
      blockId,
    } satisfies EvidenceDropData,
  });

  return <>{children({ setNodeRef, isOver })}</>;
}

// Individual chip card inside the board
function ChipCard({
  chip,
  blockId,
  blockColor,
  onRemove,
}: {
  chip: EvidenceChip;
  blockId: ReasoningBlockId;
  blockColor: string;
  onRemove: () => void;
}) {
  const { updateChipAnnotation } = useReasoningBoard();
  const insight = getSmartInsight(chip, blockId);
  const isDelta = chip.chipKind === 'delta-increase' || chip.chipKind === 'delta-decrease';
  const isIncrease = chip.chipKind === 'delta-increase';
  const isDecrease = chip.chipKind === 'delta-decrease';
  const contextItems = chip.contextChips ?? (chip.contextChip ? [chip.contextChip] : []);
  const hasContext = contextItems.length > 0;

  const [showAnnotation, setShowAnnotation] = useState(false);
  const [draft, setDraft] = useState(chip.annotation ?? '');

  useEffect(() => {
    setDraft(chip.annotation ?? '');
  }, [chip.annotation]);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: getBoardChipDragId(blockId, chip.id),
    data: {
      kind: 'board-chip',
      chip,
      fromBlock: blockId,
    } satisfies EvidenceDragData,
  });

  const { setNodeRef: setContextDropRef, isOver: isContextOver } = useDroppable({
    id: getContextDropId(blockId, chip.id),
    data: {
      kind: 'context-target',
      blockId,
      targetChipId: chip.id,
    } satisfies EvidenceDropData,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'group flex flex-col bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-30'
      )}
    >
      <div className="flex items-start gap-2 p-2.5">
        {/* Drag handle */}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 flex-shrink-0" />

        {/* Chip content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isDelta && (
              <span className={`text-xs ${isIncrease ? 'text-emerald-600' : 'text-destructive'}`}>
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
              isIncrease ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
              isDecrease ? 'bg-destructive/10 text-destructive' :
              'bg-primary/10 text-primary'
            }`}>
              {insight}
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Contextualise zone — supports multiple context chips */}
      <div className="mx-2.5 mb-2 space-y-1">
        {contextItems.map((ctx, i) => (
          <div key={`${ctx.id}-${i}`} className="px-2 py-1.5 rounded border border-border bg-muted/30 text-[10px] flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            <span className="text-foreground/70 truncate">
              Contextualised with <strong>{ctx.label}</strong>
            </span>
          </div>
        ))}
        <div
          ref={setContextDropRef}
          className={cn(
            'px-2 py-1.5 rounded border border-dashed text-[10px] text-center transition-all',
            isContextOver
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border/50 text-muted-foreground/60'
          )}
        >
          {isContextOver
            ? 'Drop to contextualise'
            : hasContext
              ? '+ Add another supporting piece of evidence'
              : 'Contextualise this — drag another bar here to support or explain this observation.'}
        </div>
      </div>
    </div>
  );
}
