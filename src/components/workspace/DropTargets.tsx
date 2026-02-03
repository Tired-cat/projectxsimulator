import { cn } from '@/lib/utils';
import { Plus, PanelLeft, PanelRight } from 'lucide-react';
import type { DropTarget } from '@/types/workspaceTypes';

interface DropTargetsProps {
  visible: boolean;
  onDrop: (target: DropTarget) => void;
  activeTarget: DropTarget | null;
  setActiveTarget: (target: DropTarget | null) => void;
}

export function DropTargets({ visible, onDrop, activeTarget, setActiveTarget }: DropTargetsProps) {
  if (!visible) return null;

  const targets: { id: DropTarget; label: string; icon: typeof Plus }[] = [
    { id: 'tab', label: 'Open as Tab', icon: Plus },
    { id: 'split-left', label: 'Open Left', icon: PanelLeft },
    { id: 'split-right', label: 'Open Right', icon: PanelRight },
  ];

  return (
    <div className="absolute inset-x-0 top-0 z-50 flex justify-center gap-3 py-3 px-4 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-auto">
      {targets.map(({ id, label, icon: Icon }) => (
        <div
          key={id}
          onDragOver={(e) => {
            e.preventDefault();
            setActiveTarget(id);
          }}
          onDragLeave={() => setActiveTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            onDrop(id);
            setActiveTarget(null);
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-150',
            'text-sm font-medium cursor-pointer',
            activeTarget === id
              ? 'border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-300 scale-105'
              : 'border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-blue-400'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </div>
      ))}
    </div>
  );
}
