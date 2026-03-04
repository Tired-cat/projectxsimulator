import { DragEvent, useState, useRef } from 'react';
import { X, Home, BarChart3, PieChart, AlertCircle, Settings, FlaskConical, Columns2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type Tab, type TabKind } from '@/contexts/TabContext';
import type { PanelId } from '@/types/workspaceTypes';

const TAB_ICONS: Record<TabKind, LucideIcon> = {
  home: Home,
  decisions: BarChart3,
  reasoning: FlaskConical,
  panel: BarChart3,
};

const PANEL_ICONS: Record<PanelId, LucideIcon> = {
  'channel-performance': BarChart3,
  'product-mix': PieChart,
  
  'hints': AlertCircle,
  'assumptions': Settings,
};

function getTabIcon(tab: Tab): LucideIcon {
  if (tab.kind === 'panel' && tab.panelType) {
    return PANEL_ICONS[tab.panelType] || BarChart3;
  }
  return TAB_ICONS[tab.kind];
}

const PANEL_TITLES: Record<PanelId, string> = {
  'channel-performance': 'Channel Performance',
  'product-mix': 'Product Mix',
  
  'hints': 'Hints & Tips',
  'assumptions': 'Assumptions',
};

/**
 * Chrome-style tab strip.
 * - Dragging a TAB and dropping onto another tab or the split-zone triggers 50/50 split view.
 * - Dragging a PANEL CARD (from grid) onto the strip creates a new tab.
 * - Pinned tabs (Home, My Decisions, Reasoning Board) stay in the strip always.
 * - When closing a closable tab while in split view, it's removed from split too.
 */
