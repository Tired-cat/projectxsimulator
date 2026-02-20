import { useCallback, ReactNode } from 'react';
import { BarChart3, DollarSign, AlertCircle, PieChart, Settings } from 'lucide-react';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { SimulationShell } from '@/components/simulation/SimulationShell';
import { SimulationHome } from '@/components/simulation/SimulationHome';
import { SimulationDecisions } from '@/components/simulation/SimulationDecisions';
import { SplitViewBarCharts } from '@/components/simulation/SplitViewBarCharts';
import { ProductMixChart } from '@/components/simulation/ProductMixChart';
import { TabProvider, useTabs } from '@/contexts/TabContext';
import { ReasoningBoardProvider } from '@/contexts/ReasoningBoardContext';
import type { PanelId } from '@/types/workspaceTypes';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS } from '@/lib/marketingConstants';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const REVENUE_GOAL = 100000;

function SimulationContent() {
  const { openTab } = useTabs();
  
  const {
    channelSpend,
    updateChannelSpend,
    remainingBudget,
    totalSpent,
    channelMetrics,
    totals,
    resetSimulation,
    hasUserModified,
  } = useMarketingSimulation();

  const handleStartDecisions = useCallback(() => {
    openTab('decisions');
  }, [openTab]);

  // Centralized panel content renderer for the shell
  const renderPanelContent = useCallback((panelId: PanelId): ReactNode => {
    switch (panelId) {
      case 'channel-performance':
        return (
          <SplitViewBarCharts
            channelSpend={channelSpend}
            onSpendChange={updateChannelSpend}
            channelMetrics={channelMetrics}
            totals={totals}
            remainingBudget={remainingBudget}
          />
        );
      case 'product-mix':
        return <ProductMixChart channelMetrics={channelMetrics} />;
      case 'goal-tracker':
        return (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Goal Progress</div>
                <div className="text-2xl font-bold">
                  ${totals.totalRevenue.toLocaleString()}
                  <span className="text-muted-foreground text-lg font-normal">
                    {' '}/ ${REVENUE_GOAL.toLocaleString()}
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
      case 'hints':
        return (
          <div className="bg-gradient-to-r from-primary/5 to-secondary/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>The Trap:</strong> Switch between <em>"Views"</em> and <em>"Revenue"</em> filters.
              Which channel looks best in each view? Then check the <em>Product Mix</em> to see what each
              channel actually sells!
            </p>
          </div>
        );
      case 'assumptions':
        return (
          <Accordion type="single" collapsible defaultValue="assumptions">
            <AccordionItem value="assumptions" className="border-none">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-sm font-medium">📋 Simulation Assumptions</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Products</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• <strong>{PRODUCTS.BOTTLE.name}</strong> - Entry-level, impulse buy</p>
                      <p>• <strong>{PRODUCTS.CUSHION.name}</strong> - Mid-tier, considered purchase</p>
                      <p>• <strong>{PRODUCTS.CHAIR.name}</strong> - Premium, high-consideration</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Channel Tendencies</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• <strong>TikTok:</strong> ${CHANNELS.tiktok.cpc}/click, young audience, impulse buyers</p>
                      <p>• <strong>Instagram:</strong> ${CHANNELS.instagram.cpc}/click, lifestyle focus</p>
                      <p>• <strong>Facebook:</strong> ${CHANNELS.facebook.cpc}/click, older demographics</p>
                      <p>• <strong>Newspaper:</strong> ${CHANNELS.newspaper.cpc}/click, professional readers, high intent</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      default:
        return null;
    }
  }, [channelSpend, updateChannelSpend, channelMetrics, totals, remainingBudget, hasUserModified]);

  return (
    <SimulationShell
      homeContent={
        <SimulationHome 
          onStartDecisions={handleStartDecisions}
          currentRevenue={totals.totalRevenue}
        />
      }
      decisionsContent={
        <SimulationDecisions
          channelSpend={channelSpend}
          updateChannelSpend={updateChannelSpend}
          channelMetrics={channelMetrics}
          totals={totals}
          remainingBudget={remainingBudget}
          hasUserModified={hasUserModified}
          totalSpent={totalSpent}
          onReset={resetSimulation}
        />
      }
      renderPanelContent={renderPanelContent}
    />
  );
}

const Index = () => {
  return (
    <TabProvider>
      <ReasoningBoardProvider>
        <SimulationContent />
      </ReasoningBoardProvider>
    </TabProvider>
  );
};

export default Index;
