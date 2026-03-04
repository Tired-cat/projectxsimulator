import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTabs } from '@/contexts/TabContext';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { BrowserTabStrip } from './BrowserTabStrip';
import { SplitWorkspace } from './SplitWorkspace';
import { ReasoningBoard } from '@/components/reasoning/ReasoningBoard';
import { FlaskConical } from 'lucide-react';
import type { PanelId } from '@/types/workspaceTypes';

interface SimulationShellProps {
  homeContent: ReactNode;
  decisionsContent: ReactNode;
  renderPanelContent: (panelId: PanelId) => ReactNode;
}

/**
 * Main shell with browser-style tab navigation.
 * When split is enabled, renders a 50/50 SplitWorkspace instead of a single tab's content.
 * ALL tab kinds (home, decisions, reasoning, panel) work in split view.
 */
export function SimulationShell({
  homeContent,
  decisionsContent,
  renderPanelContent,
}: SimulationShellProps) {
  const { tabs, activeTabId, split } = useTabs();
  const { reasonMode, toggleReasonMode } = useReasoningBoard();
  const activeTab = tabs.find(t => t.id === activeTabId);

  /**
   * Render content for any tab by its id.
   * This is the universal content renderer used by both single-view and split-view.
   */
  const renderTabContent = (tabId: string): ReactNode => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return null;

    switch (tab.kind) {
      case 'home':
        return homeContent;
      case 'decisions':
        return decisionsContent;
      case 'reasoning':
        return <ReasoningBoard />;
      case 'panel':
        if (tab.panelType) {
          return renderPanelContent(tab.panelType);
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── SINGLE BROWSER TAB STRIP ── */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <BrowserTabStrip />
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex-1 overflow-hidden">
        {split.enabled ? (
          /* SPLIT MODE: 50/50 panes render any tab's content */
          <SplitWorkspace
            renderTabContent={renderTabContent}
            renderPanelContent={renderPanelContent}
          />
        ) : (
          /* SINGLE MODE: render the active tab */
          <>
            {/* Home */}
            <div className={cn('h-full', activeTab?.kind === 'home' ? 'block' : 'hidden')}>
              <ScrollArea className="h-full">
                <div className="p-6 md:p-8">{homeContent}</div>
              </ScrollArea>
            </div>

            {/* My Decisions */}
            <div className={cn('h-full', activeTab?.kind === 'decisions' ? 'block' : 'hidden')}>
              {decisionsContent}
            </div>

            {/* Reasoning Board */}
            <div className={cn('h-full', activeTab?.kind === 'reasoning' ? 'block' : 'hidden')}>
              <ReasoningBoard />
            </div>

            {/* Panel tabs */}
            {activeTab?.kind === 'panel' && activeTab.panelType && (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="max-w-6xl mx-auto">
                    {renderPanelContent(activeTab.panelType)}
                  </div>
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>

      {/* ── STATUS BAR ── */}
      <div className="flex-shrink-0 bg-muted border-t border-border px-4 py-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>LumbarPro Marketing Simulator</span>
          <span className="flex items-center gap-2">
            {split.enabled && (
              <span className="text-primary font-medium flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full" /> Split View</span>
            )}
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
