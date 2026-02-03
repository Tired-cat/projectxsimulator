import { X, Home, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs, type TabKind } from '@/contexts/TabContext';

const TAB_ICONS: Record<TabKind, typeof Home> = {
  home: Home,
  decisions: BarChart3,
};

/**
 * Browser-style tab strip - the ONLY navigation in the app.
 * Renders tabs from TabContext with pinned tabs that cannot be closed.
 */
export function BrowserTabStrip() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();

  return (
    <div className="flex items-end px-2 pt-2 gap-0.5 bg-slate-100 dark:bg-slate-800">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.kind];
        const isActive = activeTabId === tab.id;
        
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none',
              'rounded-t-lg min-w-[140px] max-w-[220px]',
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
      
      {/* Spacer - fills remaining tab bar */}
      <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
    </div>
  );
}
