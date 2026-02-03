import { ReactNode, DragEvent, useState } from 'react';
import { X, Columns, Maximize2, PanelLeft, PanelRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
 * Each pane shows the content of a tab (leftTabId, rightTabId).
 * Drop zones appear inside each pane during drag.
 */
export function SplitWorkspace({ renderPanelContent }: SplitWorkspaceProps) {
  const { tabs, split, disableSplit, draggingPanelId, openPanelInSplit, closeTab } = useTabs();

  if (!split.enabled) return null;

  const leftTab = tabs.find(t => t.id === split.leftTabId);
  const rightTab = tabs.find(t => t.id === split.rightTabId);

  return (
    <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      {/* Split header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Columns className="w-4 h-4" />
          Split View
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

      {/* 50/50 Split panes - REAL grid layout */}
      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700">
        {/* Left pane */}
        <SplitPane
          pane="left"
          tab={leftTab}
          renderPanelContent={renderPanelContent}
          onCloseTab={closeTab}
          draggingPanelId={draggingPanelId}
          onDrop={openPanelInSplit}
        />

        {/* Right pane */}
        <SplitPane
          pane="right"
          tab={rightTab}
          renderPanelContent={renderPanelContent}
          onCloseTab={closeTab}
          draggingPanelId={draggingPanelId}
          onDrop={openPanelInSplit}
        />
      </div>
    </div>
  );
}

interface SplitPaneProps {
  pane: 'left' | 'right';
  tab: ReturnType<typeof useTabs>['tabs'][0] | undefined;
  renderPanelContent: (panelType: string) => ReactNode;
  onCloseTab: (id: string) => void;
  draggingPanelId: PanelId | null;
  onDrop: (panelId: PanelId, title: string, pane: 'left' | 'right') => void;
}

function SplitPane({ pane, tab, renderPanelContent, onCloseTab, draggingPanelId, onDrop }: SplitPaneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = pane === 'left' ? PanelLeft : PanelRight;
  const label = pane === 'left' ? 'Left' : 'Right';

  const handleDragOver = (e: DragEvent) => {
    if (!draggingPanelId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const panelId = e.dataTransfer.getData('panelId') as PanelId;
    if (panelId) {
      onDrop(panelId, PANEL_TITLES[panelId] || panelId, pane);
    }
  };

  // If tab exists and has panel content
  if (tab && tab.panelType) {
    return (
      <div 
        className={cn(
          "relative bg-white dark:bg-slate-900 min-h-[300px]",
          isDragOver && "ring-2 ring-inset ring-primary bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pane header with label */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Icon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {tab.title}
            </span>
          </div>
          <button
            onClick={() => onCloseTab(tab.id)}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-auto">
          {renderPanelContent(tab.panelType)}
        </div>

        {/* Drop overlay during drag */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none">
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
        "relative bg-slate-50 dark:bg-slate-900/50 min-h-[300px] flex items-center justify-center",
        isDragOver && "bg-primary/10 ring-2 ring-inset ring-primary"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn(
        "flex flex-col items-center gap-2 text-muted-foreground transition-colors",
        isDragOver && "text-primary"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center",
          isDragOver ? "border-primary" : "border-muted-foreground/30"
        )}>
          {isDragOver ? (
            <Plus className="w-6 h-6" />
          ) : (
            <Icon className="w-6 h-6 opacity-50" />
          )}
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">{label} Pane</div>
          <div className="text-xs opacity-70">
            {isDragOver ? 'Drop to add here' : 'Drop a panel here'}
          </div>
        </div>
      </div>
    </div>
  );
}
