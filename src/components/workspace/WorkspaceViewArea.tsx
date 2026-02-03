import { ReactNode } from 'react';
import { WorkspaceTabStrip } from './WorkspaceTabStrip';
import type { SplitPane, PanelId } from '@/types/workspaceTypes';
import { cn } from '@/lib/utils';

interface WorkspaceViewAreaProps {
  leftPane: SplitPane;
  rightPane: SplitPane;
  splitEnabled: boolean;
  onTabClick: (paneId: 'left' | 'right', tabId: string) => void;
  onTabClose: (tabId: string) => void;
  renderPanel: (panelId: PanelId) => ReactNode;
  onResetWorkspace: () => void;
}

export function WorkspaceViewArea({
  leftPane,
  rightPane,
  splitEnabled,
  onTabClick,
  onTabClose,
  renderPanel,
  onResetWorkspace,
}: WorkspaceViewAreaProps) {
  const hasLeftTabs = leftPane.tabs.length > 0;
  const hasRightTabs = rightPane.tabs.length > 0;
  const hasAnyTabs = hasLeftTabs || hasRightTabs;

  if (!hasAnyTabs) return null;

  const activeLeftTab = leftPane.tabs.find(t => t.id === leftPane.activeTabId);
  const activeRightTab = rightPane.tabs.find(t => t.id === rightPane.activeTabId);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 mb-4">
      {/* Header with close all button */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Workspace Views
        </span>
        <button
          onClick={onResetWorkspace}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Close all views
        </button>
      </div>

      {/* Pane(s) */}
      <div className={cn('flex', splitEnabled && hasRightTabs ? 'divide-x divide-slate-200 dark:divide-slate-700' : '')}>
        {/* Left pane */}
        {hasLeftTabs && (
          <div className={cn('flex-1 min-w-0', splitEnabled && hasRightTabs ? 'w-1/2' : 'w-full')}>
            <WorkspaceTabStrip
              tabs={leftPane.tabs}
              activeTabId={leftPane.activeTabId}
              onTabClick={(id) => onTabClick('left', id)}
              onTabClose={onTabClose}
              paneLabel={splitEnabled && hasRightTabs ? 'Left' : undefined}
            />
            <div className="p-4 max-h-96 overflow-auto">
              {activeLeftTab && renderPanel(activeLeftTab.panelId)}
            </div>
          </div>
        )}

        {/* Right pane (only if split enabled and has tabs) */}
        {splitEnabled && hasRightTabs && (
          <div className="flex-1 min-w-0 w-1/2">
            <WorkspaceTabStrip
              tabs={rightPane.tabs}
              activeTabId={rightPane.activeTabId}
              onTabClick={(id) => onTabClick('right', id)}
              onTabClose={onTabClose}
              paneLabel="Right"
            />
            <div className="p-4 max-h-96 overflow-auto">
              {activeRightTab && renderPanel(activeRightTab.panelId)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
