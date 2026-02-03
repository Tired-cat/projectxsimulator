import { SplitViewBarCharts } from './SplitViewBarCharts';
import { ProductMixChart } from './ProductMixChart';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  const tiktokPercent = Math.round((channelSpend.tiktok / GLOBAL_BUDGET) * 100);
  const newspaperPercent = Math.round((channelSpend.newspaper / GLOBAL_BUDGET) * 100);

  return (
    <div className="space-y-6">
      {/* Budget bar and reset */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Budget Used</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              ${totalSpent.toLocaleString()} <span className="text-slate-400 font-normal">/ ${GLOBAL_BUDGET.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(totalSpent / GLOBAL_BUDGET) * 100}%` }}
            />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Scenario Context - Dynamic percentages */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-center text-amber-800 dark:text-amber-200">
          <strong>Current allocation:</strong>{' '}
          <span className="text-pink-600 font-semibold">
            {tiktokPercent}% on TikTok (${channelSpend.tiktok.toLocaleString()})
          </span>
          ,{' '}
          <span className="text-yellow-700 dark:text-yellow-500 font-semibold">
            only {newspaperPercent}% on Newspaper (${channelSpend.newspaper.toLocaleString()})
          </span>
          . Can you reach{' '}
          <span className="text-green-600 font-bold">${REVENUE_GOAL.toLocaleString()} in revenue</span>?
        </p>
      </div>

      {/* Split View Bar Charts */}
      <SplitViewBarCharts
        channelSpend={channelSpend}
        onSpendChange={updateChannelSpend}
        channelMetrics={channelMetrics}
        totals={totals}
        remainingBudget={remainingBudget}
      />

      {/* Product Mix - moves below when split view is active, fills available space */}
      <ProductMixChart channelMetrics={channelMetrics} />

      {/* Hint Section */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground text-center">
          💡 <strong>The Trap:</strong> Switch between <em>"Views"</em> and <em>"Revenue"</em> filters.
          Which channel looks best in each view? Then check the <em>Product Mix</em> to see what each
          channel actually sells!
        </p>
      </div>

      {/* Goal Tracker */}
      <div className="p-4 bg-card border border-border rounded-lg">
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

        {/* Only show congratulations if user has modified AND reached goal */}
        {hasUserModified && totals.totalRevenue >= REVENUE_GOAL && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <span className="text-green-600 font-bold">
              🎉 Congratulations! You've reached the revenue goal!
            </span>
          </div>
        )}
      </div>

      {/* Collapsible Assumptions Panel */}
      <Accordion type="single" collapsible className="bg-card border border-border rounded-lg">
        <AccordionItem value="assumptions" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="text-sm font-medium">📋 Simulation Assumptions</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
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
    </div>
  );
}
