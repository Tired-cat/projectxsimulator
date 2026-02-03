import { ReactNode } from 'react';
import { Home, BarChart3, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type SimulationTab = 'home' | 'decisions';

interface TabConfig {
  id: SimulationTab;
  label: string;
  icon: typeof Home;
}

const tabs: TabConfig[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'decisions', label: 'My Decisions', icon: BarChart3 },
];

interface SimulationShellProps {
  activeTab: SimulationTab;
  onTabChange: (tab: SimulationTab) => void;
  homeContent: ReactNode;
  decisionsContent: ReactNode;
}

export function SimulationShell({
  activeTab,
  onTabChange,
  homeContent,
  decisionsContent,
}: SimulationShellProps) {
  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Workspace container */}
      <div className="max-w-7xl mx-auto">
        <div 
          className="relative bg-white dark:bg-slate-900 rounded-lg overflow-hidden flex flex-col"
          style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            height: 'calc(100vh - 48px)',
            minHeight: '600px',
            maxHeight: '950px',
          }}
        >
          {/* ========== TAB STRIP ========== */}
          <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            {/* Tabs row */}
            <div className="flex items-end px-2 pt-2 gap-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      // Base tab styles - designed as first-class draggable objects
                      'group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      'rounded-t-lg min-w-[140px] max-w-[220px]',
                      // Active vs inactive states
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-t border-l border-r border-slate-200 dark:border-slate-700 -mb-px z-10'
                        : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
                      // Cursor for future drag affordance
                      'cursor-pointer select-none'
                    )}
                    style={{
                      // Subtle shadow on active tab for depth
                      boxShadow: isActive ? '0 -1px 3px rgba(0,0,0,0.05)' : undefined,
                    }}
                  >
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                    )} />
                    <span className="truncate">{tab.label}</span>
                    
                    {/* Close button placeholder - for future multi-tab support */}
                    <div className={cn(
                      'ml-auto w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      'hover:bg-slate-300/50 dark:hover:bg-slate-600/50',
                      isActive ? 'text-slate-500' : 'text-slate-400'
                    )}>
                      <X className="w-3 h-3" />
                    </div>
                    
                    {/* Active indicator line */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                    )}
                  </button>
                );
              })}
              
              {/* Spacer - fills remaining tab bar */}
              <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
            </div>
          </div>
          
          {/* ========== CONTENT AREA ========== */}
          {/* Each tab has its own scrollable content pane */}
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Home tab content */}
            <div className={cn(
              'h-full',
              activeTab === 'home' ? 'block' : 'hidden'
            )}>
              <ScrollArea className="h-full">
                <div className="p-6 md:p-8">
                  {homeContent}
                </div>
              </ScrollArea>
            </div>
            
            {/* Decisions tab content */}
            <div className={cn(
              'h-full',
              activeTab === 'decisions' ? 'block' : 'hidden'
            )}>
              <ScrollArea className="h-full">
                <div className="p-6 md:p-8">
                  {decisionsContent}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* ========== STATUS BAR (optional, minimal) ========== */}
          <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>LumbarPro Marketing Simulator</span>
              <span>Educational Exercise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
