import { useDroppable } from '@dnd-kit/core';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TabBar } from './TabBar';
import { cn } from '@/lib/utils';
import type { Pane as PaneType } from '@/types/dockingTypes';

interface DockablePaneProps {
  pane: PaneType;
  className?: string;
}

export function DockablePane({ pane, className }: DockablePaneProps) {
  const { getPanel, draggingPanel } = useWorkspace();
  
  const dropZoneId = pane.id === 'pane-a' ? 'pane-content-a' : 'pane-content-b';
  
  const { isOver, setNodeRef } = useDroppable({
    id: dropZoneId,
    data: {
      type: 'pane-content',
      paneId: pane.id,
    },
  });

  const activePanel = getPanel(pane.tabGroup.activeTabId);
  const hasTabs = pane.tabGroup.tabs.length > 0;

  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-border', className)}>
      {/* Tab bar */}
      <TabBar
        paneId={pane.id}
        tabs={pane.tabGroup.tabs}
        activeTabId={pane.tabGroup.activeTabId}
      />
      
      {/* Content area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-auto relative',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/5',
          !hasTabs && 'flex items-center justify-center'
        )}
      >
        {hasTabs && activePanel ? (
          <div className="h-full flex flex-col">
            {/* Panel header with title */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
              {activePanel.icon && <activePanel.icon className="w-4 h-4 text-muted-foreground" />}
              <span className="flex-1 text-sm font-medium truncate">{activePanel.title}</span>
              <span className="text-xs text-muted-foreground">(clone view)</span>
            </div>
            {/* Panel content */}
            <div className="flex-1 overflow-auto">
              {activePanel.content}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            {draggingPanel ? 'Drop panel here' : 'Drag panels here to dock'}
          </div>
        )}
      </div>
    </div>
  );
}

interface SplitDropZonesProps {
  visible: boolean;
}

export function SplitDropZones({ visible }: SplitDropZonesProps) {
  const { isOver: isOverLeft, setNodeRef: setLeftRef } = useDroppable({
    id: 'split-left',
    data: { type: 'split', side: 'left' },
  });
  
  const { isOver: isOverRight, setNodeRef: setRightRef } = useDroppable({
    id: 'split-right',
    data: { type: 'split', side: 'right' },
  });

  if (!visible) return null;

  return (
    <>
      {/* Left split zone */}
      <div
        ref={setLeftRef}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-24 z-40',
          'flex items-center justify-center',
          'bg-gradient-to-r from-primary/20 to-transparent',
          'border-r-2 border-dashed border-primary/50',
          'transition-all duration-200',
          isOverLeft && 'from-primary/40 border-primary'
        )}
      >
        <div className={cn(
          'px-3 py-2 rounded-md text-xs font-medium',
          'bg-primary/20 text-primary border border-primary/50',
          isOverLeft && 'bg-primary text-primary-foreground'
        )}>
          Dock Left
        </div>
      </div>
      
      {/* Right split zone */}
      <div
        ref={setRightRef}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-24 z-40',
          'flex items-center justify-center',
          'bg-gradient-to-l from-primary/20 to-transparent',
          'border-l-2 border-dashed border-primary/50',
          'transition-all duration-200',
          isOverRight && 'from-primary/40 border-primary'
        )}
      >
        <div className={cn(
          'px-3 py-2 rounded-md text-xs font-medium',
          'bg-primary/20 text-primary border border-primary/50',
          isOverRight && 'bg-primary text-primary-foreground'
        )}>
          Dock Right
        </div>
      </div>
    </>
  );
}
