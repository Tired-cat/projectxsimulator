import { ReactNode, DragEvent, useState } from 'react';
import { X, Maximize2, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTabs } from '@/contexts/TabContext';
import { cn } from '@/lib/utils';
import type { PanelId } from '@/types/workspaceTypes';

interface SplitWorkspaceProps {
  renderPanelContent: (panelType: string) => ReactNode;
}

const PANEL_TITLES: Record<PanelId, string> = {
  'channel-performance': 'Channel Performance',
  'product-mix': 'Product Mix',
  'goal-tracker': 'Goal Tracker',
  'hints': 'Hints & Tips',
  'assumptions': 'Assumptions',
};

/**
 * Real 50/50 split workspace that renders two panes side-by-side.
 * Replaces the grid when active - this IS the view, not an addition.
 */
export function SplitWorkspace({ renderPanelContent }: SplitWorkspaceProps) {
  const { split, disableSplit, draggingPanelId, openPanelInSplit } = useTabs();

  return (
    <div className="h-full flex flex-col rounded-lg border border-border overflow-hidden bg-card">
      {/* Split header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PanelLeft className="w-4 h-4" />
          Comparison View
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disableSplit}
          className="h-7 px-2 text-xs"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          Close Split
        </Button>
      </div>

      {/* 50/50 Split panes */}
      <div className="flex-1 grid grid-cols-2 gap-px bg-border overflow-hidden">
        {/* Left pane - primary */}
        <SplitPane
          pane="left"
          panelId={split.leftPanelId}
          renderPanelContent={renderPanelContent}
          draggingPanelId={draggingPanelId}
          onDrop={openPanelInSplit}
        />

        {/* Right pane - comparison */}
        <SplitPane
          pane="right"
          panelId={split.rightPanelId}
          renderPanelContent={renderPanelContent}
          draggingPanelId={draggingPanelId}
          onDrop={openPanelInSplit}
        />
      </div>
    </div>
  );
}

interface SplitPaneProps {
  pane: 'left' | 'right';
  panelId: PanelId | null;
  renderPanelContent: (panelType: string) => ReactNode;
  draggingPanelId: PanelId | null;
  onDrop: (panelId: PanelId, title: string, pane: 'left' | 'right') => void;
}

function SplitPane({ pane, panelId, renderPanelContent, draggingPanelId, onDrop }: SplitPaneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = pane === 'left' ? PanelLeft : PanelRight;
  const label = pane === 'left' ? 'Primary' : 'Comparison';
  const title = panelId ? PANEL_TITLES[panelId] : null;

  const handleDragOver = (e: DragEvent) => {
    if (!draggingPanelId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedPanelId = e.dataTransfer.getData('panelId') as PanelId;
    if (droppedPanelId) {
      onDrop(droppedPanelId, PANEL_TITLES[droppedPanelId] || droppedPanelId, pane);
    }
  };

  // If panel is assigned, show its content
  if (panelId) {
    return (
      <div 
        className={cn(
          "relative flex flex-col h-full bg-card overflow-hidden",
          isDragOver && "ring-2 ring-inset ring-primary bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pane header with label */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {label}: {title}
            </span>
          </div>
        </div>
        
        {/* Content - scrollable */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {renderPanelContent(panelId)}
          </div>
        </ScrollArea>

        {/* Drop overlay during drag */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none z-10">
            <div className="flex flex-col items-center gap-1 text-primary">
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">Replace {label}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty pane - show drop zone
  return (
    <div
      className={cn(
        "relative h-full flex items-center justify-center bg-muted/30",
        isDragOver && "bg-primary/10 ring-2 ring-inset ring-primary"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn(
        "flex flex-col items-center gap-3 text-muted-foreground transition-colors",
        isDragOver && "text-primary"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center",
          isDragOver ? "border-primary" : "border-muted-foreground/30"
        )}>
          <Icon className="w-6 h-6 opacity-50" />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">{label} Pane</div>
          <div className="text-xs opacity-70">
            {isDragOver ? 'Drop to add here' : 'Drag a panel here'}
          </div>
        </div>
      </div>
    </div>
  );
}
