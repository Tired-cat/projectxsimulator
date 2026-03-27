/**
 * EvidenceHandle — wraps any displayed value and makes it draggable as an evidence chip.
 * Uses @dnd-kit/core for reliable cross-browser drag interactions.
 */
import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { getExternalChipDragId } from '@/lib/evidenceDnd';
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
  const [isHovered, setIsHovered] = useState(false);

  const payload = useMemo(() => ({
    label,
    value,
    context,
    sourceId,
  }), [label, value, context, sourceId]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: getExternalChipDragId(sourceId, label),
    data: {
      kind: 'external-chip',
      payload,
    },
  });

  const draggableStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative group cursor-grab active:cursor-grabbing select-none rounded-md transition-all duration-150',
        isDragging && 'opacity-50 ring-2 ring-primary/50',
        isHovered && !isDragging && 'ring-1 ring-primary/30 bg-primary/5',
        className
      )}
      style={draggableStyle}
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
