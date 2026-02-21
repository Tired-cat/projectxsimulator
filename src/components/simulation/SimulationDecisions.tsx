import { ReactNode, useState, useCallback } from 'react';
import { BarChart3, DollarSign, AlertCircle, PieChart, Settings } from 'lucide-react';
import { SplitViewBarCharts } from './SplitViewBarCharts';
import { ProductMixChart } from './ProductMixChart';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS, INITIAL_SPEND, CHANNEL_IDS, calculateMixedRevenue as calcRevenue } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { Button } from '@/components/ui/button';
import { RotateCcw, Maximize2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DraggableCard } from '@/components/workspace';
import { useTabs } from '@/contexts/TabContext';
import type { PanelId } from '@/types/workspaceTypes';

const REVENUE_GOAL = 100000;

interface SimulationDecisionsProps {
  channelSpend: ChannelSpend;
  updateChannelSpend: (channelId: keyof ChannelSpend, value: number) => void;
  channelMetrics: Record<string, ReturnType<typeof calculateMixedRevenue>>;
  totals: {
    clicks: number;
    totalRevenue: number;
    profit: number;
  };
  remainingBudget: number;
  hasUserModified: boolean;
  totalSpent: number;
  onReset: () => void;
}

/**
 * Renders the simulation decision panels with drag-to-view support.
 * Original cards always remain in grid; dragging creates view clones.
 */
export function SimulationDecisions({
  channelSpend,
  updateChannelSpend,
  channelMetrics,
  totals,
  remainingBudget,
  hasUserModified,
  totalSpent,
  onReset,
}: SimulationDecisionsProps) {
  const { setDraggingPanelId, addPanelAsTab, activateSplitWithPanel, split, disableSplit } = useTabs();

  // ── Compare-mode state lifted here so bar-drag re-renders cannot reset it ──
  const [compareActive, setCompareActive] = useState(false);
  const [snapshotSpend, setSnapshotSpend] = useState<ChannelSpend | null>(null);
  const [baselineSpend, setBaselineSpend] = useState<ChannelSpend>({ ...INITIAL_SPEND } as ChannelSpend);

  const handleActivateCompare = useCallback(() => {
    setSnapshotSpend({ ...channelSpend });
    setBaselineSpend({ ...channelSpend });
    setCompareActive(true);
  }, [channelSpend]);

  const handleCloseCompare = useCallback(() => {
    setCompareActive(false);
    setSnapshotSpend(null);
  }, []);

  const handleAddAsTab = (panelId: PanelId, title: string) => {
    addPanelAsTab(panelId, title);
  };

  // Dragging a panel activates split mode with that panel in the right pane
  const handleOpenInSplit = (panelId: PanelId, title: string) => {
    activateSplitWithPanel(panelId, title, 'channel-performance');
  };

  // Render panel content by ID (used for both grid cards and cloned views)
  const renderPanelContent = (panelId: PanelId | string): ReactNode => {
    switch (panelId) {
      case 'channel-performance':
        return (
          <SplitViewBarCharts
            channelSpend={channelSpend}
            onSpendChange={updateChannelSpend}
            channelMetrics={channelMetrics}
            totals={totals}
            remainingBudget={remainingBudget}
            isSplitView={compareActive}
            snapshotSpend={snapshotSpend}
            baselineSpend={baselineSpend}
            onActivateSplitView={handleActivateCompare}
            onCloseSplitView={handleCloseCompare}
          />
        );
      case 'product-mix':
        return <ProductMixChart channelMetrics={channelMetrics} />;
      case 'goal-tracker':
        return <GoalTrackerContent totals={totals} hasUserModified={hasUserModified} />;
      case 'hints':
        return <HintsContent />;
      case 'assumptions':
        return <AssumptionsContent />;
      default:
        return null;
    }
  };

  // The main card grid component - always visible
  const CardGrid = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Channel Performance - full width */}
      <DraggableCard
        panelId="channel-performance"
        title="Channel Performance"
        icon={<BarChart3 className="h-4 w-4" />}
        className="lg:col-span-2"
        onDragStart={setDraggingPanelId}
        onDragEnd={() => setDraggingPanelId(null)}
        onAddAsTab={handleAddAsTab}
        onOpenInSplit={handleOpenInSplit}
      >
        {renderPanelContent('channel-performance')}
      </DraggableCard>

      {/* Product Mix */}
      <DraggableCard
        panelId="product-mix"
        title="Product Mix"
        icon={<PieChart className="h-4 w-4" />}
        onDragStart={setDraggingPanelId}
        onDragEnd={() => setDraggingPanelId(null)}
        onAddAsTab={handleAddAsTab}
        onOpenInSplit={handleOpenInSplit}
      >
        {renderPanelContent('product-mix')}
      </DraggableCard>

      {/* Goal Tracker */}
      <DraggableCard
        panelId="goal-tracker"
        title="Goal Tracker"
        icon={<DollarSign className="h-4 w-4" />}
        onDragStart={setDraggingPanelId}
        onDragEnd={() => setDraggingPanelId(null)}
        onAddAsTab={handleAddAsTab}
        onOpenInSplit={handleOpenInSplit}
      >
        {renderPanelContent('goal-tracker')}
      </DraggableCard>

      {/* Hints - full width */}
      <DraggableCard
        panelId="hints"
        title="Hints & Tips"
        icon={<AlertCircle className="h-4 w-4" />}
        className="lg:col-span-2"
        onDragStart={setDraggingPanelId}
        onDragEnd={() => setDraggingPanelId(null)}
        onAddAsTab={handleAddAsTab}
        onOpenInSplit={handleOpenInSplit}
      >
        {renderPanelContent('hints')}
      </DraggableCard>

      {/* Assumptions - full width */}
      <DraggableCard
        panelId="assumptions"
        title="Assumptions"
        icon={<Settings className="h-4 w-4" />}
        className="lg:col-span-2"
        contentClassName="pt-0"
        onDragStart={setDraggingPanelId}
        onDragEnd={() => setDraggingPanelId(null)}
        onAddAsTab={handleAddAsTab}
        onOpenInSplit={handleOpenInSplit}
      >
        {renderPanelContent('assumptions')}
      </DraggableCard>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed header with budget bar */}
      <div className="flex-shrink-0 p-4 pb-0">
        <BudgetHeader 
          totalSpent={totalSpent} 
          onReset={onReset}
          isSplit={split.enabled}
          onCloseSplit={disableSplit}
        />
      </div>

      {/* Card grid — always rendered; split is handled at shell level */}
      <div className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full">
          <CardGrid />
        </ScrollArea>
      </div>
    </div>
  );
}

