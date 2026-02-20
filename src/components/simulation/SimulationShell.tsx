import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTabs } from '@/contexts/TabContext';
import { BrowserTabStrip } from './BrowserTabStrip';
import { ReasoningBoard } from '@/components/reasoning/ReasoningBoard';
import type { PanelId } from '@/types/workspaceTypes';

interface SimulationShellProps {
  homeContent: ReactNode;
  decisionsContent: ReactNode;
  // Panel renderer for panel tabs
  renderPanelContent: (panelId: PanelId) => ReactNode;
}

/**
 * Main shell with browser-style tab navigation.
 * Only ONE tab bar exists - the BrowserTabStrip.
 * Content is rendered based on activeTabId from TabContext.
 */
export function SimulationShell({
  homeContent,
  decisionsContent,
  renderPanelContent,
}: SimulationShellProps) {
  const { tabs, activeTabId } = useTabs();
  
  // Find the active tab
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ========== SINGLE BROWSER TAB STRIP (Real Navigation) ========== */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <BrowserTabStrip />
      </div>
      
      {/* ========== FULL-HEIGHT CONTENT AREA ========== */}
      <div className="flex-1 overflow-hidden">
        {/* Home tab content */}
        <div className={cn(
          'h-full',
          activeTab?.kind === 'home' ? 'block' : 'hidden'
        )}>
          <ScrollArea className="h-full">
            <div className="p-6 md:p-8">
              {homeContent}
            </div>
          </ScrollArea>
        </div>
        
        {/* Decisions tab content - full height for split view */}
        <div className={cn(
          'h-full',
          activeTab?.kind === 'decisions' ? 'block' : 'hidden'
        )}>
          {decisionsContent}
        </div>

        {/* Reasoning Board tab */}
        <div className={cn(
          'h-full',
          activeTab?.kind === 'reasoning' ? 'block' : 'hidden'
        )}>
          <ReasoningBoard />
        </div>
        
        {/* Panel tab content - for tabs opened from containers */}
        {activeTab?.kind === 'panel' && activeTab.panelType && (
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                {renderPanelContent(activeTab.panelType)}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
      
      {/* ========== STATUS BAR ========== */}
      <div className="flex-shrink-0 bg-muted border-t border-border px-4 py-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>LumbarPro Marketing Simulator</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
