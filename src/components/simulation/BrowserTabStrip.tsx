import { DragEvent, useState } from 'react';
import { X, Home, BarChart3, PieChart, DollarSign, AlertCircle, Settings, FlaskConical, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type Tab, type TabKind } from '@/contexts/TabContext';
import type { PanelId, PANEL_DEFINITIONS } from '@/types/workspaceTypes';

// Icon mapping for all tab kinds
const TAB_ICONS: Record<TabKind, LucideIcon> = {
  home: Home,
  decisions: BarChart3,
  reasoning: FlaskConical,
  panel: BarChart3, // Default, will be overridden
};

const PANEL_ICONS: Record<PanelId, LucideIcon> = {
  'channel-performance': BarChart3,
  'product-mix': PieChart,
  'goal-tracker': DollarSign,
  'hints': AlertCircle,
  'assumptions': Settings,
};

function getTabIcon(tab: Tab): LucideIcon {
  if (tab.kind === 'panel' && tab.panelType) {
    return PANEL_ICONS[tab.panelType] || BarChart3;
  }
  return TAB_ICONS[tab.kind];
}

/**
 * Browser-style tab strip - the ONLY navigation in the app.
 * Supports drop target for dragging panels to create new tabs.
 */
export function BrowserTabStrip() {
  const { tabs, activeTabId, setActiveTab, closeTab, draggingPanelId, addPanelAsTab } = useTabs();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    if (!draggingPanelId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const panelId = e.dataTransfer.getData('panelId') as PanelId;
    if (panelId) {
      // Get title from panel definitions
      const titles: Record<PanelId, string> = {
        'channel-performance': 'Channel Performance',
        'product-mix': 'Product Mix',
        'goal-tracker': 'Goal Tracker',
        'hints': 'Hints & Tips',
        'assumptions': 'Assumptions',
      };
      addPanelAsTab(panelId, titles[panelId] || panelId);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-end px-2 pt-2 gap-0.5 bg-slate-100 dark:bg-slate-800 transition-colors",
        isDragOver && "bg-blue-100 dark:bg-blue-900/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tabs.map((tab) => {
        const Icon = getTabIcon(tab);
        const isActive = activeTabId === tab.id;
        
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none',
              'rounded-t-lg min-w-[120px] max-w-[200px]',
              isActive
                ? 'bg-white dark:bg-slate-900 text-foreground border-t border-l border-r border-slate-200 dark:border-slate-700 -mb-px z-10'
                : 'bg-slate-200/50 dark:bg-slate-700/50 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-foreground'
            )}
            style={{
              boxShadow: isActive ? '0 -1px 3px rgba(0,0,0,0.05)' : undefined,
            }}
          >
            <Icon className={cn(
              'w-4 h-4 flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className="truncate">{tab.title}</span>
            
            {/* Close button - only for closable tabs */}
            {tab.closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded p-0.5 transition-opacity ml-auto"
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            {/* Active indicator line */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </div>
        );
      })}
      
      {/* Drop indicator when dragging */}
      {isDragOver && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600">
          + New Tab
        </div>
      )}
      
      {/* Spacer - fills remaining tab bar */}
      <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
    </div>
  );
}
