import { ReactNode, DragEvent, useState } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTabs } from '@/contexts/TabContext';
import { cn } from '@/lib/utils';
import type { PanelId } from '@/types/workspaceTypes';

interface SplitWorkspaceProps {
  /**
   * Renders content for any tab.
   * Called with the tab object (or just its kind/panelType).
   * Must handle all tab kinds: home, decisions, reasoning, panel.
   */
  renderTabContent: (tabId: string) => ReactNode;
  renderPanelContent: (panelType: PanelId) => ReactNode;
}

/**
 * Real 50/50 split workspace that renders two panes side-by-side.
 * Works with ANY tab type — not just panel cards.
 * Replaces the single-tab content area when split is enabled.
 */
export function SplitWorkspace({ renderTabContent }: SplitWorkspaceProps) {
  const { split, draggingTabId, openTabInSplit, draggingPanelId } = useTabs();

  return (
    <div className="h-full grid grid-cols-2 gap-px bg-border overflow-hidden">
      <SplitPane
        pane="left"
        tabId={split.leftTabId}
        renderTabContent={renderTabContent}
        draggingTabId={draggingTabId}
        draggingPanelId={draggingPanelId}
        onDropTab={(tabId) => openTabInSplit(tabId, 'left')}
      />
      <SplitPane
        pane="right"
        tabId={split.rightTabId}
        renderTabContent={renderTabContent}
        draggingTabId={draggingTabId}
        draggingPanelId={draggingPanelId}
        onDropTab={(tabId) => openTabInSplit(tabId, 'right')}
      />
    </div>
  );
}

interface SplitPaneProps {
  pane: 'left' | 'right';
  tabId: string | null;
  renderTabContent: (tabId: string) => ReactNode;
  draggingTabId: string | null;
  draggingPanelId: PanelId | null;
  onDropTab: (tabId: string) => void;
}

function SplitPane({ pane, tabId, renderTabContent, draggingTabId, draggingPanelId, onDropTab }: SplitPaneProps) {
  const { tabs } = useTabs();
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = pane === 'left' ? PanelLeft : PanelRight;
  const label = pane === 'left' ? 'Left' : 'Right';

  // Find tab info for the header
  const activeTab = tabId ? tabs.find(t => t.id === tabId) : null;
  const isAnyDragging = !!draggingTabId || !!draggingPanelId;

  const handleDragOver = (e: DragEvent) => {
    if (!isAnyDragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Tab drag
    const droppedTabId = e.dataTransfer.getData('tabId');
    if (droppedTabId) {
      onDropTab(droppedTabId);
      return;
    }
  };

  if (tabId && activeTab) {
    return (
      <div
        className={cn(
          'relative flex flex-col h-full bg-card overflow-hidden',
          isDragOver && 'ring-2 ring-inset ring-primary bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pane label header */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">
            {label}: {activeTab.title}
          </span>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {renderTabContent(tabId)}
          </div>
        </ScrollArea>

        {/* Drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none z-10">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Icon className="w-8 h-8" />
              <span className="text-sm font-semibold">Drop to place here</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty pane — drop zone
  return (
    <div
      className={cn(
        'relative h-full flex items-center justify-center bg-muted/20',
        isDragOver && 'bg-primary/10 ring-2 ring-inset ring-primary'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn(
        'flex flex-col items-center gap-3 text-muted-foreground transition-colors',
        isDragOver && 'text-primary'
      )}>
        <div className={cn(
          'w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-colors',
          isDragOver ? 'border-primary' : 'border-muted-foreground/30'
        )}>
          <Icon className="w-6 h-6 opacity-50" />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">{label} Pane</div>
          <div className="text-xs opacity-70">
            {isDragOver ? 'Drop tab here' : 'Drag a tab here'}
          </div>
        </div>
      </div>
    </div>
  );
}
