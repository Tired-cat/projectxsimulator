import { useCallback } from 'react';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { SimulationShell } from '@/components/simulation/SimulationShell';
import { SimulationHome } from '@/components/simulation/SimulationHome';
import { SimulationDecisions } from '@/components/simulation/SimulationDecisions';
import { TabProvider, useTabs } from '@/contexts/TabContext';

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
    />
  );
}

const Index = () => {
  return (
    <TabProvider>
      <SimulationContent />
    </TabProvider>
  );
};

export default Index;
