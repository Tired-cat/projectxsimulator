import { useEffect, ReactNode, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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
 * Universal wrapper that makes any container draggable.
 * Panels ALWAYS render in place. Dragging creates a CLONE view in the dock.
 * The original never moves or disappears.
 */
export function DockablePanel({
  id,
  title,
  icon: Icon,
  children,
  className,
  permanent = false,
}: DockablePanelProps) {
  const { registerPanel, unregisterPanel, draggingPanel } = useWorkspace();
  
  // Memoize the panel definition to prevent re-registration loops
  const panelDef = useMemo(() => ({
    id,
    title,
    icon: Icon,
    content: children,
    permanent,
  }), [id, title, Icon, permanent]); // Note: children intentionally excluded for stability
  
  // Register this panel on mount
  useEffect(() => {
    registerPanel({ ...panelDef, content: children });
  }, [panelDef, registerPanel, children]);
  
  useEffect(() => {
    return () => unregisterPanel(id);
  }, [id, unregisterPanel]);

  const isDragging = draggingPanel === id;

  // Panels ALWAYS render in place - they never disappear
  return (
    <div
      className={cn(
        'flex flex-col bg-card border border-border rounded-lg overflow-hidden transition-shadow',
        isDragging && 'ring-2 ring-primary/50 opacity-75',
        className
      )}
    >
      <DockablePanelHeader id={id} title={title} icon={Icon} />
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
}

export function DockablePanelHeader({ id, title, icon: Icon }: DockablePanelHeaderProps) {
  const { setDraggingPanel } = useWorkspace();
  
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
  const { registerPanel, unregisterPanel, isPanelInDock, draggingPanel } = useWorkspace();
  
  useEffect(() => {
    registerPanel({ id, title, icon, content });
  }, [id, title, icon, content, registerPanel]);
  
  useEffect(() => {
    return () => unregisterPanel(id);
  }, [id, unregisterPanel]);
  
  const isInDock = isPanelInDock(id);
  const isDragging = draggingPanel === id;
  
  return { isInDock, isDragging };
}
