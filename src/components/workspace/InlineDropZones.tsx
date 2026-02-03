import { cn } from '@/lib/utils';
import { PanelLeft, PanelRight } from 'lucide-react';
import type { DropTarget } from '@/types/workspaceTypes';

interface InlineDropZonesProps {
  visible: boolean;
  onDrop: (target: DropTarget) => void;
  activeTarget: DropTarget | null;
  setActiveTarget: (target: DropTarget | null) => void;
}

/**
 * Subtle inline drop zones that appear inside My Decisions content during drag.
 * No floating bars - just left/right edge highlights.
 */
export function InlineDropZones({ visible, onDrop, activeTarget, setActiveTarget }: InlineDropZonesProps) {
  if (!visible) return null;

  const handleDragOver = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTarget(target);
  };

  const handleDragLeave = () => {
    setActiveTarget(null);
  };

  const handleDrop = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(target);
    setActiveTarget(null);
  };

  return (
    <>
      {/* Left edge drop zone */}
      <div
        onDragOver={(e) => handleDragOver(e, 'split-left')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'split-left')}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-16 z-40 transition-all duration-150',
          'flex items-center justify-center',
          activeTarget === 'split-left'
            ? 'bg-blue-500/20 border-r-4 border-blue-500'
            : 'bg-transparent hover:bg-blue-500/10'
        )}
      >
        <div className={cn(
          'flex flex-col items-center gap-1 p-2 rounded-lg transition-opacity',
          activeTarget === 'split-left' ? 'opacity-100' : 'opacity-50'
        )}>
          <PanelLeft className="h-5 w-5 text-blue-600" />
          <span className="text-xs font-medium text-blue-600 whitespace-nowrap">Left</span>
        </div>
      </div>

      {/* Right edge drop zone */}
      <div
        onDragOver={(e) => handleDragOver(e, 'split-right')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'split-right')}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-16 z-40 transition-all duration-150',
          'flex items-center justify-center',
          activeTarget === 'split-right'
            ? 'bg-blue-500/20 border-l-4 border-blue-500'
            : 'bg-transparent hover:bg-blue-500/10'
        )}
      >
        <div className={cn(
          'flex flex-col items-center gap-1 p-2 rounded-lg transition-opacity',
          activeTarget === 'split-right' ? 'opacity-100' : 'opacity-50'
        )}>
          <PanelRight className="h-5 w-5 text-blue-600" />
          <span className="text-xs font-medium text-blue-600 whitespace-nowrap">Right</span>
        </div>
      </div>

      {/* Center drop zone - creates a tab view */}
      <div
        onDragOver={(e) => handleDragOver(e, 'tab')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'tab')}
        className={cn(
          'absolute inset-x-20 top-4 h-12 z-30 transition-all duration-150 rounded-lg',
          'flex items-center justify-center',
          activeTarget === 'tab'
            ? 'bg-blue-500/15 border-2 border-dashed border-blue-500'
            : 'bg-slate-500/5 border-2 border-dashed border-transparent'
        )}
      >
        <span className={cn(
          'text-sm font-medium transition-opacity',
          activeTarget === 'tab' ? 'text-blue-600 opacity-100' : 'text-slate-400 opacity-60'
        )}>
          Drop to open view
        </span>
      </div>
    </>
  );
}
