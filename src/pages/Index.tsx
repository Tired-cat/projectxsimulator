import { BudgetPanel } from '@/components/simulation/BudgetPanel';
import { PerformanceCharts } from '@/components/simulation/PerformanceCharts';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';

const Index = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    channelSpend,
    updateChannelSpend,
    remainingBudget,
    totalSpent,
    channelMetrics,
    totals,
    resetSimulation,
  } = useMarketingSimulation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Marketing Budget Simulator
              </h1>
              <p className="text-sm text-muted-foreground">
                Phase 0: The Market Engine
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Goal</div>
              <div className="text-lg font-bold text-primary">
                Reach $100,000 Revenue
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Controls */}
          <div>
            <BudgetPanel
              channelSpend={channelSpend}
              onChannelSpendChange={updateChannelSpend}
              selectedProduct={selectedProduct}
              onProductChange={setSelectedProduct}
              remainingBudget={remainingBudget}
              totalSpent={totalSpent}
              onReset={resetSimulation}
            />
          </div>

          {/* Right Column - Charts */}
          <div>
            <PerformanceCharts
              channelMetrics={channelMetrics}
              totals={totals}
            />
          </div>
        </div>

        {/* Hint Section */}
        <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Hint:</strong> Try switching between "Total Views" and "Revenue" tabs. 
            Which channel looks best in each view? Can you find the trap?
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
