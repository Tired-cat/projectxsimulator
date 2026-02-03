import { ReactNode, DragEvent, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DragHandle } from './DragHandle';
import type { PanelId } from '@/types/workspaceTypes';
import { cn } from '@/lib/utils';

interface DraggableCardProps {
  panelId: PanelId;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  onDragStart: (panelId: PanelId) => void;
  onDragEnd: () => void;
  headerClassName?: string;
  contentClassName?: string;
}

export function DraggableCard({
  panelId,
  title,
  icon,
  children,
  className,
  onDragStart,
  onDragEnd,
  headerClassName,
  contentClassName,
}: DraggableCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('panelId', panelId);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(panelId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  return (
    <Card className={cn(
      className,
      isDragging && 'opacity-50 ring-2 ring-blue-500'
    )}>
      <CardHeader className={cn('pb-2', headerClassName)}>
        <CardTitle className="flex items-center gap-2 text-base">
          {/* Drag handle - only this part is draggable */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <DragHandle />
          </div>
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
