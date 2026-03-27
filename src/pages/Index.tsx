import { useCallback, useState, ReactNode } from 'react';
import { BarChart3, AlertCircle, PieChart, Settings } from 'lucide-react';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { SimulationShell } from '@/components/simulation/SimulationShell';
import { SimulationHome } from '@/components/simulation/SimulationHome';
import { SimulationDecisions } from '@/components/simulation/SimulationDecisions';
import { SplitViewBarCharts } from '@/components/simulation/SplitViewBarCharts';
import { ProductMixChart } from '@/components/simulation/ProductMixChart';
import { TabProvider, useTabs } from '@/contexts/TabContext';
import { ReasoningBoardProvider } from '@/contexts/ReasoningBoardContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import type { PanelId } from '@/types/workspaceTypes';
import { GLOBAL_BUDGET, PRODUCTS, CHANNELS, INITIAL_SPEND, calculateMixedRevenue as calcRevenue, CHANNEL_IDS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';



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

  // Compare-mode state for the shell's panel renderer (used in tab/split views)
  const [shellCompareActive, setShellCompareActive] = useState(false);
  const [shellSnapshotSpend, setShellSnapshotSpend] = useState<ChannelSpend | null>(null);
  const [shellBaselineSpend, setShellBaselineSpend] = useState<ChannelSpend>({ ...INITIAL_SPEND } as ChannelSpend);

  const handleShellActivateCompare = useCallback(() => {
    setShellSnapshotSpend({ ...channelSpend });
    setShellBaselineSpend({ ...channelSpend });
    setShellCompareActive(true);
    window.dispatchEvent(new Event('tutorial:compare-activated'));
  }, [channelSpend]);

  const handleShellCloseCompare = useCallback(() => {
    setShellCompareActive(false);
    setShellSnapshotSpend(null);
  }, []);

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
            isSplitView={shellCompareActive}
            snapshotSpend={shellSnapshotSpend}
            baselineSpend={shellBaselineSpend}
            onActivateSplitView={handleShellActivateCompare}
            onCloseSplitView={handleShellCloseCompare}
          />
        );
      case 'product-mix':
        return <ProductMixChart channelMetrics={channelMetrics} />;
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
  }, [channelSpend, updateChannelSpend, channelMetrics, totals, remainingBudget, hasUserModified, shellCompareActive, shellSnapshotSpend, shellBaselineSpend, handleShellActivateCompare, handleShellCloseCompare]);

  return (
    <>
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
      <TutorialOverlay />
    </>
  );
}

const Index = () => {
  return (
    <TabProvider>
      <ReasoningBoardProvider>
        <TutorialProvider>
          <SimulationContent />
        </TutorialProvider>
      </ReasoningBoardProvider>
    </TabProvider>
  );
};

export default Index;
