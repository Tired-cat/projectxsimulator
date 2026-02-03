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
import { RotateCcw, Columns2 } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { DockablePane, SplitDropZones, TopDockZone } from './DockablePane';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DropZoneType } from '@/types/dockingTypes';

interface DockableWorkspaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root container for the dockable workspace system.
 * Wrap your page content with this to enable panel docking.
 * Children render normally in the grid; docked panels appear in the dock area.
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
    movePanel,
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
      movePanel(panelId, dropZone);
    }
  }, [movePanel, setDraggingPanel]);

  const draggedPanel = draggingPanel ? getPanel(draggingPanel) : null;
  
  // Check if dock area should be visible
  const showDockArea = hasDockedPanels || layout.splitMode;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full', className)}>
        {/* Toolbar - only show when there are docked panels or during drag */}
        {(showDockArea || draggingPanel) && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              {hasDockedPanels && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={layout.splitMode ? closeSplitMode : toggleSplitMode}
                  className="h-8"
                >
                  <Columns2 className="h-4 w-4 mr-2" />
                  {layout.splitMode ? 'Close Split' : 'Split View'}
                </Button>
              )}
            </div>
            {hasDockedPanels && (
              <Button variant="ghost" size="sm" onClick={resetLayout} className="h-8">
                <RotateCcw className="h-4 w-4 mr-2" />
                Undock All
              </Button>
            )}
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Top dock zone (visible when dragging) */}
          <TopDockZone visible={!!draggingPanel} />
          
          {/* Split drop zones (visible when dragging and not in split mode) */}
          <SplitDropZones visible={!!draggingPanel && !layout.splitMode} />
          
          {/* Content layout depends on dock state */}
          {showDockArea ? (
            // Show dock panes when panels are docked
            <div className={cn(
              'h-full p-4',
              layout.splitMode ? 'grid grid-cols-2 gap-4' : 'flex'
            )}>
              <DockablePane pane={layout.paneA} className="flex-1" />
              
              {layout.splitMode && (
                <DockablePane pane={layout.paneB} className="flex-1" />
              )}
            </div>
          ) : (
            // Normal grid layout when nothing is docked
            <div className="h-full overflow-auto p-4">
              {children}
            </div>
          )}
          
          {/* Also render children in dock mode so panels can register */}
          {showDockArea && (
            <div className="hidden">{children}</div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedPanel && (
          <div className="bg-card border border-primary shadow-2xl rounded-lg px-4 py-2 opacity-90">
            <div className="flex items-center gap-2 text-sm font-medium">
              {draggedPanel.icon && <draggedPanel.icon className="w-4 h-4 text-primary" />}
              <span>{draggedPanel.title}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { DockableWorkspace as default };
