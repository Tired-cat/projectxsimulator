import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import type { TabItem } from '@/types/dockingTypes';

interface TabBarProps {
  paneId: 'pane-a' | 'pane-b';
  tabs: TabItem[];
  activeTabId: string;
  className?: string;
}

export function TabBar({ paneId, tabs, activeTabId, className }: TabBarProps) {
  const { getPanel, setActiveTab, closeViewTab } = useWorkspace();
  
  const dropZoneId = paneId === 'pane-a' ? 'tab-bar-a' : 'tab-bar-b';
  
  const { isOver, setNodeRef } = useDroppable({
    id: dropZoneId,
    data: {
      type: 'tab-bar',
      paneId,
    },
  });

  // Don't render tab bar if no tabs
  if (tabs.length === 0 && !isOver) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-end gap-0.5 px-2 pt-2 bg-muted/30 border-b border-border min-h-[40px]',
        isOver && 'ring-2 ring-primary ring-inset bg-primary/5',
        className
      )}
    >
      {tabs.map((tab) => {
        const panel = getPanel(tab.panelId);
        if (!panel) return null;
        
        return (
          <DraggableTab
            key={tab.panelId}
            panelId={tab.panelId}
            title={panel.title}
            icon={panel.icon}
            isActive={tab.panelId === activeTabId}
            onClick={() => setActiveTab(paneId, tab.panelId)}
            onClose={() => closeViewTab(paneId, tab.panelId)}
            paneId={paneId}
          />
        );
      })}
      
      {/* Flex spacer with border */}
      <div className="flex-1 border-b border-border -mb-px" />
      
      {/* Empty state during drag */}
      {tabs.length === 0 && isOver && (
        <div className="flex-1 flex items-center justify-center py-2 text-xs text-muted-foreground">
          Drop here
        </div>
      )}
    </div>
  );
}

interface DraggableTabProps {
  panelId: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  paneId: 'pane-a' | 'pane-b';
}

function DraggableTab({ panelId, title, icon: Icon, isActive, onClick, onClose, paneId }: DraggableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `tab-${panelId}`,
    data: {
      type: 'tab',
      panelId,
      sourcePane: paneId,
    },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 50,
  } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
        'rounded-t-md min-w-[100px] max-w-[180px]',
        isActive
          ? 'bg-background text-foreground border-t border-l border-r border-border -mb-px z-10'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
        isDragging && 'opacity-50 ring-2 ring-primary shadow-lg',
        'cursor-grab active:cursor-grabbing select-none'
      )}
      {...attributes}
      {...listeners}
    >
      {Icon && (
        <Icon className={cn(
          'w-4 h-4 flex-shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )} />
      )}
      <span className="truncate">{title}</span>
      
      {/* Close button */}
      <div
        className={cn(
          'ml-auto w-5 h-5 flex items-center justify-center rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-muted-foreground/20'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Close tab"
      >
        <X className="w-3 h-3" />
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </button>
  );
}
