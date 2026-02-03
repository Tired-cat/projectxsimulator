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
import { DockablePane, SplitDropZones } from './DockablePane';
import { WorkspaceTabBar } from './TabBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DropZoneType } from '@/types/dockingTypes';

interface DockableWorkspaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root container for the dockable workspace system.
 * Wrap your app content with this to enable panel docking.
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full', className)}>
        {/* Workspace tabs (torn-out panels) */}
        <WorkspaceTabBar
          tabs={layout.workspaceTabs}
          activeTabId={layout.activeWorkspaceTab}
        />
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={layout.splitMode ? closeSplitMode : toggleSplitMode}
              className="h-8"
            >
              <Columns2 className="h-4 w-4 mr-2" />
              {layout.splitMode ? 'Close Split' : 'Split View'}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={resetLayout} className="h-8">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
        </div>
        
        {/* Main workspace area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Render children to allow panel registration */}
          <div className="hidden">{children}</div>
          
          {/* Split drop zones (visible when dragging) */}
          <SplitDropZones visible={!!draggingPanel && !layout.splitMode} />
          
          {/* Panes */}
          <div className={cn(
            'h-full p-4',
            layout.splitMode ? 'grid grid-cols-2 gap-4' : 'flex'
          )}>
            <DockablePane pane={layout.paneA} className="flex-1" />
            
            {layout.splitMode && (
              <DockablePane pane={layout.paneB} className="flex-1" />
            )}
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
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { DockableWorkspace as default };
