import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import type { ChannelConfig } from '@/lib/marketingConstants';
import type { ReasoningToken } from '@/types/reasoningToken';
import { createBaselineToken, createDeltaToken } from '@/types/reasoningToken';

interface GhostDeltaBarProps {
  channelId: string;
  channel: ChannelConfig;
  currentValue: number;
  baselineValue: number | null;
  maxScale: number;
  viewMode: 'clicks' | 'revenue' | 'profit' | 'all';
  isNegative: boolean;
  isDraggingSpend: boolean;
  isThisBarDragging: boolean;
  isSnapshot: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTokenDrag?: (token: ReasoningToken) => void;
}

export function GhostDeltaBar({
  channelId,
  channel,
  currentValue,
  baselineValue,
  maxScale,
  viewMode,
  isNegative,
  isDraggingSpend,
  isThisBarDragging,
  isSnapshot,
  onMouseDown,
  onTokenDrag,
}: GhostDeltaBarProps) {
  const [isDraggingGhost, setIsDraggingGhost] = useState(false);
  const [isDraggingDelta, setIsDraggingDelta] = useState(false);

  const hasBaseline = baselineValue !== null && !isSnapshot;
  const delta = hasBaseline ? currentValue - baselineValue : 0;
  const hasDelta = Math.abs(delta) > 0;
  const isIncrease = delta > 0;

  // Calculate heights
  const currentHeightPercent = isNegative 
    ? 0 
    : Math.max(0, (Math.abs(currentValue) / maxScale) * 100);
  
  const baselineHeightPercent = hasBaseline 
    ? Math.max(0, (Math.abs(baselineValue) / maxScale) * 100)
    : 0;

  // Ghost bar drag handlers
  const handleGhostDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingGhost(true);
    
    if (onTokenDrag && baselineValue !== null) {
      const metricType = viewMode === 'all' ? 'clicks' : viewMode;
      const token = createBaselineToken(
        channelId,
        channel.name,
        metricType as 'clicks' | 'revenue' | 'profit',
        baselineValue
      );
      onTokenDrag(token);
    }
  }, [channelId, channel.name, baselineValue, viewMode, onTokenDrag]);

  const handleGhostDragEnd = useCallback(() => {
    setIsDraggingGhost(false);
  }, []);

  // Delta segment drag handlers
  const handleDeltaDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingDelta(true);
    
    if (onTokenDrag && baselineValue !== null) {
      const metricType = viewMode === 'all' ? 'clicks' : viewMode;
      const token = createDeltaToken(
        channelId,
        channel.name,
        metricType as 'clicks' | 'revenue' | 'profit',
        baselineValue,
        currentValue
      );
      onTokenDrag(token);
    }
  }, [channelId, channel.name, baselineValue, currentValue, viewMode, onTokenDrag]);

  const handleDeltaDragEnd = useCallback(() => {
    setIsDraggingDelta(false);
  }, []);

  // Colors for delta
  const deltaIncreaseColor = 'hsl(142, 76%, 36%)'; // Green
  const deltaDecreaseColor = 'hsl(0, 84%, 60%)'; // Red
  const ghostColor = 'hsl(var(--muted-foreground) / 0.25)';

  return (
    <div className="relative w-full max-w-[80px] h-full flex items-end">
      {/* Ghost Baseline Bar - always visible when baseline exists */}
      {hasBaseline && (
        <motion.div
          className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${
            isDraggingGhost ? 'cursor-grabbing z-20' : 'cursor-grab z-5'
          }`}
          style={{
            backgroundColor: ghostColor,
            borderTop: `2px dashed hsl(var(--muted-foreground) / 0.4)`,
          }}
          initial={false}
          animate={{ 
            height: `${Math.max(baselineHeightPercent, 2)}%`,
            scale: isDraggingGhost ? 1.05 : 1,
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 25,
          }}
          onMouseDown={handleGhostDragStart}
          onMouseUp={handleGhostDragEnd}
          onMouseLeave={handleGhostDragEnd}
          title={`Baseline: ${baselineValue?.toLocaleString()}`}
        >
          {/* Ghost grab handle */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-50">
            <div className="w-6 h-1 bg-muted-foreground/40 rounded-full" />
          </div>
          {isDraggingGhost && (
            <div className="absolute inset-0 rounded-t-lg ring-2 ring-primary ring-offset-1 ring-offset-background" />
          )}
        </motion.div>
      )}

      {/* Main Current Bar */}
      <motion.div
        className={`relative w-full rounded-t-lg ${
          isSnapshot ? 'cursor-default' : 'cursor-ns-resize'
        } ${
          isThisBarDragging ? 'ring-2 ring-white ring-offset-2 ring-offset-background z-30' : 'z-10'
        }`}
        style={{
          backgroundColor: isNegative 
            ? 'hsl(var(--destructive))' 
            : channel.color,
          boxShadow: isThisBarDragging 
            ? `0 0 30px ${channel.color}` 
            : `0 4px 12px ${channel.color}40`,
          willChange: isDraggingSpend ? 'height, transform' : 'auto',
          opacity: isSnapshot ? 0.85 : 1,
          filter: isSnapshot ? 'saturate(0.8)' : 'none',
        }}
        initial={false}
        animate={{ 
          height: `${Math.max(currentHeightPercent, 2)}%`,
          scale: isThisBarDragging ? 1.02 : 1,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: isDraggingSpend ? 500 : 200, 
          damping: isDraggingSpend ? 35 : 25,
          duration: isDraggingSpend ? 0.1 : undefined,
        }}
        onMouseDown={onMouseDown}
      >
        {/* Spend drag handle */}
        <div className="w-full h-4 flex items-center justify-center rounded-t-lg bg-white/20">
          <div className="w-10 h-1.5 bg-white/60 rounded-full" />
        </div>
      </motion.div>

      {/* Delta Overlay Segment - only the difference portion */}
      {hasDelta && hasBaseline && (
        <motion.div
          className={`absolute left-0 right-0 ${
            isDraggingDelta ? 'cursor-grabbing z-40' : 'cursor-grab z-35'
          }`}
          style={{
            bottom: isIncrease ? `${baselineHeightPercent}%` : `${currentHeightPercent}%`,
            backgroundColor: isIncrease ? deltaIncreaseColor : deltaDecreaseColor,
            borderRadius: isIncrease ? '0.5rem 0.5rem 0 0' : '0 0 0.5rem 0.5rem',
            boxShadow: isDraggingDelta 
              ? `0 0 20px ${isIncrease ? deltaIncreaseColor : deltaDecreaseColor}` 
              : 'none',
          }}
          initial={false}
          animate={{ 
            height: `${Math.abs(currentHeightPercent - baselineHeightPercent)}%`,
            scale: isDraggingDelta ? 1.08 : 1,
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 25,
          }}
          onMouseDown={handleDeltaDragStart}
          onMouseUp={handleDeltaDragEnd}
          onMouseLeave={handleDeltaDragEnd}
          title={`Delta: ${isIncrease ? '+' : ''}${delta.toLocaleString()}`}
        >
          {/* Delta indicator */}
          <div className={`absolute ${isIncrease ? 'top-1' : 'bottom-1'} left-1/2 -translate-x-1/2 flex flex-col items-center`}>
            <div className="text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap">
              {isIncrease ? '▲' : '▼'} {Math.abs(delta).toLocaleString()}
            </div>
          </div>
          {isDraggingDelta && (
            <div 
              className="absolute inset-0 ring-2 ring-white ring-offset-1 ring-offset-background"
              style={{ borderRadius: isIncrease ? '0.5rem 0.5rem 0 0' : '0 0 0.5rem 0.5rem' }}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
