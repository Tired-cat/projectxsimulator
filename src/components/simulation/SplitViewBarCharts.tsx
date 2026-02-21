import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DraggableBarChart } from './DraggableBarChart';
import { Button } from '@/components/ui/button';
import { SplitSquareHorizontal, X, Camera, Lock } from 'lucide-react';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { calculateMixedRevenue as calcRevenue, CHANNEL_IDS, GLOBAL_BUDGET } from '@/lib/marketingConstants';
import type { ReasoningToken } from '@/types/reasoningToken';

interface SplitViewBarChartsProps {
  channelSpend: ChannelSpend;
  onSpendChange: (channelId: keyof ChannelSpend, value: number) => void;
  channelMetrics: Record<string, ReturnType<typeof calculateMixedRevenue>>;
  totals: {
    clicks: number;
    totalRevenue: number;
    profit: number;
  };
  remainingBudget: number;
  onTokenDrag?: (token: ReasoningToken) => void;
  // Lifted state — owned by parent so re-renders don't reset compare mode
  isSplitView: boolean;
  snapshotSpend: ChannelSpend | null;
  baselineSpend: ChannelSpend;
  onActivateSplitView: () => void;
  onCloseSplitView: () => void;
}

export function SplitViewBarCharts({
  channelSpend,
  onSpendChange,
  channelMetrics,
  totals,
  remainingBudget,
  onTokenDrag,
  isSplitView,
  snapshotSpend,
  baselineSpend,
  onActivateSplitView,
  onCloseSplitView,
}: SplitViewBarChartsProps) {

  // Calculate metrics for the snapshot
  const snapshotMetrics = useMemo(() => {
    if (!snapshotSpend) return null;
    return CHANNEL_IDS.reduce((acc, channelId) => {
      acc[channelId] = calcRevenue(channelId, snapshotSpend[channelId as keyof ChannelSpend]);
      return acc;
    }, {} as Record<string, ReturnType<typeof calcRevenue>>);
  }, [snapshotSpend]);

  const snapshotTotals = useMemo(() => {
    if (!snapshotMetrics) return null;
    const values = Object.values(snapshotMetrics);
    return {
      clicks: values.reduce((sum, m) => sum + m.clicks, 0),
      totalRevenue: values.reduce((sum, m) => sum + m.totalRevenue, 0),
      profit: values.reduce((sum, m) => sum + m.profit, 0),
    };
  }, [snapshotMetrics]);

  // Calculate baseline metrics for ghost bars
  const baselineMetrics = useMemo(() => {
    return CHANNEL_IDS.reduce((acc, channelId) => {
      acc[channelId] = calcRevenue(channelId, baselineSpend[channelId as keyof ChannelSpend]);
      return acc;
    }, {} as Record<string, ReturnType<typeof calcRevenue>>);
  }, [baselineSpend]);

  // Calculate remaining budget for snapshot (it's frozen, so it's based on snapshot spend)
  const snapshotRemainingBudget = useMemo(() => {
    if (!snapshotSpend) return 0;
    const total = Object.values(snapshotSpend).reduce((sum, val) => sum + val, 0);
    return GLOBAL_BUDGET - total;
  }, [snapshotSpend]);

  return (
    <div className="space-y-2">
      {/* Split View Control */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isSplitView ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onActivateSplitView}
              className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
            >
              <SplitSquareHorizontal className="h-4 w-4" />
              <span>Split View</span>
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm">
                <SplitSquareHorizontal className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Compare Mode</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseSplitView}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {isSplitView && (
          <div className="text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Before: Frozen snapshot
            </span>
            <span className="text-primary font-medium">Current: Adjustable</span>
          </div>
        )}
      </div>

      {/* Charts Container */}
      <AnimatePresence mode="wait">
        {!isSplitView ? (
          <motion.div
            key="single"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DraggableBarChart
              channelSpend={channelSpend}
              onSpendChange={onSpendChange}
              channelMetrics={channelMetrics}
              totals={totals}
              remainingBudget={remainingBudget}
              mode="live"
              baselineSpend={baselineSpend}
              baselineMetrics={baselineMetrics}
              onTokenDrag={onTokenDrag}
            />
          </motion.div>
        ) : (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-2"
            // Responsive height — fills available viewport
            style={{ height: 'calc(100vh - 280px)', minHeight: '350px' }}
          >
            {/* Before Snapshot Panel - fixed height container */}
            <div 
              className="relative h-full overflow-hidden"
              style={{ contain: 'strict' }}
            >
              {/* Snapshot Badge */}
              <div className="absolute -top-0 left-4 z-10 flex items-center gap-1.5 px-2 py-1 bg-slate-600 text-white text-xs font-medium rounded-md shadow-md">
                <Lock className="h-3 w-3" />
                Before Adjustment
              </div>
              {snapshotSpend && snapshotMetrics && snapshotTotals && (
                <div className="h-full pt-6 opacity-90">
                  <DraggableBarChart
                    channelSpend={snapshotSpend}
                    onSpendChange={() => {}} // No-op - snapshot is immutable
                    channelMetrics={snapshotMetrics}
                    totals={snapshotTotals}
                    remainingBudget={snapshotRemainingBudget}
                    mode="snapshot"
                    fillContainer
                  />
                </div>
              )}
              {/* Glass overlay effect for frozen state */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-500/5 to-transparent rounded-lg" />
            </div>

            {/* Live Current Panel - fixed height container */}
            <div 
              className="relative h-full overflow-hidden"
              style={{ contain: 'strict' }}
            >
              {/* Live Badge */}
              <div className="absolute -top-0 left-4 z-10 flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md shadow-md">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Current / Live
              </div>
              <div className="h-full pt-6">
                <DraggableBarChart
                  channelSpend={channelSpend}
                  onSpendChange={onSpendChange}
                  channelMetrics={channelMetrics}
                  totals={totals}
                  remainingBudget={remainingBudget}
                  mode="live"
                  fillContainer
                  baselineSpend={snapshotSpend}
                  baselineMetrics={snapshotMetrics}
                  onTokenDrag={onTokenDrag}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delta Summary (only in split view) */}
      <AnimatePresence>
        {isSplitView && snapshotTotals && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-center gap-8 text-sm">
                <DeltaIndicator
                  label="Views"
                  before={snapshotTotals.clicks}
                  after={totals.clicks}
                />
                <DeltaIndicator
                  label="Revenue"
                  before={snapshotTotals.totalRevenue}
                  after={totals.totalRevenue}
                  isCurrency
                />
                <DeltaIndicator
                  label="Profit"
                  before={snapshotTotals.profit}
                  after={totals.profit}
                  isCurrency
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Delta indicator component for comparison
function DeltaIndicator({
  label,
  before,
  after,
  isCurrency = false,
}: {
  label: string;
  before: number;
  after: number;
  isCurrency?: boolean;
}) {
  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const prefix = isCurrency ? '$' : '';

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono text-xs text-muted-foreground">
        {prefix}{before.toLocaleString()}
      </span>
      <span className="text-muted-foreground">→</span>
      <span className={`font-mono text-xs font-bold ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-foreground'
      }`}>
        {prefix}{after.toLocaleString()}
      </span>
      {delta !== 0 && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {isPositive ? '+' : ''}{prefix}{delta.toLocaleString()}
        </span>
      )}
    </div>
  );
}
