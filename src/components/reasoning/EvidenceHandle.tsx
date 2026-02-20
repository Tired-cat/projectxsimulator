/**
 * EvidenceHandle — wraps any displayed value and makes it draggable as an evidence chip.
 * Uses the HTML5 Drag & Drop API. On drag start it serializes an EvidenceChip to
 * dataTransfer so any ReasoningBlock drop zone can consume it.
 */
import { useState, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { createEvidenceChip } from '@/types/evidenceChip';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { cn } from '@/lib/utils';

interface EvidenceHandleProps {
  /** Short label shown on the chip, e.g. "TikTok Views" */
  label: string;
  /** Formatted display value, e.g. "18,000" or "$71,360" */
  value: string;
  /** Context string shown as subtitle on chip, e.g. "Views • Channel Performance" */
  context: string;
  /** Stable ID for the source, e.g. "tiktok-clicks" */
  sourceId: string;
  children: React.ReactNode;
  className?: string;
}

export function EvidenceHandle({
  label,
  value,
  context,
  sourceId,
  children,
  className,
}: EvidenceHandleProps) {
  const { setDraggingChip } = useReasoningBoard();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const chip = createEvidenceChip(label, value, context, sourceId);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/evidence-chip', JSON.stringify(chip));
    setDraggingChip(chip);
    setIsDragging(true);
  }, [label, value, context, sourceId, setDraggingChip]);

  const handleDragEnd = useCallback(() => {
    setDraggingChip(null);
    setIsDragging(false);
  }, [setDraggingChip]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative group cursor-grab active:cursor-grabbing select-none rounded-md transition-all duration-150',
        isDragging && 'opacity-50 ring-2 ring-primary/50',
        isHovered && !isDragging && 'ring-1 ring-primary/30 bg-primary/5',
        className
      )}
      title={`Drag "${label}: ${value}" to Reasoning Board`}
    >
      {/* Subtle grab indicator — only visible on hover */}
      {isHovered && !isDragging && (
        <div className="absolute -top-1 -right-1 z-20 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md pointer-events-none">
          <GripVertical className="h-2.5 w-2.5" />
        </div>
      )}
      {children}
    </div>
  );
}
