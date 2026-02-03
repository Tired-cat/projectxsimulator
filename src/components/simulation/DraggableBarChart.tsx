import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHANNELS, GLOBAL_BUDGET } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { Eye, DollarSign, TrendingUp, LayoutGrid } from 'lucide-react';
import { GhostDeltaBar } from './GhostDeltaBar';
import type { ReasoningToken } from '@/types/reasoningToken';

type ChartMode = 'live' | 'snapshot';

interface DraggableBarChartProps {
  channelSpend: ChannelSpend;
  onSpendChange: (channelId: keyof ChannelSpend, value: number) => void;
  channelMetrics: Record<string, ReturnType<typeof calculateMixedRevenue>>;
  totals: {
    clicks: number;
    totalRevenue: number;
    profit: number;
  };
  remainingBudget: number;
  mode?: ChartMode;
  /** When true, the chart fits within its parent container (no minHeight) */
  fillContainer?: boolean;
  /** Baseline spend values for ghost bars (comparison mode) */
  baselineSpend?: ChannelSpend | null;
  /** Baseline metrics calculated from baseline spend */
  baselineMetrics?: Record<string, ReturnType<typeof calculateMixedRevenue>> | null;
  /** Callback when a reasoning token is dragged from ghost/delta */
  onTokenDrag?: (token: ReasoningToken) => void;
}

type ViewMode = 'clicks' | 'revenue' | 'profit' | 'all';

const filterOptions = [
  { id: 'clicks' as ViewMode, label: 'Views', icon: Eye },
  { id: 'revenue' as ViewMode, label: 'Revenue', icon: DollarSign },
  { id: 'profit' as ViewMode, label: 'Profit', icon: TrendingUp },
  { id: 'all' as ViewMode, label: 'Show All', icon: LayoutGrid },
];

// Fixed height for the entire component to prevent layout shift (used in single view)
const COMPONENT_MIN_HEIGHT = 580;

