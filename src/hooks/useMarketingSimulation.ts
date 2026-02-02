import { useState, useCallback, useMemo } from 'react';
import {
  GLOBAL_BUDGET,
  CHANNEL_IDS,
  calculateChannelMetrics,
  type ProductId,
} from '@/lib/marketingConstants';

export interface ChannelSpend {
  tiktok: number;
  instagram: number;
  facebook: number;
  newspaper: number;
}

export function useMarketingSimulation() {
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('chair');
  const [channelSpend, setChannelSpend] = useState<ChannelSpend>({
    tiktok: 0,
    instagram: 0,
    facebook: 0,
    newspaper: 0,
  });

  const totalSpent = useMemo(() => {
    return Object.values(channelSpend).reduce((sum, val) => sum + val, 0);
  }, [channelSpend]);

  const remainingBudget = useMemo(() => {
    return GLOBAL_BUDGET - totalSpent;
  }, [totalSpent]);

  const updateChannelSpend = useCallback(
    (channelId: keyof ChannelSpend, value: number) => {
      setChannelSpend((prev) => {
        const otherSpend = totalSpent - prev[channelId];
        const maxAllowed = GLOBAL_BUDGET - otherSpend;
        const clampedValue = Math.min(Math.max(0, value), maxAllowed);
        return { ...prev, [channelId]: clampedValue };
      });
    },
    [totalSpent]
  );

  const channelMetrics = useMemo(() => {
    return CHANNEL_IDS.reduce((acc, channelId) => {
      acc[channelId] = calculateChannelMetrics(
        channelId,
        channelSpend[channelId as keyof ChannelSpend],
        selectedProduct
      );
      return acc;
    }, {} as Record<string, ReturnType<typeof calculateChannelMetrics>>);
  }, [channelSpend, selectedProduct]);

  const totals = useMemo(() => {
    const values = Object.values(channelMetrics);
    return {
      clicks: values.reduce((sum, m) => sum + m.clicks, 0),
      conversions: values.reduce((sum, m) => sum + m.conversions, 0),
      revenue: values.reduce((sum, m) => sum + m.revenue, 0),
      profit: values.reduce((sum, m) => sum + m.profit, 0),
    };
  }, [channelMetrics]);

  const resetSimulation = useCallback(() => {
    setChannelSpend({ tiktok: 0, instagram: 0, facebook: 0, newspaper: 0 });
  }, []);

  return {
    selectedProduct,
    setSelectedProduct,
    channelSpend,
    updateChannelSpend,
    totalSpent,
    remainingBudget,
    channelMetrics,
    totals,
    resetSimulation,
  };
}
