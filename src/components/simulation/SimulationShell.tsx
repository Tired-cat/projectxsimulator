import { ReactNode } from 'react';
import { Home, BarChart3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DockableWorkspace } from '@/components/docking/DockableWorkspace';
import { BudgetHeader, ScenarioContext } from './SimulationDecisions';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
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
  // Props for the fixed header in decisions tab
  totalSpent?: number;
  channelSpend?: ChannelSpend;
  onReset?: () => void;
}

export function SimulationShell({
  activeTab,
  onTabChange,
  homeContent,
  decisionsContent,
  totalSpent = 0,
  channelSpend,
  onReset = () => {},
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
            maxHeight: '1200px',
          }}
        >
          {/* ========== TAB STRIP (Real Navigation) ========== */}
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
                      'group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      'rounded-t-lg min-w-[140px] max-w-[220px]',
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-t border-l border-r border-slate-200 dark:border-slate-700 -mb-px z-10'
                        : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
                      'cursor-pointer select-none'
                    )}
                    style={{
                      boxShadow: isActive ? '0 -1px 3px rgba(0,0,0,0.05)' : undefined,
                    }}
                  >
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                    )} />
                    <span className="truncate">{tab.label}</span>
                    
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
            
            {/* Decisions tab content - uses docking system */}
            <div className={cn(
              'h-full flex flex-col',
              activeTab === 'decisions' ? 'flex' : 'hidden'
            )}>
              {/* Fixed header with budget bar and scenario context */}
              <div className="flex-shrink-0 p-4 space-y-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <BudgetHeader totalSpent={totalSpent} onReset={onReset} />
                {channelSpend && <ScenarioContext channelSpend={channelSpend} />}
              </div>
              
              {/* Dockable workspace - panels render in grid by default */}
              <div className="flex-1 overflow-hidden">
                <DockableWorkspace className="h-full">
                  {decisionsContent}
                </DockableWorkspace>
              </div>
            </div>
          </div>
          
          {/* ========== STATUS BAR ========== */}
          <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>LumbarPro Marketing Simulator</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Drag panels to dock
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
