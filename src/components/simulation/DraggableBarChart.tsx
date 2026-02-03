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
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Use draft spend during drag, otherwise use real spend
  const displaySpend = draftSpend ?? channelSpend;

  // Dynamic scale based on view mode
  const getMaxScale = () => {
    switch (viewMode) {
      case 'clicks':
        return 50000;
      case 'revenue':
        return 80000;
      case 'profit':
        return 60000;
      case 'all':
        return 50000;
      default:
        return 50000;
    }
  };

  const maxScale = getMaxScale();

  // Y-axis labels based on view mode
  const getYAxisLabels = () => {
    const isDollar = viewMode === 'revenue' || viewMode === 'profit';
    const prefix = isDollar ? '$' : '';
    return [
      `${prefix}${maxScale.toLocaleString()}`,
      `${prefix}${(maxScale * 0.75).toLocaleString()}`,
      `${prefix}${(maxScale * 0.5).toLocaleString()}`,
      `${prefix}${(maxScale * 0.25).toLocaleString()}`,
      isDollar ? '$0' : '0',
    ];
  };

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

  const handleMouseDown = useCallback((channelId: string, e: React.MouseEvent) => {
    // Snapshot mode: bars are NOT adjustable
    if (isSnapshot) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture((e as unknown as PointerEvent).pointerId || 1);
    } catch {
      // Ignore if pointer capture fails
    }
    
    // Initialize draft with current spend values
    setDraftSpend({ ...channelSpend });
    setDraggingChannel(channelId);
  }, [channelSpend, isSnapshot]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingChannel || !chartRef.current || !draftSpend) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Use RAF to throttle updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!chartRef.current || !draggingChannel) return;
      
      const rect = chartRef.current.getBoundingClientRect();
      const chartHeight = rect.height - 80;
      const mouseY = e.clientY - rect.top - 40;
      
      const percentage = 1 - Math.max(0, Math.min(1, mouseY / chartHeight));
      const newValue = Math.round((percentage * GLOBAL_BUDGET) / 100) * 100;
      
      const otherSpend = Object.entries(draftSpend)
        .filter(([id]) => id !== draggingChannel)
        .reduce((sum, [, val]) => sum + val, 0);
      const maxAllowed = GLOBAL_BUDGET - otherSpend;
      const clampedValue = Math.min(Math.max(0, newValue), maxAllowed);
      
      // Only update draft (local state) - NO parent state update
      setDraftSpend(prev => prev ? {
        ...prev,
        [draggingChannel]: clampedValue
      } : null);
    });
  }, [draggingChannel, draftSpend]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture((e as unknown as PointerEvent).pointerId || 1);
    } catch {
      // Ignore
    }
    
    // COMMIT: Apply final draft value to parent state on release
    if (draggingChannel && draftSpend) {
      const finalValue = draftSpend[draggingChannel as keyof ChannelSpend];
      onSpendChange(draggingChannel as keyof ChannelSpend, finalValue);
    }
    
    // Clear draft and dragging state
    setDraftSpend(null);
    setDraggingChannel(null);
    
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
            className="relative bg-secondary/20 rounded-lg p-4 select-none cursor-crosshair"
            style={{ 
              height: fillContainer ? '100%' : '350px', 
              minHeight: fillContainer ? undefined : '350px', 
              maxHeight: fillContainer ? undefined : '350px',
              touchAction: isDragging ? 'none' : 'auto',
              // Contain this specific area during drag
              contain: isDragging ? 'strict' : 'layout',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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

            {/* Bars Container */}
            <div className="absolute left-20 right-4 top-10 bottom-12 flex items-end justify-around gap-4">
              {Object.entries(CHANNELS).map(([channelId, channel]) => {
                const barValues = getBarValue(channelId);
                const baselineValue = getBaselineValue(channelId);
                const spend = displaySpend[channelId as keyof ChannelSpend];
                const isThisBarDragging = draggingChannel === channelId;
                const metricValue = barValues.primary;
                const isNegative = viewMode === 'profit' && metricValue < 0;

                return (
                  <div
                    key={channelId}
                    className="flex-1 flex flex-col items-center h-full justify-end"
                  >
                    {/* Metric values - no layout animation during drag */}
                    <div className="text-center mb-1">
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
                    <div className="text-xs text-muted-foreground mb-2">
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
                      onMouseDown={(e) => handleMouseDown(channelId, e)}
                      onTokenDrag={onTokenDrag}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="absolute left-20 right-4 bottom-0 flex justify-around">
              {Object.entries(CHANNELS).map(([channelId, channel]) => (
                <div key={channelId} className="flex-1 text-center">
                  <span className="text-xs font-medium" style={{ color: channel.color }}>
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Drag instruction */}
            <div className="absolute top-2 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {isSnapshot ? '🔒 Snapshot (frozen)' : (
                baselineSpend ? '↕ Adjust bars | 🎯 Drag ghost/delta for reasoning' : '↕ Drag bars to adjust spend'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