export function DraggableBarChart({
  channelSpend,
  onSpendChange,
  channelMetrics,
  totals,
  remainingBudget,
  mode = 'live',
  fillContainer = false,
  baselineSpend = null,
  baselineMetrics = null,
  onTokenDrag,
}: DraggableBarChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('clicks');
  
  // Snapshot mode: draggable for reasoning but NOT adjustable
  // Live mode: adjustable but NOT draggable (for now)
  const isSnapshot = mode === 'snapshot';
  const [draggingChannel, setDraggingChannel] = useState<string | null>(null);
  // COMMIT-ON-RELEASE: Track draft spend locally during drag
  const [draftSpend, setDraftSpend] = useState<ChannelSpend | null>(null);
  // Cursor position for tooltip (relative to chart container)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  // Stable Y-axis scale that only updates on drag end (prevents jitter)
  const [stableMaxScale, setStableMaxScale] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Use draft spend during drag, otherwise use real spend
  const displaySpend = draftSpend ?? channelSpend;

  // Calculate dynamic max scale based on actual data values
  const calculateDynamicMaxScale = useCallback(() => {
    // Get all current values based on view mode
    const allValues: number[] = [];
    
    Object.keys(CHANNELS).forEach((channelId) => {
      const metrics = channelMetrics[channelId];
      if (metrics) {
        switch (viewMode) {
          case 'clicks':
            allValues.push(Math.abs(metrics.clicks));
            break;
          case 'revenue':
            allValues.push(Math.abs(metrics.totalRevenue));
            break;
          case 'profit':
            allValues.push(Math.abs(metrics.profit));
            break;
          case 'all':
            allValues.push(Math.abs(metrics.clicks));
            break;
        }
      }
      // Also consider baseline values for comparison mode
      if (baselineMetrics?.[channelId]) {
        const baseline = baselineMetrics[channelId];
        switch (viewMode) {
          case 'clicks':
            allValues.push(Math.abs(baseline.clicks));
            break;
          case 'revenue':
            allValues.push(Math.abs(baseline.totalRevenue));
            break;
          case 'profit':
            allValues.push(Math.abs(baseline.profit));
            break;
          case 'all':
            allValues.push(Math.abs(baseline.clicks));
            break;
        }
      }
    });
    
    const maxValue = Math.max(...allValues, 1000); // Minimum floor
    // Add 15% headroom and round to clean number
    const withHeadroom = maxValue * 1.15;
    
    // Round to clean tick values (nearest 5k, 10k, etc.)
    const magnitude = Math.pow(10, Math.floor(Math.log10(withHeadroom)));
    const normalized = withHeadroom / magnitude;
    let cleanMultiplier: number;
    if (normalized <= 1.5) cleanMultiplier = 1.5;
    else if (normalized <= 2) cleanMultiplier = 2;
    else if (normalized <= 2.5) cleanMultiplier = 2.5;
    else if (normalized <= 3) cleanMultiplier = 3;
    else if (normalized <= 4) cleanMultiplier = 4;
    else if (normalized <= 5) cleanMultiplier = 5;
    else if (normalized <= 7.5) cleanMultiplier = 7.5;
    else cleanMultiplier = 10;
    
    return Math.ceil(cleanMultiplier * magnitude);
  }, [viewMode, channelMetrics, baselineMetrics]);

  // Use stable scale during drag, recalculate on drag end or view mode change
  const maxScale = stableMaxScale ?? calculateDynamicMaxScale();

  // Update stable scale when not dragging
  useEffect(() => {
    if (!draggingChannel) {
      const newScale = calculateDynamicMaxScale();
      // Only update if significantly different (>10% change) to reduce updates
      if (!stableMaxScale || Math.abs(newScale - stableMaxScale) / stableMaxScale > 0.1) {
        setStableMaxScale(newScale);
      }
    }
  }, [draggingChannel, calculateDynamicMaxScale, stableMaxScale]);

  // Reset stable scale when view mode changes
  useEffect(() => {
    setStableMaxScale(null);
  }, [viewMode]);

  // Y-axis labels based on view mode - generate 5 clean ticks
  const getYAxisLabels = useCallback(() => {
    const isDollar = viewMode === 'revenue' || viewMode === 'profit';
    const prefix = isDollar ? '$' : '';
    
    // Format large numbers compactly
    const formatTick = (val: number) => {
      if (val >= 1000) {
        return `${prefix}${(val / 1000).toLocaleString()}k`;
      }
      return `${prefix}${val.toLocaleString()}`;
    };
    
    return [
      formatTick(maxScale),
      formatTick(maxScale * 0.75),
      formatTick(maxScale * 0.5),
      formatTick(maxScale * 0.25),
      isDollar ? '$0' : '0',
    ];
  }, [viewMode, maxScale]);

  // Get bar value based on view mode
  const getBarValue = useCallback((channelId: string) => {
    const metrics = channelMetrics[channelId];
    if (!metrics) return { primary: 0, secondary: null };
    
    switch (viewMode) {
      case 'clicks':
        return { primary: metrics.clicks, secondary: null };
      case 'revenue':
        return { primary: metrics.totalRevenue, secondary: null };
      case 'profit':
        return { primary: metrics.profit, secondary: null };
      case 'all':
        return { primary: metrics.clicks, secondary: metrics.totalRevenue };
      default:
        return { primary: 0, secondary: null };
    }
  }, [viewMode, channelMetrics]);

  // Get baseline value based on view mode
  const getBaselineValue = useCallback((channelId: string): number | null => {
    if (!baselineMetrics) return null;
    const metrics = baselineMetrics[channelId];
    if (!metrics) return null;
    
    switch (viewMode) {
      case 'clicks':
        return metrics.clicks;
      case 'revenue':
        return metrics.totalRevenue;
      case 'profit':
        return metrics.profit;
      case 'all':
        return metrics.clicks;
      default:
        return null;
    }
  }, [viewMode, baselineMetrics]);

  // Get bar height for display (uses draft during drag)
  const getBarHeightPercent = useCallback((channelId: string) => {
    const spend = displaySpend[channelId as keyof ChannelSpend];
    // Simple linear relationship: bar height = spend / global budget
    return (spend / GLOBAL_BUDGET) * 100;
  }, [displaySpend]);

  // Lock body scroll during drag
  useEffect(() => {
    if (draggingChannel) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        // Cleanup RAF on unmount
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [draggingChannel]);

  // Get step size based on modifier keys
  const getStepSize = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (e.shiftKey) return 5;      // Ultra-fine: Shift
    if (e.altKey) return 250;      // Coarse: Alt/Option
    return 25;                      // Default: precise but not too slow
  }, []);

  // Column-based drag start - captures pointer on entire column area
  const handleColumnPointerDown = useCallback((channelId: string, e: React.PointerEvent) => {
    // Snapshot mode: bars are NOT adjustable
    if (isSnapshot) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    // Initialize draft with current spend values
    setDraftSpend({ ...channelSpend });
    setDraggingChannel(channelId);
    
    // Immediately compute initial value from pointer position
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      const chartHeight = rect.height - 80; // account for padding
      const mouseY = e.clientY - rect.top - 40;
      
      const percentage = 1 - Math.max(0, Math.min(1, mouseY / chartHeight));
      const step = getStepSize(e);
      const newValue = Math.round((percentage * GLOBAL_BUDGET) / step) * step;
      
      const otherSpend = Object.entries(channelSpend)
        .filter(([id]) => id !== channelId)
        .reduce((sum, [, val]) => sum + val, 0);
      const maxAllowed = GLOBAL_BUDGET - otherSpend;
      const clampedValue = Math.min(Math.max(0, newValue), maxAllowed);
      
      setDraftSpend(prev => prev ? {
        ...prev,
        [channelId]: clampedValue
      } : { ...channelSpend, [channelId]: clampedValue });
    }
  }, [channelSpend, isSnapshot, getStepSize]);

  const handleColumnPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingChannel || !chartRef.current || !draftSpend) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Capture values we need before RAF (event properties may be nullified)
    const clientX = e.clientX;
    const clientY = e.clientY;
    const shiftKey = e.shiftKey;
    const altKey = e.altKey;

    // Update cursor position for tooltip (synchronous for responsiveness)
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      setCursorPos({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }

    // Use RAF for smooth visual updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!chartRef.current || !draggingChannel) return;
      
      const rect = chartRef.current.getBoundingClientRect();
      const chartHeight = rect.height - 80;
      const mouseY = clientY - rect.top - 40;
      
      const percentage = 1 - Math.max(0, Math.min(1, mouseY / chartHeight));
      
      // Determine step based on modifiers (captured before RAF)
      let step = 25; // default
      if (shiftKey) step = 5;      // ultra-fine
      else if (altKey) step = 250;  // coarse
      
      const newValue = Math.round((percentage * GLOBAL_BUDGET) / step) * step;
      
      const otherSpend = Object.entries(draftSpend)
        .filter(([id]) => id !== draggingChannel)
        .reduce((sum, [, val]) => sum + val, 0);
      const maxAllowed = GLOBAL_BUDGET - otherSpend;
      const clampedValue = Math.min(Math.max(0, newValue), maxAllowed);
      
      // Immediate update to draft - no debouncing
      setDraftSpend(prev => prev ? {
        ...prev,
        [draggingChannel]: clampedValue
      } : null);
    });
  }, [draggingChannel, draftSpend]);

  const handleColumnPointerUp = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    
    // COMMIT: Apply final draft value to parent state on release
    if (draggingChannel && draftSpend) {
      const finalValue = draftSpend[draggingChannel as keyof ChannelSpend];
      onSpendChange(draggingChannel as keyof ChannelSpend, finalValue);
    }
    
    // Clear draft, cursor, and dragging state
    setDraftSpend(null);
    setDraggingChannel(null);
    setCursorPos(null);
    
    // Update Y-axis scale after drag ends
    setStableMaxScale(null);
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [draggingChannel, draftSpend, onSpendChange]);

  const formatValue = (value: number) => {
    if (viewMode === 'clicks') {
      return value.toLocaleString();
    }
    return `$${value.toLocaleString()}`;
  };

  const isDragging = draggingChannel !== null;

  // Get tooltip data for current drag
  const getTooltipData = useCallback(() => {
    if (!draggingChannel || !draftSpend) return null;
    
    const channel = CHANNELS[draggingChannel as keyof typeof CHANNELS];
    const currentSpend = draftSpend[draggingChannel as keyof ChannelSpend];
    const baselineSpendValue = baselineSpend?.[draggingChannel as keyof ChannelSpend] ?? channelSpend[draggingChannel as keyof ChannelSpend];
    const delta = currentSpend - baselineSpendValue;
    
    return {
      channelName: channel.name,
      channelColor: channel.color,
      currentSpend,
      delta,
    };
  }, [draggingChannel, draftSpend, baselineSpend, channelSpend]);

  return (
    // Fixed-height sandbox container - prevents ALL layout propagation during drag
    // In fillContainer mode, the parent controls the height
    <div 
      ref={containerRef}
      className={fillContainer ? 'h-full' : ''}
      style={fillContainer ? {
        // Let parent control height, just isolate layout
        contain: 'layout style',
        isolation: 'isolate',
        overflow: 'hidden',
      } : {
        // Fixed minimum height prevents document reflow
        minHeight: `${COMPONENT_MIN_HEIGHT}px`,
        contain: 'layout style',
        isolation: 'isolate',
        overflow: 'visible',
      }}
    >
      <Card className={`border-2 bg-card ${fillContainer ? 'h-full flex flex-col' : ''} ${isSnapshot ? 'border-slate-300 dark:border-slate-700' : 'border-primary/20'}`}>
        <CardHeader className={`pb-2 ${fillContainer ? 'flex-shrink-0' : ''}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className={`font-bold ${isSnapshot ? 'text-lg text-muted-foreground' : 'text-xl'}`}>
              Channel Performance
            </CardTitle>
            
            {/* Filter Metrics Chips */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                </svg>
                Filter metrics:
              </span>
              <div className="flex gap-1.5">
                {filterOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = viewMode === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setViewMode(option.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-foreground text-background shadow-md'
                          : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Remaining Budget Counter - Hidden in fillContainer (split) mode for space */}
          {!fillContainer && (
            <div style={{ minHeight: remainingBudget > 0 ? '88px' : '0px' }}>
              {remainingBudget > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/30 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Available Budget</div>
                      <div className="text-3xl font-bold text-green-500">
                        ${remainingBudget.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">of ${GLOBAL_BUDGET.toLocaleString()}</div>
                      <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-150"
                          style={{ width: `${((GLOBAL_BUDGET - remainingBudget) / GLOBAL_BUDGET) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Stats - No motion animations during drag */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <div 
                className="text-2xl font-bold text-primary transition-transform duration-150"
                style={{ transform: isDragging ? 'none' : undefined }}
              >
                {totals.clicks.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Views</div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <div 
                className="text-2xl font-bold text-green-600 transition-transform duration-150"
                style={{ transform: isDragging ? 'none' : undefined }}
              >
                ${totals.totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Revenue</div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <div 
                className={`text-2xl font-bold transition-transform duration-150 ${totals.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}
                style={{ transform: isDragging ? 'none' : undefined }}
              >
                ${totals.profit.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Net Profit</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`pt-4 ${fillContainer ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
          {/* Draggable Bar Chart - Fixed dimensions, no layout changes */}
          <div
            ref={chartRef}
            className="relative bg-secondary/20 rounded-lg p-4 select-none"
            style={{ 
              height: fillContainer ? '100%' : '350px', 
              minHeight: fillContainer ? undefined : '350px', 
              maxHeight: fillContainer ? undefined : '350px',
              touchAction: 'none',
              // Contain this specific area during drag
              contain: isDragging ? 'strict' : 'layout',
            }}
          >
            {/* Y-axis labels */}
            <div className="absolute left-0 top-10 bottom-12 w-16 flex flex-col justify-between text-xs text-muted-foreground">
              {getYAxisLabels().map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>

            {/* Grid lines */}
            <div className="absolute left-20 right-4 top-10 bottom-12 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-border/30" />
              ))}
            </div>

            {/* Bars Container - pointer-events handled per column */}
            <div className="absolute left-20 right-4 top-10 bottom-12 flex items-end justify-around gap-4">
              {Object.entries(CHANNELS).map(([channelId, channel]) => {
                const barValues = getBarValue(channelId);
                const baselineValue = getBaselineValue(channelId);
                const spend = displaySpend[channelId as keyof ChannelSpend];
                const isThisBarDragging = draggingChannel === channelId;
                const metricValue = barValues.primary;
                const isNegative = viewMode === 'profit' && metricValue < 0;

                return (
                  // ENTIRE COLUMN is the drag surface - prevents dead zones
                  <div
                    key={channelId}
                    className={`flex-1 flex flex-col items-center h-full justify-end relative ${
                      isSnapshot ? 'cursor-default' : 'cursor-ns-resize'
                    }`}
                    onPointerDown={(e) => handleColumnPointerDown(channelId, e)}
                    onPointerMove={handleColumnPointerMove}
                    onPointerUp={handleColumnPointerUp}
                    onPointerCancel={handleColumnPointerUp}
                    style={{ touchAction: 'none' }}
                  >
                    {/* Invisible full-height hit area for dragging from empty space */}
                    <div 
                      className="absolute inset-0 z-0" 
                      style={{ pointerEvents: isSnapshot ? 'none' : 'auto' }}
                    />
                    
                    {/* Metric values - pointer-events disabled so they don't block drag */}
                    <div className="text-center mb-1 pointer-events-none z-10">
                      <div 
                        className={`text-sm font-bold ${isNegative ? 'text-destructive' : ''}`}
                        style={{ color: isNegative ? undefined : channel.color }}
                      >
                        {formatValue(metricValue)}
                      </div>
                      {viewMode === 'all' && barValues.secondary !== null && (
                        <div className="text-xs text-green-600">
                          ${barValues.secondary.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 pointer-events-none z-10">
                      ${spend.toLocaleString()} spent
                    </div>
                    
                    {/* GhostDeltaBar - handles ghost baseline and delta overlay */}
                    <GhostDeltaBar
                      channelId={channelId}
                      channel={channel}
                      currentValue={metricValue}
                      baselineValue={baselineValue}
                      maxScale={maxScale}
                      viewMode={viewMode}
                      isNegative={isNegative}
                      isDraggingSpend={isDragging}
                      isThisBarDragging={isThisBarDragging}
                      isSnapshot={isSnapshot}
                      onTokenDrag={onTokenDrag}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels - pointer-events disabled to prevent blocking drag */}
            <div className="absolute left-20 right-4 bottom-0 flex justify-around pointer-events-none z-0">
              {Object.entries(CHANNELS).map(([channelId, channel]) => (
                <div key={channelId} className="flex-1 text-center">
                  <span className="text-xs font-medium" style={{ color: channel.color }}>
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Cursor-follow tooltip during drag */}
            {isDragging && cursorPos && (() => {
              const tooltipData = getTooltipData();
              if (!tooltipData) return null;
              
              return (
                <div
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: cursorPos.x + 16,
                    top: cursorPos.y - 40,
                    transform: cursorPos.x > 200 ? 'translateX(-120%)' : 'none',
                  }}
                >
                  <div className="bg-background/95 backdrop-blur-sm border-2 rounded-lg shadow-lg px-3 py-2 min-w-[140px]"
                    style={{ borderColor: tooltipData.channelColor }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: tooltipData.channelColor }}>
                      {tooltipData.channelName}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      ${tooltipData.currentSpend.toLocaleString()}
                    </div>
                    {tooltipData.delta !== 0 && (
                      <div className={`text-sm font-medium ${tooltipData.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tooltipData.delta > 0 ? '▲' : '▼'} {tooltipData.delta > 0 ? '+' : ''}${tooltipData.delta.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Drag instruction */}
            <div className="absolute top-2 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {isSnapshot ? '🔒 Snapshot (frozen)' : (
                isDragging 
                  ? '⇧ Shift = fine | ⌥ Alt = coarse'
                  : (baselineSpend ? '↕ Adjust bars | 🎯 Drag ghost/delta' : '↕ Drag bars to adjust spend')
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
