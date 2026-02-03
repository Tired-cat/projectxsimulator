import { DraggableBarChart } from './DraggableBarChart';
import { ProductMixChart } from './ProductMixChart';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
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
}

export function SimulationDecisions({
  channelSpend,
  updateChannelSpend,
  channelMetrics,
  totals,
  remainingBudget,
  hasUserModified,
}: SimulationDecisionsProps) {
  const tiktokPercent = Math.round((channelSpend.tiktok / GLOBAL_BUDGET) * 100);
  const newspaperPercent = Math.round((channelSpend.newspaper / GLOBAL_BUDGET) * 100);

  return (
    <div className="space-y-6">
      {/* Scenario Context - Dynamic percentages */}
      <div className="bg-secondary/30 border border-border rounded-lg p-4">
        <p className="text-sm text-center">
          <strong>Current allocation:</strong>{' '}
          <span className="text-pink-500 font-semibold">
            {tiktokPercent}% on TikTok (${channelSpend.tiktok.toLocaleString()})
          </span>
          ,{' '}
          <span className="text-yellow-600 font-semibold">
            only {newspaperPercent}% on Newspaper (${channelSpend.newspaper.toLocaleString()})
          </span>
          . Can you reach{' '}
          <span className="text-green-600 font-bold">${REVENUE_GOAL.toLocaleString()} in revenue</span>?
        </p>
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DraggableBarChart
          channelSpend={channelSpend}
          onSpendChange={updateChannelSpend}
          channelMetrics={channelMetrics}
          totals={totals}
          remainingBudget={remainingBudget}
        />
        <ProductMixChart channelMetrics={channelMetrics} />
      </div>

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
