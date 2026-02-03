import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  className?: string;
}

export function DragHandle({ className }: DragHandleProps) {
  return (
    <div 
      className={cn(
        'cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
        'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
        className
      )}
      title="Drag to open in tab or split view"
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );
}
