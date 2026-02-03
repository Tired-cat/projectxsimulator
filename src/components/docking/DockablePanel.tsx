import { useEffect, ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
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
 * Wrap ANY component with this to make it part of the docking system.
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
  
  // Register this panel on mount
  useEffect(() => {
    registerPanel({
      id,
      title,
      icon: Icon,
      content: children,
      permanent,
    });
    
    return () => {
      unregisterPanel(id);
    };
  }, [id, title, Icon, children, permanent, registerPanel, unregisterPanel]);

  const isDragging = draggingPanel === id;

  return (
    <div
      className={cn(
        'flex flex-col bg-card border border-border rounded-lg overflow-hidden transition-shadow',
        isDragging && 'opacity-50 ring-2 ring-primary/50',
        className
      )}
    >
      <DockablePanelHeader id={id} title={title} icon={Icon} permanent={permanent} />
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
  permanent?: boolean;
}

export function DockablePanelHeader({ id, title, icon: Icon, permanent }: DockablePanelHeaderProps) {
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
      
      {/* Close button (only for non-permanent panels) */}
      {!permanent && (
        <button
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Close logic would go here
          }}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/**
 * Lightweight panel registration for cases where you don't want the default wrapper UI.
 * Use this when you want full control over the panel appearance but still want it in the docking system.
 */
export function useDockablePanel(
  id: string,
  title: string,
  content: ReactNode,
  icon?: LucideIcon
) {
  const { registerPanel, unregisterPanel, draggingPanel } = useWorkspace();
  
  useEffect(() => {
    registerPanel({ id, title, icon, content });
    return () => unregisterPanel(id);
  }, [id, title, icon, content, registerPanel, unregisterPanel]);
  
  const isDragging = draggingPanel === id;
  
  return { isDragging };
}
