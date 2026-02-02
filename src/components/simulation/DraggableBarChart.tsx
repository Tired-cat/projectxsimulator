import { useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHANNELS, GLOBAL_BUDGET } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';

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

type ViewMode = 'spend' | 'clicks' | 'revenue';

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

  // Get max value for scaling based on view mode
  const getMaxValue = useCallback(() => {
    switch (viewMode) {
      case 'spend':
        return GLOBAL_BUDGET;
      case 'clicks':
        return Math.max(...Object.values(channelMetrics).map(m => m.clicks), 1000);
      case 'revenue':
        return Math.max(...Object.values(channelMetrics).map(m => m.totalRevenue), 1000);
      default:
        return GLOBAL_BUDGET;
    }
  }, [viewMode, channelMetrics]);

  // Get bar value based on view mode
  const getBarValue = useCallback((channelId: string) => {
    switch (viewMode) {
      case 'spend':
        return channelSpend[channelId as keyof ChannelSpend];
      case 'clicks':
        return channelMetrics[channelId]?.clicks || 0;
      case 'revenue':
        return channelMetrics[channelId]?.totalRevenue || 0;
      default:
        return 0;
    }
  }, [viewMode, channelSpend, channelMetrics]);

  // Handle mouse events for dragging bars
  const handleMouseDown = useCallback((channelId: string, e: React.MouseEvent) => {
    if (viewMode !== 'spend') return; // Only allow dragging in spend mode
    e.preventDefault();
    setDraggingChannel(channelId);
  }, [viewMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingChannel || !chartRef.current || viewMode !== 'spend') return;

    const rect = chartRef.current.getBoundingClientRect();
    const chartHeight = rect.height - 60; // Account for labels
    const mouseY = e.clientY - rect.top - 30; // Offset for top padding
    
    // Calculate value based on mouse position (inverted - top is max)
    const percentage = 1 - Math.max(0, Math.min(1, mouseY / chartHeight));
    const currentSpend = channelSpend[draggingChannel as keyof ChannelSpend];
    const otherSpend = Object.entries(channelSpend)
      .filter(([id]) => id !== draggingChannel)
      .reduce((sum, [, val]) => sum + val, 0);
    
    const maxAllowed = GLOBAL_BUDGET - otherSpend;
    const newValue = Math.round((percentage * GLOBAL_BUDGET) / 100) * 100;
    const clampedValue = Math.min(Math.max(0, newValue), maxAllowed);
    
    if (clampedValue !== currentSpend) {
      onSpendChange(draggingChannel as keyof ChannelSpend, clampedValue);
    }
  }, [draggingChannel, viewMode, channelSpend, onSpendChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingChannel(null);
  }, []);

  const formatValue = (value: number, mode: ViewMode) => {
    if (mode === 'spend' || mode === 'revenue') {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const maxValue = getMaxValue();

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Channel Performance</CardTitle>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{totals.clicks.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">${totals.totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              ${totals.profit.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Net Profit</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="clicks">Total Views</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="spend">Ad Spend (Drag)</TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="mt-0">
            {/* Draggable Bar Chart */}
            <div
              ref={chartRef}
              className="relative h-[350px] bg-secondary/20 rounded-lg p-4 select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Y-axis labels */}
              <div className="absolute left-0 top-4 bottom-10 w-16 flex flex-col justify-between text-xs text-muted-foreground">
                <span>{formatValue(maxValue, viewMode)}</span>
                <span>{formatValue(maxValue * 0.75, viewMode)}</span>
                <span>{formatValue(maxValue * 0.5, viewMode)}</span>
                <span>{formatValue(maxValue * 0.25, viewMode)}</span>
                <span>$0</span>
              </div>

              {/* Bars Container */}
              <div className="absolute left-20 right-4 top-4 bottom-10 flex items-end justify-around gap-4">
                {Object.entries(CHANNELS).map(([channelId, channel]) => {
                  const value = getBarValue(channelId);
                  const heightPercent = (value / maxValue) * 100;
                  const isDragging = draggingChannel === channelId;
                  const canDrag = viewMode === 'spend';

                  return (
                    <div
                      key={channelId}
                      className="flex-1 flex flex-col items-center h-full justify-end"
                    >
                      {/* Value label above bar */}
                      <div className="text-sm font-bold mb-2" style={{ color: channel.color }}>
                        {formatValue(value, viewMode)}
                      </div>
                      
                      {/* The Bar */}
                      <div
                        className={`w-full max-w-[80px] rounded-t-lg transition-all duration-150 ${
                          canDrag ? 'cursor-ns-resize hover:opacity-80' : ''
                        } ${isDragging ? 'opacity-70 scale-105' : ''}`}
                        style={{
                          height: `${Math.max(heightPercent, 2)}%`,
                          backgroundColor: channel.color,
                          boxShadow: isDragging 
                            ? `0 0 20px ${channel.color}` 
                            : `0 4px 12px ${channel.color}40`,
                        }}
                        onMouseDown={(e) => handleMouseDown(channelId, e)}
                      >
                        {/* Drag handle indicator */}
                        {canDrag && (
                          <div className="w-full h-3 flex items-center justify-center">
                            <div className="w-8 h-1 bg-white/50 rounded-full" />
                          </div>
                        )}
                      </div>
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
              {viewMode === 'spend' && (
                <div className="absolute top-2 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  ↕ Drag bars to adjust budget
                </div>
              )}
            </div>

            {/* Remaining Budget Indicator */}
            <div className="mt-4 p-3 bg-secondary/30 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium">Remaining Budget:</span>
              <span className={`font-bold ${remainingBudget === 0 ? 'text-destructive' : 'text-primary'}`}>
                ${remainingBudget.toLocaleString()} / ${GLOBAL_BUDGET.toLocaleString()}
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
