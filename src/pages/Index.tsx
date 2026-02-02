import { DraggableBarChart } from '@/components/simulation/DraggableBarChart';
import { ProductMixChart } from '@/components/simulation/ProductMixChart';
import { useMarketingSimulation } from '@/hooks/useMarketingSimulation';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { GLOBAL_BUDGET } from '@/lib/marketingConstants';

const Index = () => {
  const {
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                LumbarPro Marketing Simulator
              </h1>
              <p className="text-sm text-muted-foreground">
                Analyze channel performance and optimize your $20,000 budget
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Budget Used</div>
                <div className="text-lg font-bold text-primary">
                  ${totalSpent.toLocaleString()} / ${GLOBAL_BUDGET.toLocaleString()}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={resetSimulation}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scenario Context */}
      <div className="bg-secondary/30 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <p className="text-sm text-center">
            <strong>Scenario:</strong> You're the marketing manager at LumbarPro. 
            Current allocation: <span className="text-pink-500 font-semibold">70% on TikTok</span>, 
            <span className="text-yellow-600 font-semibold"> only 5% on Newspaper</span>. 
            Can you reach <span className="text-green-600 font-bold">$100,000 in revenue</span>?
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Draggable Bar Chart */}
          <div>
            <DraggableBarChart
              channelSpend={channelSpend}
              onSpendChange={updateChannelSpend}
              channelMetrics={channelMetrics}
              totals={totals}
              remainingBudget={remainingBudget}
            />
          </div>

          {/* Right Column - Product Mix Pie Chart */}
          <div>
            <ProductMixChart channelMetrics={channelMetrics} />
          </div>
        </div>

        {/* Hint Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-secondary/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>The Trap:</strong> Switch between <em>"Total Views"</em> and <em>"Revenue"</em> tabs. 
            Which channel looks best in each view? Then check the <em>Product Mix</em> to see what each channel actually sells!
          </p>
        </div>

        {/* Goal Tracker */}
        <div className="mt-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Goal Progress</div>
              <div className="text-2xl font-bold">
                ${totals.totalRevenue.toLocaleString()} 
                <span className="text-muted-foreground text-lg font-normal"> / $100,000</span>
              </div>
            </div>
            <div className="w-48">
              <div className="h-4 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    totals.totalRevenue >= 100000 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-r from-primary to-primary/70'
                  }`}
                  style={{ width: `${Math.min((totals.totalRevenue / 100000) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right mt-1">
                {((totals.totalRevenue / 100000) * 100).toFixed(1)}% of goal
              </div>
            </div>
          </div>
          
          {totals.totalRevenue >= 100000 && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <span className="text-green-600 font-bold">🎉 Congratulations! You've reached the revenue goal!</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
