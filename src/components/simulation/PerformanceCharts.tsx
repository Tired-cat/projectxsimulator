import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CHANNELS } from '@/lib/marketingConstants';
import type { calculateChannelMetrics } from '@/lib/marketingConstants';

interface PerformanceChartsProps {
  channelMetrics: Record<string, ReturnType<typeof calculateChannelMetrics>>;
  totals: {
    clicks: number;
    conversions: number;
    revenue: number;
    profit: number;
  };
}

export function PerformanceCharts({ channelMetrics, totals }: PerformanceChartsProps) {
  // Prepare bar chart data
  const barData = Object.entries(CHANNELS).map(([channelId, channel]) => ({
    name: channel.name,
    color: channel.color,
    clicks: channelMetrics[channelId]?.clicks || 0,
    revenue: channelMetrics[channelId]?.revenue || 0,
    profit: channelMetrics[channelId]?.profit || 0,
    conversions: channelMetrics[channelId]?.conversions || 0,
  }));

  // Prepare pie chart data (only include channels with revenue)
  const pieData = barData
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      name: d.name,
      value: d.revenue,
      color: d.color,
    }));

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Performance Analytics</CardTitle>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{formatNumber(totals.clicks)}</div>
            <div className="text-xs text-muted-foreground">Total Clicks</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{formatNumber(totals.conversions)}</div>
            <div className="text-xs text-muted-foreground">Conversions</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.revenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(totals.profit)}
            </div>
            <div className="text-xs text-muted-foreground">Net Profit</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="clicks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="clicks">Total Views</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="mix">Product Mix</TabsTrigger>
          </TabsList>

          {/* Clicks/Views Chart */}
          <TabsContent value="clicks" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={formatNumber} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), 'Clicks']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="clicks" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Revenue Chart */}
          <TabsContent value="revenue" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={formatCurrency} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Product Mix Pie Chart */}
          <TabsContent value="mix" className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Allocate budget to see revenue distribution</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
