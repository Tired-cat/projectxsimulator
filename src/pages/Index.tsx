import { useState, useCallback } from 'react';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { SimulationShell, SimulationTab } from '@/components/simulation/SimulationShell';
import { SimulationHome } from '@/components/simulation/SimulationHome';
import { SimulationDecisions } from '@/components/simulation/SimulationDecisions';

const Index = () => {
  const [activeTab, setActiveTab] = useState<SimulationTab>('home');
  
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
    setActiveTab('decisions');
  }, []);

  return (
    <SimulationShell
      totalSpent={totalSpent}
      onReset={resetSimulation}
      activeTab={activeTab}
      onTabChange={setActiveTab}
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
        />
      }
    />
  );
};

export default Index;
