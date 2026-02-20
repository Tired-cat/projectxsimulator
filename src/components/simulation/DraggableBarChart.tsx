import { useRef, useState, useCallback, useEffect } from 'react';
import { EvidenceHandle } from '@/components/reasoning/EvidenceHandle';
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

  // Centralized cleanup function for ending drag state
  const cleanupDragState = useCallback(() => {
    // Commit final value if we have a draft
    if (draggingChannel && draftSpend) {
      const finalValue = draftSpend[draggingChannel as keyof ChannelSpend];
      onSpendChange(draggingChannel as keyof ChannelSpend, finalValue);
    }
    
    setDraftSpend(null);
    setDraggingChannel(null);
    setCursorPos(null);
    setStableMaxScale(null);
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [draggingChannel, draftSpend, onSpendChange]);

  // Lock body scroll during drag + global cleanup handlers
  useEffect(() => {
    if (draggingChannel) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      // Global event handlers for edge case cleanup
      const handleWindowBlur = () => {
        cleanupDragState();
      };
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          cleanupDragState();
        }
      };
      
      const handleGlobalPointerUp = () => {
        cleanupDragState();
      };

      const handleLostPointerCapture = () => {
        cleanupDragState();
      };
      
      // Attach global listeners
      window.addEventListener('blur', handleWindowBlur);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);
      chartRef.current?.addEventListener('lostpointercapture', handleLostPointerCapture);
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        
        window.removeEventListener('blur', handleWindowBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
        chartRef.current?.removeEventListener('lostpointercapture', handleLostPointerCapture);
        
        // Cleanup RAF on unmount
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [draggingChannel, cleanupDragState]);

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
    
    // Use centralized cleanup
    cleanupDragState();
  }, [cleanupDragState]);
  
  // Handle mouse leaving chart container
  const handleChartMouseLeave = useCallback(() => {
    if (draggingChannel) {
      cleanupDragState();
    }
  }, [draggingChannel, cleanupDragState]);

  const formatValue = (value: number) => {
    if (viewMode === 'clicks') {
      return value.toLocaleString();
    }
    return `$${value.toLocaleString()}`;
  };

  const isDragging = draggingChannel !== null;

  // Get tooltip data for current drag (includes real-time budget info)
  const getTooltipData = useCallback(() => {
    if (!draggingChannel || !draftSpend) return null;
    
    const channel = CHANNELS[draggingChannel as keyof typeof CHANNELS];
    const currentSpend = draftSpend[draggingChannel as keyof ChannelSpend];
    const baselineSpendValue = baselineSpend?.[draggingChannel as keyof ChannelSpend] ?? channelSpend[draggingChannel as keyof ChannelSpend];
    const delta = currentSpend - baselineSpendValue;
    
    // Calculate real-time budget left from draft values
    const totalDraftSpend = Object.values(draftSpend).reduce((sum, val) => sum + val, 0);
    const budgetLeft = GLOBAL_BUDGET - totalDraftSpend;
    
    // Determine budget status for traffic-light coloring
    const budgetThreshold = GLOBAL_BUDGET * 0.1; // 10% threshold = $2,000
    let budgetStatus: 'green' | 'amber' | 'red' | 'limit';
    if (budgetLeft <= 0) {
      budgetStatus = 'limit';
    } else if (budgetLeft <= budgetThreshold) {
      budgetStatus = 'red';
    } else if (budgetLeft <= budgetThreshold * 2) { // 20% = amber zone
      budgetStatus = 'amber';
    } else {
      budgetStatus = 'green';
    }
    
    // Check if we're at the limit (can't increase further)
    const otherSpend = Object.entries(draftSpend)
      .filter(([id]) => id !== draggingChannel)
      .reduce((sum, [, val]) => sum + val, 0);
    const maxAllowedForChannel = GLOBAL_BUDGET - otherSpend;
    const atLimit = currentSpend >= maxAllowedForChannel && budgetLeft <= 0;
    
    return {
      channelName: channel.name,
      channelColor: channel.color,
      currentSpend,
      delta,
      budgetLeft,
      budgetStatus,
      atLimit,
    };
  }, [draggingChannel, draftSpend, baselineSpend, channelSpend]);

  // Get crosshair guide data for precision indicator
  const getCrosshairData = useCallback(() => {
    if (!cursorPos || !chartRef.current) return null;
    
    const chartHeight = chartRef.current.offsetHeight - 80; // account for padding (top-10 + bottom-12 = ~80px)
    const chartTop = 40; // top offset
    const chartBottom = chartTop + chartHeight;
    
    // Calculate y position relative to chart area
    const relativeY = cursorPos.y - chartTop;
    
    // Clamp to chart bounds
    if (relativeY < 0 || relativeY > chartHeight) return null;
    
    // Calculate the value at this y position (inverted: top = max, bottom = 0)
    const percentage = 1 - (relativeY / chartHeight);
    const valueAtCursor = Math.round(percentage * GLOBAL_BUDGET);
    
    // Format based on view mode
    const isDollar = viewMode === 'revenue' || viewMode === 'profit';
    const prefix = isDollar ? '$' : '';
    const formattedValue = valueAtCursor >= 1000 
      ? `${prefix}${(valueAtCursor / 1000).toFixed(1)}k`
      : `${prefix}${valueAtCursor.toLocaleString()}`;
    
    return {
      yPosition: cursorPos.y,
      valueAtCursor,
      formattedValue,
      isInBounds: relativeY >= 0 && relativeY <= chartHeight,
    };
  }, [cursorPos, viewMode]);

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

          {/* Summary Stats — draggable as evidence */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <EvidenceHandle
              label="Total Views"
              value={totals.clicks.toLocaleString()}
              context="Views • Channel Performance"
              sourceId="kpi-total-views"
            >
              <div className="p-3 bg-secondary/50 rounded-lg text-center">
                <div
                  className="text-2xl font-bold text-primary transition-transform duration-150"
                  style={{ transform: isDragging ? 'none' : undefined }}
                >
                  {totals.clicks.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Views</div>
              </div>
            </EvidenceHandle>

            <EvidenceHandle
              label="Revenue"
              value={`$${totals.totalRevenue.toLocaleString()}`}
              context="Revenue • Channel Performance"
              sourceId="kpi-revenue"
            >
              <div className="p-3 bg-secondary/50 rounded-lg text-center">
                <div
                  className="text-2xl font-bold text-green-600 transition-transform duration-150"
                  style={{ transform: isDragging ? 'none' : undefined }}
                >
                  ${totals.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
            </EvidenceHandle>

            <EvidenceHandle
              label="Net Profit"
              value={`$${totals.profit.toLocaleString()}`}
              context="Net Profit • Channel Performance"
              sourceId="kpi-net-profit"
            >
              <div className="p-3 bg-secondary/50 rounded-lg text-center">
                <div
                  className={`text-2xl font-bold transition-transform duration-150 ${totals.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}
                  style={{ transform: isDragging ? 'none' : undefined }}
                >
                  ${totals.profit.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Net Profit</div>
              </div>
            </EvidenceHandle>
          </div>
        </CardHeader>

        <CardContent className={`pt-4 ${fillContainer ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
          {/* Draggable Bar Chart - Fixed dimensions, no layout changes */}
          <div
            ref={chartRef}
            className="relative bg-secondary/20 rounded-lg p-4 select-none"
            onMouseLeave={handleChartMouseLeave}
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
                    
                    {/* Metric values — wrapped with EvidenceHandle for drag-to-board */}
                    <div className="z-10 mb-1 pointer-events-auto" style={{ touchAction: 'none' }}>
                      <EvidenceHandle
                        label={`${channel.name} ${viewMode === 'clicks' ? 'Views' : viewMode === 'revenue' ? 'Revenue' : viewMode === 'profit' ? 'Profit' : 'Views'}`}
                        value={formatValue(metricValue)}
                        context={`${viewMode === 'clicks' ? 'Views' : viewMode === 'revenue' ? 'Revenue' : viewMode === 'profit' ? 'Profit' : 'Views'} • Channel Performance`}
                        sourceId={`${channelId}-${viewMode}`}
                      >
                        <div className="text-center px-1 py-0.5">
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
                      </EvidenceHandle>
                    </div>
                    {/* Spend label — also draggable as evidence */}
                    <div className="z-10 mb-2 pointer-events-auto" style={{ touchAction: 'none' }}>
                      <EvidenceHandle
                        label={`${channel.name} Spend`}
                        value={`$${spend.toLocaleString()}`}
                        context="Spend • Channel Performance"
                        sourceId={`${channelId}-spend`}
                      >
                        <div className="text-xs text-muted-foreground px-1 py-0.5 text-center">
                          ${spend.toLocaleString()} spent
                        </div>
                      </EvidenceHandle>
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

            {/* Precision Crosshair Guide - shows exact y-position and value during drag */}
            {isDragging && cursorPos && (() => {
              const crosshairData = getCrosshairData();
              if (!crosshairData || !crosshairData.isInBounds) return null;
              
              const draggingChannelData = draggingChannel ? CHANNELS[draggingChannel] : null;
              const guideColor = draggingChannelData?.color || 'hsl(var(--primary))';
              
              return (
                <>
                  {/* Horizontal guide line across chart area */}
                  <div
                    className="absolute pointer-events-none z-30"
                    style={{
                      left: '80px', // Start after y-axis (left-20 = 80px)
                      right: '16px', // End before right padding
                      top: crosshairData.yPosition,
                      height: '1px',
                      background: `linear-gradient(90deg, ${guideColor} 0%, ${guideColor}80 50%, ${guideColor} 100%)`,
                      boxShadow: `0 0 6px ${guideColor}60`,
                    }}
                  />
                  
                  {/* Y-axis value marker pill */}
                  <div
                    className="absolute pointer-events-none z-40"
                    style={{
                      left: '4px',
                      top: crosshairData.yPosition,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <div 
                      className="px-2 py-0.5 rounded-md text-xs font-bold text-white shadow-lg"
                      style={{ 
                        backgroundColor: guideColor,
                        boxShadow: `0 2px 8px ${guideColor}40`,
                      }}
                    >
                      {crosshairData.formattedValue}
                    </div>
                  </div>
                  
                  {/* Small crosshair dot at cursor intersection */}
                  <div
                    className="absolute pointer-events-none z-35 w-3 h-3 rounded-full"
                    style={{
                      left: cursorPos.x - 6,
                      top: crosshairData.yPosition - 6,
                      backgroundColor: guideColor,
                      boxShadow: `0 0 8px ${guideColor}80`,
                      border: '2px solid white',
                    }}
                  />
                </>
              );
            })()}

            {/* Cursor-follow tooltip during drag with budget tracking */}
            {isDragging && cursorPos && (() => {
              const tooltipData = getTooltipData();
              if (!tooltipData) return null;
              
              // Traffic-light colors for budget status
              const budgetColors = {
                green: { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
                amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
                red: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
                limit: { text: 'text-red-600', bg: 'bg-red-500/20', border: 'border-red-500/50' },
              };
              const budgetStyle = budgetColors[tooltipData.budgetStatus];
              
              return (
                <div
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: cursorPos.x + 16,
                    top: cursorPos.y - 60,
                    transform: cursorPos.x > 200 ? 'translateX(-120%)' : 'none',
                  }}
                >
                  <div 
                    className="bg-background/95 backdrop-blur-sm border-2 rounded-lg shadow-lg px-3 py-2 min-w-[160px]"
                    style={{ borderColor: tooltipData.atLimit ? 'hsl(0, 72%, 51%)' : tooltipData.channelColor }}
                  >
                    {/* Channel name */}
                    <div className="text-xs font-semibold mb-1" style={{ color: tooltipData.channelColor }}>
                      {tooltipData.channelName}
                    </div>
                    
                    {/* Current spend */}
                    <div className="text-lg font-bold text-foreground">
                      ${tooltipData.currentSpend.toLocaleString()}
                    </div>
                    
                    {/* Delta from baseline */}
                    {tooltipData.delta !== 0 && (
                      <div className={`text-sm font-medium ${tooltipData.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tooltipData.delta > 0 ? '▲' : '▼'} {tooltipData.delta > 0 ? '+' : ''}${tooltipData.delta.toLocaleString()}
                      </div>
                    )}
                    
                    {/* Budget remaining with traffic-light coloring */}
                    <div className={`mt-2 pt-2 border-t border-border/50`}>
                      {tooltipData.atLimit ? (
                        <div className={`text-sm font-bold ${budgetStyle.text} flex items-center gap-1`}>
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          Limit reached
                        </div>
                      ) : (
                        <div className={`flex items-center justify-between gap-2`}>
                          <span className="text-xs text-muted-foreground">Budget left:</span>
                          <span className={`text-sm font-bold ${budgetStyle.text}`}>
                            ${tooltipData.budgetLeft.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {/* Progress indicator for budget */}
                      <div className="mt-1.5 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-75 ${
                            tooltipData.budgetStatus === 'green' ? 'bg-green-500' :
                            tooltipData.budgetStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(0, (tooltipData.budgetLeft / GLOBAL_BUDGET) * 100)}%` }}
                        />
                      </div>
                    </div>
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
