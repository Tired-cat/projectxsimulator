import { ReactNode, DragEvent, useState } from 'react';
import { Plus, PanelRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  onAddAsTab: (panelId: PanelId, title: string) => void;
  onOpenInSplit: (panelId: PanelId, title: string) => void;
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
  onAddAsTab,
  onOpenInSplit,
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
      isDragging && 'opacity-50 ring-2 ring-primary'
    )}>
      <CardHeader className={cn('pb-2', headerClassName)}>
        <CardTitle className="flex items-center gap-2 text-base">
          {/* Drag handle - only this part is draggable */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <DragHandle />
          </div>
          <span className="text-primary">{icon}</span>
          <span className="flex-1 truncate">{title}</span>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddAsTab(panelId, title)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add as tab (does not switch view)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onOpenInSplit(panelId, title)}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in Split (Right)</TooltipContent>
            </Tooltip>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
