import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewTab } from '@/types/workspaceTypes';

interface WorkspaceTabStripProps {
  tabs: ViewTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  paneLabel?: string;
}

export function WorkspaceTabStrip({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose,
  paneLabel 
}: WorkspaceTabStripProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      {paneLabel && (
        <span className="text-xs text-slate-400 mr-2 uppercase tracking-wide">{paneLabel}</span>
      )}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabClick(tab.id)}
          className={cn(
            'group flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors',
            activeTabId === tab.id
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          <span className="truncate max-w-32">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded p-0.5 transition-opacity"
            title="Close view"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
