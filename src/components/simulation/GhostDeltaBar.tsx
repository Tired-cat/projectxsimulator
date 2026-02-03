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
  const deltaDecreaseColor = 'hsl(0, 84%, 60%)'; // Red
  const ghostColor = 'hsl(var(--muted-foreground) / 0.25)';

  // For stacked bar: calculate the height of the baseline portion (capped at baseline)
  const baselinePortionHeight = hasBaseline && isIncrease 
    ? baselineHeightPercent 
    : currentHeightPercent;

  // Delta height is the absolute difference
  const deltaHeight = Math.abs(currentHeightPercent - baselineHeightPercent);

  return (
    // Bar container - uses flexbox for proper stacking, pointer events pass through to column for drag
    <div 
      className="relative w-full max-w-[80px] h-full flex flex-col items-stretch justify-end pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {/* Ghost Baseline Bar - faint shadow showing the original state */}
      {hasBaseline && (
        <motion.div
          className={`absolute bottom-0 left-0 right-0 rounded-t-lg pointer-events-auto ${
            isDraggingGhost ? 'cursor-grabbing z-5' : 'cursor-grab z-5'
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

      {/* STACKED BAR using flexbox - grows from bottom */}
      {/* When increasing: Delta segment (top, rendered first in column-reverse) + Baseline portion (bottom) */}
      {/* When decreasing or no delta: Full current bar */}
      
      {hasBaseline && isIncrease ? (
        // STACKED using flex-col-reverse: items render bottom-up
        <div 
          className="flex flex-col-reverse items-stretch z-10"
          style={{ 
            height: `${currentHeightPercent}%`,
            minHeight: '4px',
          }}
        >
          {/* Baseline Portion - bottom of stack */}
          <motion.div
            className={`w-full shrink-0 ${
              isThisBarDragging ? 'ring-2 ring-white ring-offset-2 ring-offset-background z-30' : ''
            }`}
            style={{
              backgroundColor: channel.color,
              // Explicit height based on proportion of baseline within total current
              height: baselineHeightPercent > 0 
                ? `${(baselineHeightPercent / currentHeightPercent) * 100}%` 
                : '0%',
              minHeight: baselineHeightPercent > 0 ? '2px' : '0px',
              boxShadow: isThisBarDragging 
                ? `0 0 30px ${channel.color}` 
                : `0 4px 12px ${channel.color}40`,
              willChange: isDraggingSpend ? 'height' : 'auto',
              opacity: isSnapshot ? 0.85 : 1,
              filter: isSnapshot ? 'saturate(0.8)' : 'none',
            }}
            initial={false}
            animate={{ 
              scale: isThisBarDragging ? 1.02 : 1,
            }}
            transition={{ 
              type: 'spring', 
              stiffness: isDraggingSpend ? 500 : 200, 
              damping: isDraggingSpend ? 35 : 25,
            }}
          />

          {/* Delta Increase Segment - top of stack, SOLID color with hard edge */}
          <motion.div
            className={`w-full shrink-0 pointer-events-auto rounded-t-lg ${
              isDraggingDelta ? 'cursor-grabbing z-40' : 'cursor-grab z-35'
            }`}
            style={{
              // Solid distinct color - lighter/brighter variant
              backgroundColor: `color-mix(in srgb, ${channel.color} 85%, white 15%)`,
              // Explicit height based on proportion of delta within total current
              height: deltaHeight > 0 
                ? `${(deltaHeight / currentHeightPercent) * 100}%` 
                : '0%',
              minHeight: deltaHeight > 0 ? '16px' : '0px', // Minimum height for visibility
              // Hard edge separator - no glow, just a clean border
              borderBottom: `2px solid ${channel.color}`,
              borderTop: isDraggingDelta ? '2px solid white' : 'none',
              boxShadow: isDraggingDelta 
                ? `0 0 12px ${channel.color}` 
                : 'none',
            }}
            initial={false}
            animate={{ 
              scale: isDraggingDelta ? 1.04 : 1,
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 25,
            }}
            onMouseDown={handleDeltaDragStart}
            onMouseUp={handleDeltaDragEnd}
            onMouseLeave={handleDeltaDragEnd}
            title={`Increase: +${delta.toLocaleString()}`}
          >
            {/* Drag handle for delta increase */}
            <div className="w-full h-4 flex items-center justify-center bg-white/20 rounded-t-lg">
              <div className="w-8 h-1 bg-white/60 rounded-full" />
            </div>
            {/* Delta indicator - only show if segment tall enough */}
            {deltaHeight > 3 && (
              <div className="flex items-center justify-center py-0.5">
                <div className="text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap">
                  ▲ +{Math.abs(delta).toLocaleString()}
                </div>
              </div>
            )}
            {isDraggingDelta && (
              <div 
                className="absolute inset-0 ring-2 ring-white ring-offset-1 ring-offset-background rounded-t-lg"
              />
            )}
          </motion.div>
        </div>
      ) : (
        // SINGLE BAR: No increase delta, render full current bar
        <>
          {/* Single bar - pointer events pass through to column */}
          <motion.div
            className={`relative w-full rounded-t-lg ${
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
          >
            {/* Spend drag handle - visual only, drag handled by column */}
            <div className="w-full h-4 flex items-center justify-center rounded-t-lg bg-white/20">
              <div className="w-10 h-1.5 bg-white/60 rounded-full" />
            </div>
          </motion.div>

          {/* Delta Decrease Segment - visible gap between ghost and current, draggable for reasoning */}
          {hasDelta && hasBaseline && !isIncrease && (
            <motion.div
              className={`absolute left-0 right-0 pointer-events-auto ${
                isDraggingDelta ? 'cursor-grabbing z-40' : 'cursor-grab z-35'
              }`}
              style={{
                bottom: `${currentHeightPercent}%`,
                backgroundColor: deltaDecreaseColor,
                borderRadius: '0 0 0.5rem 0.5rem',
                boxShadow: isDraggingDelta 
                  ? `0 0 20px ${deltaDecreaseColor}` 
                  : 'none',
              }}
              initial={false}
              animate={{ 
                height: `${deltaHeight}%`,
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
              title={`Decrease: ${delta.toLocaleString()}`}
            >
              {/* Delta indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap">
                  ▼ {Math.abs(delta).toLocaleString()}
                </div>
              </div>
              {isDraggingDelta && (
                <div 
                  className="absolute inset-0 ring-2 ring-white ring-offset-1 ring-offset-background"
                  style={{ borderRadius: '0 0 0.5rem 0.5rem' }}
                />
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
