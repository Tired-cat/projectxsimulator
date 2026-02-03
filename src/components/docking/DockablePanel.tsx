import { useEffect, ReactNode, useRef, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Undo2 } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface DockablePanelProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** If true, panel cannot be closed/removed */
  permanent?: boolean;
}

/**
 * Universal wrapper that makes any container draggable and dockable.
 * By default, the panel renders in place. When docked (dragged to dock area),
 * it hides from the grid and appears in the dock.
 */
export function DockablePanel({
  id,
  title,
  icon: Icon,
  children,
  className,
  permanent = false,
}: DockablePanelProps) {
  const { registerPanel, unregisterPanel, isPanelDocked, draggingPanel } = useWorkspace();
  
  // Memoize the panel definition to prevent re-registration loops
  const panelDef = useMemo(() => ({
    id,
    title,
    icon: Icon,
    content: children,
    permanent,
  }), [id, title, Icon, permanent]); // Note: children intentionally excluded
  
  // Register this panel on mount
  useEffect(() => {
    registerPanel({ ...panelDef, content: children });
  }, [panelDef, registerPanel, children]);
  
  useEffect(() => {
    return () => unregisterPanel(id);
  }, [id, unregisterPanel]);

  const isDocked = isPanelDocked(id);
  const isDragging = draggingPanel === id;

  // If panel is docked, don't render in grid (it's shown in the dock area)
  if (isDocked) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-card border border-border rounded-lg overflow-hidden transition-shadow',
        isDragging && 'opacity-50 ring-2 ring-primary/50',
        className
      )}
    >
      <DockablePanelHeader id={id} title={title} icon={Icon} showUndock={false} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

interface DockablePanelHeaderProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  showUndock?: boolean;
}

export function DockablePanelHeader({ id, title, icon: Icon, showUndock = false }: DockablePanelHeaderProps) {
  const { setDraggingPanel, undockPanel } = useWorkspace();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `panel-${id}`,
    data: {
      type: 'panel',
      panelId: id,
    },
  });

  // Update global dragging state
  useEffect(() => {
    if (isDragging) {
      setDraggingPanel(id);
    } else {
      setDraggingPanel(null);
    }
  }, [isDragging, id, setDraggingPanel]);

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border',
        'cursor-grab active:cursor-grabbing select-none',
        isDragging && 'z-50'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Icon */}
      {Icon && (
        <Icon className="w-4 h-4 text-muted-foreground" />
      )}
      
      {/* Title */}
      <span className="flex-1 text-sm font-medium truncate">{title}</span>
      
      {/* Undock button (return to grid) - only shown when docked */}
      {showUndock && (
        <button
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            undockPanel(id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Return to page"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Hook to register a panel without rendering wrapper UI.
 * Use this when you want panels to be dockable but manage their own rendering.
 */
export function useDockablePanel(
  id: string,
  title: string,
  content: ReactNode,
  icon?: LucideIcon
) {
  const { registerPanel, unregisterPanel, isPanelDocked, draggingPanel } = useWorkspace();
  
  useEffect(() => {
    registerPanel({ id, title, icon, content });
  }, [id, title, icon, content, registerPanel]);
  
  useEffect(() => {
    return () => unregisterPanel(id);
  }, [id, unregisterPanel]);
  
  const isDocked = isPanelDocked(id);
  const isDragging = draggingPanel === id;
  
  return { isDocked, isDragging };
}
