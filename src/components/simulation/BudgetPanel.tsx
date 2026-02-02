import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GLOBAL_BUDGET, CHANNELS, PRODUCTS } from '@/lib/marketingConstants';
import type { ChannelSpend } from '@/hooks/useMarketingSimulation';
import type { ProductId } from '@/lib/marketingConstants';
import { RotateCcw } from 'lucide-react';

interface BudgetPanelProps {
  channelSpend: ChannelSpend;
  onChannelSpendChange: (channelId: keyof ChannelSpend, value: number) => void;
  selectedProduct: ProductId;
  onProductChange: (product: ProductId) => void;
  remainingBudget: number;
  totalSpent: number;
  onReset: () => void;
}

export function BudgetPanel({
  channelSpend,
  onChannelSpendChange,
  selectedProduct,
  onProductChange,
  remainingBudget,
  totalSpent,
  onReset,
}: BudgetPanelProps) {
  const budgetPercentUsed = (totalSpent / GLOBAL_BUDGET) * 100;

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Budget Control Panel</CardTitle>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        
        {/* Budget Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Budget</span>
            <span className="font-bold text-primary">
              ${GLOBAL_BUDGET.toLocaleString()}
            </span>
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
              style={{ width: `${budgetPercentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Spent: <span className="font-semibold text-foreground">${totalSpent.toLocaleString()}</span>
            </span>
            <span className={remainingBudget === 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
              Remaining: <span className="font-semibold text-foreground">${remainingBudget.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Product Toggle */}
        <div className="p-4 bg-secondary/50 rounded-lg">
          <Label className="text-sm font-medium mb-3 block">Product Being Promoted</Label>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium transition-colors ${selectedProduct === 'bottle' ? 'text-primary' : 'text-muted-foreground'}`}>
              {PRODUCTS.BOTTLE.name} (${PRODUCTS.BOTTLE.price})
            </span>
            <Switch
              checked={selectedProduct === 'chair'}
              onCheckedChange={(checked) => onProductChange(checked ? 'chair' : 'bottle')}
            />
            <span className={`text-sm font-medium transition-colors ${selectedProduct === 'chair' ? 'text-primary' : 'text-muted-foreground'}`}>
              {PRODUCTS.CHAIR.name} (${PRODUCTS.CHAIR.price})
            </span>
          </div>
        </div>

        {/* Channel Sliders */}
        <div className="space-y-5">
          <Label className="text-sm font-medium">Channel Budget Allocation</Label>
          
          {Object.entries(CHANNELS).map(([channelId, channel]) => {
            const spend = channelSpend[channelId as keyof ChannelSpend];
            const maxValue = spend + remainingBudget;
            const isLocked = remainingBudget === 0 && spend === 0;

            return (
              <div key={channelId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: channel.color }}
                    />
                    <span className="font-medium text-sm">{channel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      (${channel.cpc}/click)
                    </span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: channel.color }}>
                    ${spend.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[spend]}
                  onValueChange={([value]) => onChannelSpendChange(channelId as keyof ChannelSpend, value)}
                  max={GLOBAL_BUDGET}
                  step={100}
                  disabled={isLocked}
                  className="cursor-pointer"
                  style={{
                    '--slider-color': channel.color,
                  } as React.CSSProperties}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
