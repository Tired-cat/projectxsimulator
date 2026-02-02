import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHANNELS, GLOBAL_BUDGET } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { Eye, DollarSign, LayoutGrid } from 'lucide-react';

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
}

type ViewMode = 'clicks' | 'profit' | 'all';

const filterOptions = [
  { id: 'clicks' as ViewMode, label: 'Views', icon: Eye },
  { id: 'profit' as ViewMode, label: 'Profit', icon: DollarSign },
  { id: 'all' as ViewMode, label: 'Show All', icon: LayoutGrid },
];

export function DraggableBarChart({
  channelSpend,
  onSpendChange,
  channelMetrics,
  totals,
  remainingBudget,
}: DraggableBarChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('clicks');
  const [draggingChannel, setDraggingChannel] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Fixed max values for consistent scaling
  const FIXED_MAX_BUDGET = GLOBAL_BUDGET; // $20,000 for budget bars
  const maxMetricValue = viewMode === 'clicks' ? 50000 : 60000; // Fixed scales

  // Get bar value based on view mode
  const getBarValue = useCallback((channelId: string) => {
    const metrics = channelMetrics[channelId];
    if (!metrics) return { primary: 0, secondary: 0 };
    
    switch (viewMode) {
      case 'clicks':
        return { primary: metrics.clicks, secondary: null };
      case 'profit':
        return { primary: metrics.profit, secondary: null };
      case 'all':
        return { primary: metrics.clicks, secondary: metrics.profit };
      default:
        return { primary: 0, secondary: null };
    }
  }, [viewMode, channelMetrics]);

  // Handle mouse events for dragging bars - follows cursor exactly
  const handleMouseDown = useCallback((channelId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingChannel(channelId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingChannel || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const chartHeight = rect.height - 80; // Account for labels
    const mouseY = e.clientY - rect.top - 40;
    
    // Direct cursor tracking - bar follows mouse exactly
    const percentage = 1 - Math.max(0, Math.min(1, mouseY / chartHeight));
    const newValue = Math.round((percentage * FIXED_MAX_BUDGET) / 100) * 100;
    
    // Clamp to available budget
    const currentSpend = channelSpend[draggingChannel as keyof ChannelSpend];
    const otherSpend = Object.entries(channelSpend)
      .filter(([id]) => id !== draggingChannel)
      .reduce((sum, [, val]) => sum + val, 0);
    const maxAllowed = GLOBAL_BUDGET - otherSpend;
    const clampedValue = Math.min(Math.max(0, newValue), maxAllowed);
    
    if (clampedValue !== currentSpend) {
      onSpendChange(draggingChannel as keyof ChannelSpend, clampedValue);
    }
  }, [draggingChannel, channelSpend, onSpendChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingChannel(null);
  }, []);

  const formatValue = (value: number, isProfit: boolean = false) => {
    if (isProfit || viewMode === 'profit') {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-xl font-bold">Channel Performance</CardTitle>
          
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
        
        {/* Remaining Budget Counter - Prominent Position */}
        <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/30 rounded-xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Available Budget</div>
              <div className={`text-3xl font-bold transition-colors ${
                remainingBudget > 0 ? 'text-green-500' : 'text-primary'
              }`}>
                ${remainingBudget.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">of ${GLOBAL_BUDGET.toLocaleString()}</div>
              <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-green-500"
                  initial={false}
                  animate={{ width: `${((GLOBAL_BUDGET - remainingBudget) / GLOBAL_BUDGET) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <motion.div 
              className="text-2xl font-bold text-primary"
              key={totals.clicks}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              {totals.clicks.toLocaleString()}
            </motion.div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <motion.div 
              className="text-2xl font-bold text-green-600"
              key={totals.totalRevenue}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              ${totals.totalRevenue.toLocaleString()}
            </motion.div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <motion.div 
              className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}
              key={totals.profit}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              ${totals.profit.toLocaleString()}
            </motion.div>
            <div className="text-xs text-muted-foreground">Net Profit</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Draggable Bar Chart */}
        <div
          ref={chartRef}
          className="relative h-[350px] bg-secondary/20 rounded-lg p-4 select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Y-axis labels - Fixed at $20,000 max */}
          <div className="absolute left-0 top-10 bottom-12 w-16 flex flex-col justify-between text-xs text-muted-foreground">
            <span>${(FIXED_MAX_BUDGET).toLocaleString()}</span>
            <span>${(FIXED_MAX_BUDGET * 0.75).toLocaleString()}</span>
            <span>${(FIXED_MAX_BUDGET * 0.5).toLocaleString()}</span>
            <span>${(FIXED_MAX_BUDGET * 0.25).toLocaleString()}</span>
            <span>$0</span>
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
              const spend = channelSpend[channelId as keyof ChannelSpend];
              const spendHeightPercent = (spend / FIXED_MAX_BUDGET) * 100;
              const isDragging = draggingChannel === channelId;

              return (
                <div
                  key={channelId}
                  className="flex-1 flex flex-col items-center h-full justify-end"
                >
                  {/* Metric values above bar (animated) */}
                  <motion.div 
                    className="text-center mb-1"
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div className="text-sm font-bold" style={{ color: channel.color }}>
                      {formatValue(barValues.primary, viewMode === 'profit')}
                    </div>
                    {viewMode === 'all' && barValues.secondary !== null && (
                      <div className={`text-xs ${barValues.secondary >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        ${barValues.secondary.toLocaleString()}
                      </div>
                    )}
                  </motion.div>
                  <div className="text-xs text-muted-foreground mb-2">
                    ${spend.toLocaleString()} spent
                  </div>
                  
                  {/* The Budget Bar - Fixed scale, direct drag */}
                  <motion.div
                    className={`w-full max-w-[80px] rounded-t-lg cursor-ns-resize ${
                      isDragging ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                    }`}
                    style={{
                      backgroundColor: channel.color,
                      boxShadow: isDragging 
                        ? `0 0 30px ${channel.color}` 
                        : `0 4px 12px ${channel.color}40`,
                    }}
                    initial={false}
                    animate={{ 
                      height: `${Math.max(spendHeightPercent, 2)}%`,
                      scale: isDragging ? 1.02 : 1,
                    }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: isDragging ? 400 : 200, 
                      damping: isDragging ? 30 : 25 
                    }}
                    onMouseDown={(e) => handleMouseDown(channelId, e)}
                  >
                    {/* Drag handle indicator */}
                    <div className="w-full h-4 flex items-center justify-center rounded-t-lg bg-white/20">
                      <div className="w-10 h-1.5 bg-white/60 rounded-full" />
                    </div>
                  </motion.div>
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
            ↕ Drag bars to adjust spend
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
