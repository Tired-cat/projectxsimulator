import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { X, GripVertical, FlaskConical, Trash2, Pencil } from 'lucide-react';
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
      <div className="flex-shrink-0 px-4 py-4 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Reasoning Board</h2>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Keep evidence tidy across the four blocks; your narrative updates live below.
            </p>
          </div>
          {totalChips > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="px-3 py-1 bg-muted text-foreground text-[11px] font-semibold rounded-full border border-border">
                {totalChips} {totalChips === 1 ? 'chip' : 'chips'}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="px-2 py-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-border" title="Clear all cards">
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
          <div className="mt-4 p-3 bg-muted/40 border border-dashed border-border rounded-lg text-center space-y-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
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
                          'flex flex-col rounded-lg border border-border/70 bg-card/90 shadow-sm transition-all duration-150 min-h-[150px]',
                          isHovered && 'shadow-md border-border'
                        )}
                        style={{
                          backgroundColor: isHovered ? block.bgColor : 'hsl(var(--card))',
                          borderColor: isHovered ? block.color : undefined,
                        }}
                      >
                  {/* Block header */}
                  <div
                    className="flex-shrink-0 px-3 pt-2 pb-1.5 rounded-t-lg border-b border-border/50"
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
<<<<<<< HEAD
                          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: block.color }}>
                            <BlockIcon className="w-3 h-3 flex-shrink-0" />
=======
                          <div className="text-xs font-bold" style={{ color: block.color }}>
>>>>>>> main
                            {block.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate leading-snug">
                            {block.question}
                          </div>
                        </div>
                      </div>
                      {chips.length > 0 ? (
                        <div
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-background border border-border/70"
                          style={{ color: block.color, borderColor: block.color + '30' }}
                        >
                          {chips.length}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Drop zone / chip list */}
                  <div className="flex-1 p-3 space-y-1.5">
                    {chips.length === 0 ? (
                      <div
                        className={cn(
                          'h-full min-h-[64px] flex flex-col items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground transition-colors gap-1 px-2 bg-muted/30',
                          isHovered ? 'border-current' : 'border-border/50'
                        )}
                        style={isHovered ? { borderColor: block.color, color: block.color } : undefined}
                      >
                        <span>Drop evidence here</span>
<<<<<<< HEAD
                        {BLOCK_EMPTY_HINTS[block.id] && (
                          <span className="text-muted-foreground/60 text-[9px] font-medium">{BLOCK_EMPTY_HINTS[block.id]}</span>
                        )}
                        <span className="text-muted-foreground/50 text-[9px]">Multiple items welcome</span>
=======
                        <span className="text-muted-foreground/50 italic text-[9px]">You can add multiple pieces of evidence here</span>
>>>>>>> main
                        {block.id === 'predictive' && (
                          <span className="text-muted-foreground/60 text-[9px] text-center mt-0.5">
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
                            chipIndex={index}
                            onRemove={() => removeChip(block.id, chip.id)}
                          />
                        ))}
                        <div className="text-[9px] text-muted-foreground/55 text-center pt-0.5">
                          Add more to strengthen this block
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
          <div className="mt-6 pt-4 border-t border-border/60" data-tutorial="narrative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">My full reasoning story</span>
              <span className="text-[10px] text-muted-foreground">Updates automatically as you add evidence</span>
            </div>
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
  chipIndex,
  onRemove,
}: {
  chip: EvidenceChip;
  blockId: ReasoningBlockId;
  blockColor: string;
  chipIndex: number;
  onRemove: () => void;
}) {
  const { updateChipAnnotation } = useReasoningBoard();
  const canAnnotate = chipIndex < 2;
  const insight = getSmartInsight(chip, blockId);
  const isDelta = chip.chipKind === 'delta-increase' || chip.chipKind === 'delta-decrease';
  const isIncrease = chip.chipKind === 'delta-increase';
  const isDecrease = chip.chipKind === 'delta-decrease';

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

<<<<<<< HEAD
        {/* Annotation affordance — always visible */}
        {canAnnotate && (
          chip.annotation ? (
            <button
              onClick={(e) => { e.stopPropagation(); setAnnotating(p => !p); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Edit note"
              className="flex-shrink-0 p-0.5 rounded text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setAnnotating(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-primary bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors"
              title="Add your interpretation"
            >
              <Pencil className="h-3 w-3" />
              <span>Add note</span>
            </button>
          )
=======
        {/* Annotate button */}
        {canAnnotate && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAnnotation(p => !p); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Add my interpretation"
            className={cn(
              'flex-shrink-0 p-0.5 rounded transition-colors',
              chip.annotation
                ? 'text-primary'
                : 'text-muted-foreground/40 hover:text-primary'
            )}
          >
            <Pencil className="h-3 w-3" />
          </button>
>>>>>>> main
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Annotation popover */}
      {showAnnotation && canAnnotate && (
        <div
          className="px-2.5 pb-2 pt-1"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] text-muted-foreground/70 mb-1">
            Why does this data point matter? What does it tell you?
          </p>
          <textarea
            className="w-full text-[10px] rounded border border-border/60 bg-background px-2 py-1.5 resize-none focus:outline-none focus:border-primary/50 leading-relaxed"
            rows={2}
            maxLength={160}
            placeholder="My interpretation..."
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 150))}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-[9px] text-muted-foreground/50">{150 - draft.length} chars left</span>
            <button
              className="text-[9px] text-primary hover:underline"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateChipAnnotation(blockId, chip.id, draft.trim());
                setShowAnnotation(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Annotation preview */}
      {chip.annotation && !showAnnotation && (
        <div
          className="mx-2.5 mb-1.5 px-2 py-1 rounded bg-primary/5 border border-primary/20 text-[10px] text-foreground/70 italic leading-snug cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowAnnotation(true); }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Click to edit"
        >
          "{chip.annotation.length > 60 ? chip.annotation.slice(0, 60) + '…' : chip.annotation}"
        </div>
      )}

    </div>
  );
}
