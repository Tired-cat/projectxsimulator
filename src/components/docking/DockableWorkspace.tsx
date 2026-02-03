import { ReactNode, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { RotateCcw, Columns2, X } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { DockablePane, SplitDropZones } from './DockablePane';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DropZoneType } from '@/types/dockingTypes';

interface DockableWorkspaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root container for the dockable workspace system.
 * Wrap your page content with this to enable panel cloning into dock views.
 * Children ALWAYS render normally in the grid - panels are CLONED when docked, never moved.
 */
export function DockableWorkspace({ children, className }: DockableWorkspaceProps) {
  return (
    <WorkspaceProvider>
      <DockableWorkspaceInner className={className}>
        {children}
      </DockableWorkspaceInner>
    </WorkspaceProvider>
  );
}

function DockableWorkspaceInner({ children, className }: DockableWorkspaceProps) {
  const {
    layout,
    clonePanelToView,
    draggingPanel,
    setDraggingPanel,
    getPanel,
    toggleSplitMode,
    closeSplitMode,
    resetLayout,
    hasDockedPanels,
  } = useWorkspace();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const panelId = active.data.current?.panelId;
    if (panelId) {
      setDraggingPanel(panelId);
    }
  }, [setDraggingPanel]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingPanel(null);

    if (!over) return;

    const panelId = active.data.current?.panelId;
    const dropZone = over.id as DropZoneType;

    if (panelId && dropZone) {
      // Clone the panel into the dock view (original stays in place)
      clonePanelToView(panelId, dropZone);
    }
  }, [clonePanelToView, setDraggingPanel]);

  const draggedPanel = draggingPanel ? getPanel(draggingPanel) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full', className)}>
        {/* Dock area - only show when panels are docked or during drag */}
        {(hasDockedPanels || draggingPanel) && (
          <div className="flex-shrink-0 border-b border-border">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Dock Views</span>
                {hasDockedPanels && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={layout.splitMode ? closeSplitMode : toggleSplitMode}
                    className="h-7 text-xs"
                  >
                    <Columns2 className="h-3.5 w-3.5 mr-1.5" />
                    {layout.splitMode ? 'Close Split' : 'Split View'}
                  </Button>
                )}
              </div>
              {hasDockedPanels && (
                <Button variant="ghost" size="sm" onClick={resetLayout} className="h-7 text-xs">
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Close All
                </Button>
              )}
            </div>
            
            {/* Dock panes */}
            <div className={cn(
              'p-4',
              layout.splitMode ? 'grid grid-cols-2 gap-4' : 'flex'
            )}
              style={{ height: '320px' }}
            >
              <DockablePane pane={layout.paneA} className="flex-1" />
              
              {layout.splitMode && (
                <DockablePane pane={layout.paneB} className="flex-1" />
              )}
            </div>
          </div>
        )}
        
        {/* Main content - panels ALWAYS render here */}
        <div className="flex-1 overflow-auto relative">
          {/* Split drop zones (visible when dragging) */}
          <SplitDropZones visible={!!draggingPanel} />
          
          {/* Normal grid layout - panels never disappear */}
          <div className="h-full overflow-auto p-4">
            {children}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedPanel && (
          <div className="bg-card border border-primary shadow-2xl rounded-lg px-4 py-2 opacity-90">
            <div className="flex items-center gap-2 text-sm font-medium">
              {draggedPanel.icon && <draggedPanel.icon className="w-4 h-4 text-primary" />}
              <span>{draggedPanel.title}</span>
              <span className="text-xs text-muted-foreground ml-2">→ Clone to dock</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { DockableWorkspace as default };
