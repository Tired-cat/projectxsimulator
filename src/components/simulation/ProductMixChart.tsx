import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHANNELS, PRODUCTS } from '@/lib/marketingConstants';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { useState } from 'react';

interface ProductMixChartProps {
  channelMetrics: Record<string, ReturnType<typeof calculateMixedRevenue>>;
}

export function ProductMixChart({ channelMetrics }: ProductMixChartProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const getProductData = () => {
    if (selectedChannel === 'all') {
      // Aggregate all channels
      const totals = {
        bottle: 0,
        cushion: 0,
        chair: 0,
      };
      Object.values(channelMetrics).forEach((m) => {
        totals.bottle += m.bottleRevenue;
        totals.cushion += m.cushionRevenue;
        totals.chair += m.chairRevenue;
      });
      return totals;
    } else {
      const metrics = channelMetrics[selectedChannel];
      return {
        bottle: metrics?.bottleRevenue || 0,
        cushion: metrics?.cushionRevenue || 0,
        chair: metrics?.chairRevenue || 0,
      };
    }
  };

  const productData = getProductData();
  const total = productData.bottle + productData.cushion + productData.chair;

  const segments = [
    { 
      id: 'bottle', 
      label: PRODUCTS.BOTTLE.name, 
      value: productData.bottle, 
      color: 'hsl(199, 89%, 48%)' // Cyan
    },
    { 
      id: 'cushion', 
      label: PRODUCTS.CUSHION.name, 
      value: productData.cushion, 
      color: 'hsl(142, 71%, 45%)' // Green
    },
    { 
      id: 'chair', 
      label: PRODUCTS.CHAIR.name, 
      value: productData.chair, 
      color: 'hsl(262, 83%, 58%)' // Purple
    },
  ];

  // Calculate pie segments
  let currentAngle = 0;
  const pieSegments = segments.map((segment) => {
    const percentage = total > 0 ? (segment.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...segment, percentage, startAngle, angle };
  });

  // Create SVG arc path
  const createArcPath = (startAngle: number, angle: number, radius: number = 100) => {
    if (angle === 0) return '';
    if (angle >= 360) {
      // Full circle
      return `M 0 -${radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 -${radius}`;
    }
    
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
    
    const x1 = radius * Math.cos(startRad);
    const y1 = radius * Math.sin(startRad);
    const x2 = radius * Math.cos(endRad);
    const y2 = radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold">Product Mix Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          See what products each channel is actually selling
        </p>
      </CardHeader>

      <CardContent>
        {/* Channel Filter */}
        <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {Object.entries(CHANNELS).map(([id, channel]) => (
              <TabsTrigger key={id} value={id} className="text-xs">
                {channel.name.split('/')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedChannel} className="mt-0">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Pie Chart */}
              <div className="relative w-48 h-48">
                <svg viewBox="-120 -120 240 240" className="w-full h-full">
                  {total > 0 ? (
                    pieSegments.map((segment) => (
                      <path
                        key={segment.id}
                        d={createArcPath(segment.startAngle, segment.angle)}
                        fill={segment.color}
                        stroke="hsl(var(--background))"
                        strokeWidth="2"
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))
                  ) : (
                    <circle
                      r="100"
                      fill="hsl(var(--secondary))"
                      stroke="hsl(var(--border))"
                      strokeWidth="2"
                    />
                  )}
                  {/* Center hole for donut effect */}
                  <circle r="50" fill="hsl(var(--card))" />
                  {/* Center text */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground font-bold text-lg"
                    fontSize="16"
                  >
                    ${total.toLocaleString()}
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {segments.map((segment) => {
                  const percentage = total > 0 ? ((segment.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={segment.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="text-sm font-medium">{segment.label}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: segment.color }}>
                          ${segment.value.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight for TikTok */}
            {selectedChannel === 'tiktok' && total > 0 && productData.bottle > productData.chair && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  💡 <strong>Notice:</strong> TikTok is mostly selling low-ticket Water Bottles, 
                  not Pro Chairs. The audience may not match the product!
                </p>
              </div>
            )}

            {/* Insight for Newspaper */}
            {selectedChannel === 'newspaper' && total > 0 && productData.chair > productData.bottle && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✨ <strong>Insight:</strong> Newspaper readers are buying high-ticket Pro Chairs! 
                  This channel has strong product-market fit for premium products.
                </p>
              </div>
            )}

            {total === 0 && (
              <div className="mt-4 p-4 text-center text-muted-foreground">
                <p>No revenue data for this selection. Adjust your ad spend to see results.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
