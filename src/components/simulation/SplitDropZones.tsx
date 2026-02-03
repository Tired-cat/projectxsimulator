import { DragEvent, useState } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabs } from '@/contexts/TabContext';
import type { PanelId } from '@/types/workspaceTypes';

const PANEL_TITLES: Record<PanelId, string> = {
  'channel-performance': 'Channel Performance',
  'product-mix': 'Product Mix',
  'goal-tracker': 'Goal Tracker',
  'hints': 'Hints & Tips',
  'assumptions': 'Assumptions',
};

/**
 * Subtle drop zones that appear only during drag.
 * Left/right edges for split view.
 */
export function SplitDropZones() {
  const { draggingPanelId, openPanelInSplit } = useTabs();
  const [activeZone, setActiveZone] = useState<'left' | 'right' | null>(null);

  if (!draggingPanelId) return null;

  const handleDragOver = (zone: 'left' | 'right') => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveZone(zone);
  };

  const handleDragLeave = () => {
    setActiveZone(null);
  };

  const handleDrop = (zone: 'left' | 'right') => (e: DragEvent) => {
    e.preventDefault();
    setActiveZone(null);
    
    const panelId = e.dataTransfer.getData('panelId') as PanelId;
    if (panelId) {
      openPanelInSplit(panelId, PANEL_TITLES[panelId] || panelId, zone);
    }
  };

  return (
    <>
      {/* Left drop zone */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-20 z-40 transition-all duration-150",
          "flex items-center justify-center",
          activeZone === 'left'
            ? "bg-blue-500/20 border-2 border-dashed border-blue-400"
            : "bg-transparent"
        )}
        onDragOver={handleDragOver('left')}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop('left')}
      >
        <div className={cn(
          "flex flex-col items-center gap-1 transition-opacity",
          activeZone === 'left' ? "opacity-100" : "opacity-40"
        )}>
          <PanelLeft className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-medium text-blue-600">Left</span>
        </div>
      </div>

      {/* Right drop zone */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-20 z-40 transition-all duration-150",
          "flex items-center justify-center",
          activeZone === 'right'
            ? "bg-blue-500/20 border-2 border-dashed border-blue-400"
            : "bg-transparent"
        )}
        onDragOver={handleDragOver('right')}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop('right')}
      >
        <div className={cn(
          "flex flex-col items-center gap-1 transition-opacity",
          activeZone === 'right' ? "opacity-100" : "opacity-40"
        )}>
          <PanelRight className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-medium text-blue-600">Right</span>
        </div>
      </div>
    </>
  );
}
