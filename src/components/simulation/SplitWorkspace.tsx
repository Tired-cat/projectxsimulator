import { ReactNode } from 'react';
import { X, Columns, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabs } from '@/contexts/TabContext';
import { cn } from '@/lib/utils';

interface SplitWorkspaceProps {
  renderPanelContent: (panelType: string) => ReactNode;
}

/**
 * Split workspace that renders inside the content area.
 * Shows one or two panes based on split state from TabProvider.
 * No secondary navigation - just panels in panes.
 */
export function SplitWorkspace({ renderPanelContent }: SplitWorkspaceProps) {
  const { tabs, split, disableSplit, closeTab } = useTabs();

  if (!split.enabled) return null;

  const leftTab = tabs.find(t => t.id === split.leftTabId);
  const rightTab = tabs.find(t => t.id === split.rightTabId);

  // If no tabs in split, don't render
  if (!leftTab && !rightTab) return null;

  return (
    <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      {/* Split header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Columns className="w-4 h-4" />
          Split View
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disableSplit}
          className="h-7 px-2 text-xs"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          Close Split
        </Button>
      </div>

      {/* Split panes */}
      <div className="flex divide-x divide-slate-200 dark:divide-slate-700">
        {/* Left pane */}
        {leftTab && leftTab.panelType && (
          <div className={cn("flex-1 min-w-0", rightTab ? "w-1/2" : "w-full")}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {leftTab.title}
              </span>
              <button
                onClick={() => closeTab(leftTab.id)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-auto">
              {renderPanelContent(leftTab.panelType)}
            </div>
          </div>
        )}

        {/* Right pane */}
        {rightTab && rightTab.panelType && (
          <div className={cn("flex-1 min-w-0", leftTab ? "w-1/2" : "w-full")}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {rightTab.title}
              </span>
              <button
                onClick={() => closeTab(rightTab.id)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-auto">
              {renderPanelContent(rightTab.panelType)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
