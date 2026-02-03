import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTabs } from '@/contexts/TabContext';
import { BrowserTabStrip } from './BrowserTabStrip';

interface SimulationShellProps {
  homeContent: ReactNode;
  decisionsContent: ReactNode;
}

/**
 * Main shell with browser-style tab navigation.
 * Only ONE tab bar exists - the BrowserTabStrip.
 * Content is rendered based on activeTabId from TabContext.
 */
export function SimulationShell({
  homeContent,
  decisionsContent,
}: SimulationShellProps) {
  const { activeTabId } = useTabs();

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
          {/* ========== SINGLE BROWSER TAB STRIP (Real Navigation) ========== */}
          <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
            <BrowserTabStrip />
          </div>
          
          {/* ========== CONTENT AREA ========== */}
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Home tab content */}
            <div className={cn(
              'h-full',
              activeTabId === 'home' ? 'block' : 'hidden'
            )}>
              <ScrollArea className="h-full">
                <div className="p-6 md:p-8">
                  {homeContent}
                </div>
              </ScrollArea>
            </div>
            
            {/* Decisions tab content */}
            <div className={cn(
              'h-full flex flex-col',
              activeTabId === 'decisions' ? 'flex' : 'hidden'
            )}>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {decisionsContent}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* ========== STATUS BAR ========== */}
          <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>LumbarPro Marketing Simulator</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
