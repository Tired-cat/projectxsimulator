import { motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ChannelConfig } from '@/lib/marketingConstants';
import type { ReasoningToken } from '@/types/reasoningToken';
import { createBaselineToken, createDeltaToken } from '@/types/reasoningToken';
import type { ExternalEvidencePayload } from '@/lib/evidenceDnd';

interface GhostDeltaBarProps {
  channelId: string;
  channel: ChannelConfig;
  currentValue: number;
  baselineValue: number | null;
  maxScale: number;
  viewMode: 'budget' | 'clicks' | 'revenue' | 'profit' | 'all';
  isNegative: boolean;
  isDraggingSpend: boolean;
  isThisBarDragging: boolean;
  isSnapshot: boolean;
  onTokenDrag?: (token: ReasoningToken) => void;
  /** When true, delta/ghost segments use HTML5 drag to create evidence chips */
  reasonMode?: boolean;
  formatValue?: (value: number) => string;
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
  reasonMode = false,
  formatValue,
}: GhostDeltaBarProps) {
  const [isDraggingGhost, setIsDraggingGhost] = useState(false);
  const [isDraggingDelta, setIsDraggingDelta] = useState(false);

  const hasBaseline = baselineValue !== null && !isSnapshot;
  const delta = hasBaseline ? currentValue - baselineValue : 0;
  const hasDelta = Math.abs(delta) > 0;
  const isIncrease = delta > 0;

  // Calculate heights
  const currentHeightPercent = Math.max(0, (Math.abs(currentValue) / maxScale) * 100);
  
  const baselineHeightPercent = hasBaseline 
    ? Math.max(0, (Math.abs(baselineValue) / maxScale) * 100)
    : 0;

  const metricLabel = viewMode === 'budget' ? 'Budget' : viewMode === 'clicks' ? 'Views' : viewMode === 'revenue' ? 'Revenue' : viewMode === 'profit' ? 'Profit' : 'Views';
  // Canonical metric key for evidence_id: use 'views' instead of 'clicks' to match analytics convention
  const metricKey = viewMode === 'clicks' ? 'views' : viewMode;

  const mainPayload = useMemo<ExternalEvidencePayload>(() => {
    const displayValue = formatValue ? formatValue(currentValue) : currentValue.toLocaleString();
    return {
      label: `${channel.name} ${metricLabel}`,
      value: displayValue,
      context: `${metricLabel} • Channel Performance`,
      sourceId: `${channelId}_${metricKey}`,
      chipKind: 'metric',
      channelName: channel.name,
      metricName: metricLabel.toLowerCase(),
    };
  }, [channel.name, channelId, currentValue, formatValue, metricLabel, metricKey]);

  const baselinePayload = useMemo<ExternalEvidencePayload>(() => ({
    label: `${channel.name} Baseline ${metricLabel}`,
    value: baselineValue?.toLocaleString() ?? '0',
    context: `Baseline ${metricLabel} • Channel Performance`,
    sourceId: `${channelId}_baseline_${metricKey}`,
    chipKind: 'baseline',
    channelName: channel.name,
    metricName: metricLabel.toLowerCase(),
  }), [channel.name, channelId, baselineValue, metricLabel, metricKey]);

  const deltaPayload = useMemo<ExternalEvidencePayload>(() => {
    const isInc = delta > 0;
    return {
      label: `${channel.name} ${metricLabel}`,
      value: `${isInc ? '+' : ''}${delta.toLocaleString()}`,
      context: `${isInc ? 'Increased' : 'Decreased'} ${metricLabel} • Channel Performance`,
      sourceId: `${channelId}_delta_${metricKey}`,
      chipKind: isInc ? 'delta-increase' : 'delta-decrease',
      channelName: channel.name,
      metricName: metricLabel.toLowerCase(),
      deltaValue: delta,
    };
  }, [channel.name, channelId, delta, metricLabel, metricKey]);

  // Budget tab: only allow evidence drag in reason mode (otherwise column handles spend-adjustment drag).
  // All other tabs (views/revenue/profit): always draggable — no spend adjustment to conflict with.
  const evidenceDragDisabled = viewMode === 'budget' && !reasonMode;

  const mainDraggable = useDraggable({
    id: `evidence-main-${channelId}-${viewMode}-${isSnapshot ? 'snapshot' : 'live'}`,
    data: {
      kind: 'external-chip',
      payload: mainPayload,
    },
    disabled: evidenceDragDisabled,
  });

  const baselineDraggable = useDraggable({
    id: `evidence-baseline-${channelId}-${viewMode}-${isSnapshot ? 'snapshot' : 'live'}`,
    data: {
      kind: 'external-chip',
      payload: baselinePayload,
    },
    disabled: evidenceDragDisabled || !hasBaseline,
  });

  const deltaDraggable = useDraggable({
    id: `evidence-delta-${channelId}-${viewMode}-${isSnapshot ? 'snapshot' : 'live'}`,
    data: {
      kind: 'external-chip',
      payload: deltaPayload,
    },
    disabled: evidenceDragDisabled || !hasDelta,
  });

  // Ghost bar drag handlers (original mouse-based for token drag — only used on budget tab without reason mode)
  const handleGhostDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (reasonMode || viewMode !== 'budget') return; // dnd-kit handles drag on all other cases
    e.stopPropagation();
    setIsDraggingGhost(true);
    
    if (onTokenDrag && baselineValue !== null) {
      const metricType = 'clicks' as const; // budget tab always maps to clicks
      const token = createBaselineToken(
        channelId,
        channel.name,
        metricType as 'clicks' | 'revenue' | 'profit',
        baselineValue
      );
      onTokenDrag(token);
    }
  }, [channelId, channel.name, baselineValue, viewMode, onTokenDrag, reasonMode]);

  const handleGhostDragEnd = useCallback(() => {
    setIsDraggingGhost(false);
  }, []);

  // Delta segment drag handlers (original mouse-based for token drag — only used on budget tab without reason mode)
  const handleDeltaDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (reasonMode || viewMode !== 'budget') return; // dnd-kit handles drag on all other cases
    e.stopPropagation();
    setIsDraggingDelta(true);
    
    if (onTokenDrag && baselineValue !== null) {
      const metricType = 'clicks' as const; // budget tab always maps to clicks
      const token = createDeltaToken(
        channelId,
        channel.name,
        metricType as 'clicks' | 'revenue' | 'profit',
        baselineValue,
        currentValue
      );
      onTokenDrag(token);
    }
  }, [channelId, channel.name, baselineValue, currentValue, viewMode, onTokenDrag, reasonMode]);

  const handleDeltaDragEnd = useCallback(() => {
    setIsDraggingDelta(false);
  }, []);

  // evidenceDragDisabled=false means dnd-kit is active, so use its isDragging state
  const ghostDragging = !evidenceDragDisabled ? baselineDraggable.isDragging : isDraggingGhost;
  const deltaDragging = !evidenceDragDisabled ? deltaDraggable.isDragging : isDraggingDelta;
  const mainDragging = !evidenceDragDisabled ? mainDraggable.isDragging : false;

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
        <div
          ref={baselineDraggable.setNodeRef}
          {...baselineDraggable.attributes}
          {...baselineDraggable.listeners}
          onMouseDown={evidenceDragDisabled ? handleGhostDragStart : undefined}
          onMouseUp={evidenceDragDisabled ? handleGhostDragEnd : undefined}
          onMouseLeave={evidenceDragDisabled ? handleGhostDragEnd : undefined}
          className={`absolute bottom-0 left-0 right-0 rounded-t-lg pointer-events-auto transition-transform ${
            ghostDragging ? 'cursor-grabbing z-5 scale-105' : 'cursor-grab z-5'
          }`}
          style={{
            backgroundColor: ghostColor,
            borderTop: `2px dashed hsl(var(--muted-foreground) / 0.4)`,
            height: `${Math.max(baselineHeightPercent, 2)}%`,
          }}
          title={reasonMode ? `Drag baseline ${metricLabel}: ${baselineValue?.toLocaleString()}` : `Baseline: ${baselineValue?.toLocaleString()}`}
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-50">
            <div className="w-6 h-1 bg-muted-foreground/40 rounded-full" />
          </div>
          {ghostDragging && (
            <div className="absolute inset-0 rounded-t-lg ring-2 ring-primary ring-offset-1 ring-offset-background" />
          )}
        </div>
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
          {/* Baseline Portion - bottom of stack, draggable when evidence drag is enabled */}
          <motion.div
            ref={mainDraggable.setNodeRef as any}
            {...mainDraggable.attributes}
            {...mainDraggable.listeners}
            className={`w-full shrink-0 ${!evidenceDragDisabled ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''} ${
              isThisBarDragging ? 'ring-2 ring-white ring-offset-2 ring-offset-background z-30' : ''
            } ${mainDragging ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
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
              touchAction: !evidenceDragDisabled ? 'none' : 'auto',
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

          {/* Delta Increase Segment - top of stack, GREEN for increase */}
          <div
            ref={deltaDraggable.setNodeRef}
            {...deltaDraggable.attributes}
            {...deltaDraggable.listeners}
            onMouseDown={evidenceDragDisabled ? handleDeltaDragStart : undefined}
            onMouseUp={evidenceDragDisabled ? handleDeltaDragEnd : undefined}
            onMouseLeave={evidenceDragDisabled ? handleDeltaDragEnd : undefined}
            className={`w-full shrink-0 pointer-events-auto rounded-t-lg transition-transform ${
              deltaDragging ? 'cursor-grabbing z-40 scale-[1.04]' : 'cursor-grab z-35'
            }`}
            style={{
              backgroundColor: 'hsl(142, 71%, 45%)',
              height: deltaHeight > 0 
                ? `${(deltaHeight / currentHeightPercent) * 100}%` 
                : '0%',
              minHeight: deltaHeight > 0 ? '32px' : '0px',
              borderBottom: '2px solid hsl(142, 71%, 35%)',
              borderTop: deltaDragging ? '2px solid white' : 'none',
              boxShadow: deltaDragging 
                ? '0 0 12px hsl(142, 71%, 45%)' 
                : 'none',
            }}
            title={reasonMode ? `Drag increase: +${delta.toLocaleString()}` : `Increase: +${delta.toLocaleString()}`}
          >
            <div className="w-full h-4 flex items-center justify-center bg-white/20 rounded-t-lg">
              <div className="w-8 h-1 bg-white/60 rounded-full" />
            </div>
            {deltaHeight > 3 && (
              <div className="flex items-center justify-center py-0.5">
                <div className="text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap">
                  {reasonMode ? '🧪' : '▲'} +{Math.abs(delta).toLocaleString()}
                </div>
              </div>
            )}
            {deltaDragging && (
              <div 
                className="absolute inset-0 ring-2 ring-white ring-offset-1 ring-offset-background rounded-t-lg"
              />
            )}
          </div>
        </div>
      ) : (
        // SINGLE BAR: No increase delta, render full current bar
        <>
          {/* Single bar - draggable when evidence drag is enabled */}
          <motion.div
            ref={mainDraggable.setNodeRef as any}
            {...mainDraggable.attributes}
            {...mainDraggable.listeners}
            className={`relative w-full rounded-t-lg ${!evidenceDragDisabled ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''} ${
              isThisBarDragging ? 'ring-2 ring-white ring-offset-2 ring-offset-background z-30' : 'z-10'
            } ${mainDragging ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
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
              touchAction: !evidenceDragDisabled ? 'none' : 'auto',
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
            <div
              ref={deltaDraggable.setNodeRef}
              {...deltaDraggable.attributes}
              {...deltaDraggable.listeners}
              onMouseDown={evidenceDragDisabled ? handleDeltaDragStart : undefined}
              onMouseUp={evidenceDragDisabled ? handleDeltaDragEnd : undefined}
              onMouseLeave={evidenceDragDisabled ? handleDeltaDragEnd : undefined}
              className={`absolute left-0 right-0 pointer-events-auto transition-transform ${
                deltaDragging ? 'cursor-grabbing z-40 scale-[1.08]' : 'cursor-grab z-35'
              }`}
              style={{
                bottom: `${currentHeightPercent}%`,
                height: `${deltaHeight}%`,
                backgroundColor: deltaDecreaseColor,
                borderRadius: '0 0 0.5rem 0.5rem',
                boxShadow: deltaDragging 
                  ? `0 0 20px ${deltaDecreaseColor}` 
                  : 'none',
              }}
              title={reasonMode ? `Drag decrease: ${delta.toLocaleString()}` : `Decrease: ${delta.toLocaleString()}`}
            >
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap">
                  {reasonMode ? '🧪' : '▼'} {Math.abs(delta).toLocaleString()}
                </div>
              </div>
              {deltaDragging && (
                <div 
                  className="absolute inset-0 ring-2 ring-white ring-offset-1 ring-offset-background"
                  style={{ borderRadius: '0 0 0.5rem 0.5rem' }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