export function BrowserTabStrip() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    draggingPanelId,
    draggingTabId,
    setDraggingTabId,
    addPanelAsTab,
    activateSplitWithTabs,
    openTabInSplit,
    split,
    disableSplit,
  } = useTabs();

  // Whether the user is hovering over the split-drop zone
  const [splitDropActive, setSplitDropActive] = useState(false);
  // Which tab slot has a drop indicator for tab reorder/split
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null);
  // Whether panel card is being dragged over the strip area
  const [cardDragOver, setCardDragOver] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);

  /* ─── Tab drag (from tab strip) ─── */
  const handleTabDragStart = (e: DragEvent, tab: Tab) => {
    e.dataTransfer.setData('tabId', tab.id);
    e.dataTransfer.setData('tabKind', tab.kind);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTabId(tab.id);
  };

  const handleTabDragEnd = () => {
    setDraggingTabId(null);
    setDropTargetTabId(null);
    setSplitDropActive(false);
  };

  /* ─── Tab drop target (on another tab → split with dragged on right) ─── */
  const handleTabDragOver = (e: DragEvent, targetTabId: string) => {
    if (!draggingTabId || draggingTabId === targetTabId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetTabId(targetTabId);
  };

  const handleTabDragLeave = () => {
    setDropTargetTabId(null);
  };

  const handleTabDrop = (e: DragEvent, targetTabId: string) => {
    e.preventDefault();
    setDropTargetTabId(null);

    const sourceTabId = e.dataTransfer.getData('tabId');
    if (!sourceTabId || sourceTabId === targetTabId) return;

    // Chrome behaviour: drop tab onto another tab → split: left=target, right=source
    activateSplitWithTabs(targetTabId, sourceTabId);
    setActiveTab(targetTabId);
  };

  /* ─── Split-zone drop (dedicated zone at right of tab bar) ─── */
  const handleSplitZoneDragOver = (e: DragEvent) => {
    if (!draggingTabId) return;
    e.preventDefault();
    setSplitDropActive(true);
  };

  const handleSplitZoneDragLeave = () => {
    setSplitDropActive(false);
  };

  const handleSplitZoneDrop = (e: DragEvent) => {
    e.preventDefault();
    setSplitDropActive(false);
    const sourceTabId = e.dataTransfer.getData('tabId');
    if (!sourceTabId) return;
    // Put active tab on left, dragged tab on right
    openTabInSplit(activeTabId, 'left');
    openTabInSplit(sourceTabId, 'right');
  };

  /* ─── Panel card dragged onto tab strip → create new tab ─── */
  const handleStripDragOver = (e: DragEvent) => {
    if (!draggingPanelId) return;
    e.preventDefault();
    setCardDragOver(true);
  };

  const handleStripDragLeave = () => {
    setCardDragOver(false);
  };

  const handleStripDrop = (e: DragEvent) => {
    e.preventDefault();
    setCardDragOver(false);
    const panelId = e.dataTransfer.getData('panelId') as PanelId;
    if (panelId) {
      addPanelAsTab(panelId, PANEL_TITLES[panelId] || panelId);
    }
  };

  return (
    <div
      ref={stripRef}
      className={cn(
        'flex items-end px-2 pt-2 gap-0.5 bg-muted/60 transition-colors min-h-[44px]',
        cardDragOver && 'bg-primary/10'
      )}
      onDragOver={handleStripDragOver}
      onDragLeave={handleStripDragLeave}
      onDrop={handleStripDrop}
    >
      {tabs.map((tab) => {
        const Icon = getTabIcon(tab);
        const isActive = activeTabId === tab.id && !split.enabled;
        const isInSplit =
          split.enabled &&
          (split.leftTabId === tab.id || split.rightTabId === tab.id);
        const isDropTarget = dropTargetTabId === tab.id;
        const isDraggingThis = draggingTabId === tab.id;

        return (
          <div
            key={tab.id}
            draggable
            onClick={() => {
              if (split.enabled) disableSplit();
              setActiveTab(tab.id);
            }}
            onDragStart={(e) => handleTabDragStart(e, tab)}
            onDragEnd={handleTabDragEnd}
            onDragOver={(e) => handleTabDragOver(e, tab.id)}
            onDragLeave={handleTabDragLeave}
            onDrop={(e) => handleTabDrop(e, tab.id)}
            className={cn(
              'group relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all cursor-pointer select-none',
              'rounded-t-lg min-w-[100px] max-w-[180px]',
              isDraggingThis && 'opacity-40 scale-95',
              isDropTarget && 'ring-2 ring-primary/60 ring-inset',
              isActive
                ? 'bg-background text-foreground border-t border-l border-r border-border -mb-px z-10 shadow-sm'
                : isInSplit
                ? 'bg-primary/10 text-primary border-t border-l border-r border-primary/30 -mb-px z-10'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            style={{
              boxShadow: isActive ? '0 -1px 3px rgba(0,0,0,0.05)' : undefined,
            }}
            title={`${tab.title}${tab.pinned ? ' (pinned)' : ''}\nDrag onto another tab to split`}
          >
            <Icon
              className={cn(
                'w-3.5 h-3.5 flex-shrink-0',
                isActive ? 'text-primary' : isInSplit ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span className="truncate text-xs">{tab.title}</span>

            {/* Split indicator badge */}
            {isInSplit && (
              <span className="flex-shrink-0 text-[9px] font-bold text-primary bg-primary/10 px-1 rounded">
                {split.leftTabId === tab.id ? 'L' : 'R'}
              </span>
            )}

            {/* Close button for closable tabs */}
            {tab.closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive rounded p-0.5 transition-opacity ml-auto flex-shrink-0"
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Active underline */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </div>
        );
      })}

      {/* New tab drop ghost when dragging a panel card */}
      {cardDragOver && (
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-2 border-dashed border-primary/60 bg-primary/5 text-primary whitespace-nowrap">
          + New Tab
        </div>
      )}

      {/* Split drop zone — always visible when a tab is being dragged */}
      {draggingTabId && (
        <div
          className={cn(
            'flex items-center gap-1.5 ml-2 px-3 py-2 text-xs font-medium rounded-t-lg border-2 border-dashed transition-all cursor-copy whitespace-nowrap',
            splitDropActive
              ? 'border-primary bg-primary/10 text-primary scale-105'
              : 'border-muted-foreground/30 text-muted-foreground'
          )}
          onDragOver={handleSplitZoneDragOver}
          onDragLeave={handleSplitZoneDragLeave}
          onDrop={handleSplitZoneDrop}
        >
          <Columns2 className="w-3.5 h-3.5" />
          {splitDropActive ? 'Drop to split' : 'Drag here to split'}
        </div>
      )}

      {/* Close split button when in split mode */}
      {split.enabled && !draggingTabId && (
        <button
          onClick={disableSplit}
          className="ml-auto flex items-center gap-1.5 px-2 py-1 mb-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Exit split view"
        >
          <X className="w-3 h-3" />
          <span>Close Split</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1 border-b border-border" />
    </div>
  );
}