// Budget header component
interface BudgetHeaderProps {
  totalSpent: number;
  onReset: () => void;
  isSplit: boolean;
  onCloseSplit: () => void;
}

export function BudgetHeader({ totalSpent, onReset, isSplit, onCloseSplit }: BudgetHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget Used</div>
          <div className="text-base font-bold text-foreground truncate">
            ${totalSpent.toLocaleString()} <span className="text-muted-foreground font-normal text-sm">/ ${GLOBAL_BUDGET.toLocaleString()}</span>
          </div>
        </div>
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
            style={{ width: `${(totalSpent / GLOBAL_BUDGET) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSplit && (
          <Button variant="secondary" size="sm" onClick={onCloseSplit}>
            <Maximize2 className="h-4 w-4 mr-1" />
            Close Split
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}

// Internal content components

interface GoalTrackerContentProps {
  totals: {
    totalRevenue: number;
  };
  hasUserModified: boolean;
}

function GoalTrackerContent({ totals, hasUserModified }: GoalTrackerContentProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Goal Progress</div>
          <div className="text-2xl font-bold">
            ${totals.totalRevenue.toLocaleString()}
            <span className="text-muted-foreground text-lg font-normal">
              {' '}
              / ${REVENUE_GOAL.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="w-48">
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                totals.totalRevenue >= REVENUE_GOAL
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-primary to-primary/70'
              }`}
              style={{ width: `${Math.min((totals.totalRevenue / REVENUE_GOAL) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right mt-1">
            {((totals.totalRevenue / REVENUE_GOAL) * 100).toFixed(1)}% of goal
          </div>
        </div>
      </div>

      {hasUserModified && totals.totalRevenue >= REVENUE_GOAL && (
        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <span className="text-green-600 font-bold">
            🎉 Congratulations! You've reached the revenue goal!
          </span>
        </div>
      )}
    </div>
  );
}

function HintsContent() {
  return (
    <div className="bg-gradient-to-r from-primary/5 to-secondary/30 rounded-lg p-4">
      <p className="text-sm text-muted-foreground">
        💡 <strong>The Trap:</strong> Switch between <em>"Views"</em> and <em>"Revenue"</em> filters.
        Which channel looks best in each view? Then check the <em>Product Mix</em> to see what each
        channel actually sells!
      </p>
    </div>
  );
}

function AssumptionsContent() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="assumptions" className="border-none">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="text-sm font-medium">📋 Simulation Assumptions</span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Products */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Products</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  • <strong>{PRODUCTS.BOTTLE.name}</strong> - Entry-level, impulse buy
                </p>
                <p>
                  • <strong>{PRODUCTS.CUSHION.name}</strong> - Mid-tier, considered purchase
                </p>
                <p>
                  • <strong>{PRODUCTS.CHAIR.name}</strong> - Premium, high-consideration
                </p>
              </div>
            </div>

            {/* Channel Characteristics */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Channel Tendencies</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  • <strong>TikTok:</strong> ${CHANNELS.tiktok.cpc}/click, young audience, impulse
                  buyers
                </p>
                <p>
                  • <strong>Instagram:</strong> ${CHANNELS.instagram.cpc}/click, lifestyle focus
                </p>
                <p>
                  • <strong>Facebook:</strong> ${CHANNELS.facebook.cpc}/click, older demographics
                </p>
                <p>
                  • <strong>Newspaper:</strong> ${CHANNELS.newspaper.cpc}/click, professional
                  readers, high intent
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              💡 Hint: Cheaper clicks don't always mean better ROI. Consider who is clicking and
              what they buy!
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
