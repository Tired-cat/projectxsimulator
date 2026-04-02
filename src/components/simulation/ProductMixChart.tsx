import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHANNELS, PRODUCTS } from '@/lib/marketingConstants';
import type { calculateMixedRevenue } from '@/lib/marketingConstants';
import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FlaskConical } from 'lucide-react';
import { useReasoningBoard } from '@/contexts/ReasoningBoardContext';
import { Button } from '@/components/ui/button';
import type { ExternalEvidencePayload } from '@/lib/evidenceDnd';
import { getExternalChipDragId } from '@/lib/evidenceDnd';

interface ProductMixChartProps {
  channelMetrics: Record<string, ReturnType<typeof calculateMixedRevenue>>;
}

const channelOptions = [
  { id: 'all', label: 'All' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'newspaper', label: 'Newspaper' },
];

export function ProductMixChart({ channelMetrics }: ProductMixChartProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const { reasonMode, toggleReasonMode } = useReasoningBoard();

  const productData = useMemo(() => {
    if (selectedChannel === 'all') {
      const totals = {
        bottleRevenue: 0,
        cushionRevenue: 0,
        chairRevenue: 0,
        bottleSales: 0,
        cushionSales: 0,
        chairSales: 0,
        clicks: 0,
      };
      Object.values(channelMetrics).forEach((m) => {
        totals.bottleRevenue += m.bottleRevenue;
        totals.cushionRevenue += m.cushionRevenue;
        totals.chairRevenue += m.chairRevenue;
        totals.bottleSales += m.bottleSales;
        totals.cushionSales += m.cushionSales;
        totals.chairSales += m.chairSales;
        totals.clicks += m.clicks;
      });
      return totals;
    } else {
      const metrics = channelMetrics[selectedChannel];
      return {
        bottleRevenue: metrics?.bottleRevenue || 0,
        cushionRevenue: metrics?.cushionRevenue || 0,
        chairRevenue: metrics?.chairRevenue || 0,
        bottleSales: metrics?.bottleSales || 0,
        cushionSales: metrics?.cushionSales || 0,
        chairSales: metrics?.chairSales || 0,
        clicks: metrics?.clicks || 0,
      };
    }
  }, [selectedChannel, channelMetrics]);

  const totalRevenue = productData.bottleRevenue + productData.cushionRevenue + productData.chairRevenue;
  const totalUnits = productData.bottleSales + productData.cushionSales + productData.chairSales;

  const segments = [
    { 
      id: 'bottle', 
      label: PRODUCTS.BOTTLE.name, 
      revenue: productData.bottleRevenue,
      units: productData.bottleSales,
      color: 'hsl(199, 89%, 48%)' // Cyan
    },
    { 
      id: 'cushion', 
      label: PRODUCTS.CUSHION.name, 
      revenue: productData.cushionRevenue,
      units: productData.cushionSales,
      color: 'hsl(142, 71%, 45%)' // Green
    },
    { 
      id: 'chair', 
      label: PRODUCTS.CHAIR.name, 
      revenue: productData.chairRevenue,
      units: productData.chairSales,
      color: 'hsl(262, 83%, 58%)' // Purple
    },
  ];

  // Calculate pie segments
  let currentAngle = 0;
  const pieSegments = segments.map((segment) => {
    const percentage = totalRevenue > 0 ? (segment.revenue / totalRevenue) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...segment, percentage, startAngle, angle };
  });

  // Create SVG arc path
  const createArcPath = (startAngle: number, angle: number, radius: number = 100) => {
    if (angle === 0) return '';
    if (angle >= 360) {
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

  // No more native drag handlers — legend rows use DraggableLegendRow with @dnd-kit

  // Generate dynamic insight based on selected channel
  const getInsight = () => {
    if (selectedChannel === 'tiktok' && totalRevenue > 0) {
      const avgValue = totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0;
      if (productData.bottleRevenue > productData.chairRevenue) {
        return {
          type: 'warning' as const,
          icon: '💡',
          title: 'Notice',
          message: `TikTok drives ${productData.clicks.toLocaleString()} views but mostly sells $10 Water Bottles (avg $${avgValue}/sale). Low-ticket items dominate!`,
        };
      }
    }
    if (selectedChannel === 'newspaper' && totalRevenue > 0) {
      if (productData.chairRevenue > productData.bottleRevenue) {
        return {
          type: 'success' as const,
          icon: '✨',
          title: 'Insight',
          message: `Newspaper drives only ${productData.clicks.toLocaleString()} views but sells ${productData.chairSales} Pro Chairs ($${productData.chairRevenue.toLocaleString()} revenue). High-ticket focus!`,
        };
      }
    }
    if (selectedChannel === 'facebook' && totalRevenue > 0) {
      return {
        type: 'info' as const,
        icon: '📊',
        title: 'Analysis',
        message: `Facebook has balanced performance with ${productData.chairSales} chair sales generating $${productData.chairRevenue.toLocaleString()} in revenue.`,
      };
    }
    if (selectedChannel === 'instagram' && totalRevenue > 0) {
      return {
        type: 'info' as const,
        icon: '📱',
        title: 'Analysis',
        message: `Instagram sells a mix of products. ${productData.cushionSales} cushions contribute $${productData.cushionRevenue.toLocaleString()} to revenue.`,
      };
    }
    return null;
  };

  const insight = getInsight();

  return (
    <Card data-tutorial="product-mix" className={`border-2 transition-all duration-200 ${reasonMode ? 'border-primary bg-primary/[0.04] shadow-md shadow-primary/10' : 'border-primary/20 bg-card'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-xl font-bold">Product Mix Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">
              See what products each channel is actually selling
            </p>
          </div>
          {reasonMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
              <FlaskConical className="w-3.5 h-3.5" />
              Reason mode — drag segments to Reasoning Board
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Channel Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {channelOptions.map((option) => {
            const isActive = selectedChannel === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedChannel(option.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary hover:bg-secondary/80 text-foreground'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {reasonMode && (
          <div className="mb-4 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary font-medium flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
            Reason mode active — drag a pie segment or legend row to the Reasoning Board
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Legend with Units Sold */}
          <div className="space-y-3">
            {segments.map((segment) => {
              const percentage = totalRevenue > 0 ? ((segment.revenue / totalRevenue) * 100) : 0;
              const channelLabel = selectedChannel === 'all' ? 'All Channels' : CHANNELS[selectedChannel]?.name || selectedChannel;
              return (
                <DraggableLegendRow
                  key={segment.id}
                  segment={segment}
                  percentage={percentage}
                  channelLabel={channelLabel}
                  selectedChannel={selectedChannel}
                  reasonMode={reasonMode}
                />
              );
            })}
          </div>

          {/* Donut Chart */}
          <div className="relative w-48 h-48 mx-auto">
            <svg viewBox="-120 -120 240 240" className="w-full h-full">
              {totalRevenue > 0 ? (
                pieSegments.map((segment) => (
                  <path
                    key={segment.id}
                    d={createArcPath(segment.startAngle, segment.angle)}
                    fill={segment.color}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className={`transition-all duration-300 hover:opacity-80`}
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
              <circle r="50" fill="hsl(var(--card))" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground font-bold text-lg"
                fontSize="16"
              >
                ${totalRevenue.toLocaleString()}
              </text>
            </svg>
            {reasonMode && totalRevenue > 0 && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-primary font-semibold whitespace-nowrap">
                🧪 drag slices
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Insight */}
        {insight && (
          <div className={`mt-4 p-3 rounded-lg border ${
            insight.type === 'warning' 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : insight.type === 'success'
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}>
            <p className={`text-sm ${
              insight.type === 'warning'
                ? 'text-amber-700 dark:text-amber-300'
                : insight.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {insight.icon} <strong>{insight.title}:</strong> {insight.message}
            </p>
          </div>
        )}

        {totalRevenue === 0 && (
          <div className="mt-4 p-4 text-center text-muted-foreground">
            <p>No revenue data for this selection. Adjust your ad spend to see results.</p>
          </div>
        )}

        {/* Reason Button */}
        <div className="mt-6 flex justify-center">
          <Button
            data-tutorial="reason-button-mix"
            onClick={toggleReasonMode}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-all duration-200 border-2 ${
              reasonMode
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105'
                : 'bg-card hover:bg-primary/10 text-primary border-primary/40 hover:border-primary'
            }`}
            title={reasonMode ? 'Exit Reason mode' : 'Enter Reason mode'}
            variant="ghost"
          >
            <FlaskConical className="w-5 h-5" />
            {reasonMode ? '✓ Reasoning Active' : 'Reason'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// @dnd-kit draggable legend row
function DraggableLegendRow({
  segment,
  percentage,
  channelLabel,
  selectedChannel,
  reasonMode,
}: {
  segment: { id: string; label: string; revenue: number; units: number; color: string };
  percentage: number;
  channelLabel: string;
  selectedChannel: string;
  reasonMode: boolean;
}) {
  const payload = useMemo<ExternalEvidencePayload>(() => ({
    label: `${channelLabel} — ${segment.label}`,
    value: `$${segment.revenue.toLocaleString()} revenue, ${segment.units.toLocaleString()} sold`,
    context: `Product Mix • ${channelLabel}`,
    sourceId: `${segment.id}_${selectedChannel}`,
    chipKind: 'product' as const,
  }), [channelLabel, segment, selectedChannel]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: getExternalChipDragId(payload.sourceId, payload.label),
    data: { kind: 'external-chip', payload },
    disabled: !reasonMode,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ touchAction: reasonMode ? 'none' : 'auto' }}
      className={`flex items-center justify-between p-2 bg-secondary/30 rounded-lg transition-all ${
        reasonMode
          ? 'cursor-grab hover:ring-2 hover:ring-primary/40 active:opacity-60 select-none'
          : ''
      } ${isDragging ? 'opacity-30' : ''}`}
      title={reasonMode ? `Drag ${segment.label} to Reasoning Board` : undefined}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: segment.color }} />
        <div>
          <span className="text-sm font-medium">{segment.label}</span>
          <div className="text-xs text-muted-foreground">
            {segment.units.toLocaleString()} sold
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold" style={{ color: segment.color }}>
          ${segment.revenue.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
