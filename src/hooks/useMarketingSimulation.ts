import { useState, useCallback, useMemo } from 'react';
import {
  GLOBAL_BUDGET,
  CHANNEL_IDS,
  INITIAL_SPEND,
  calculateMixedRevenue,
} from '@/lib/marketingConstants';

export interface ChannelSpend {
  tiktok: number;
  instagram: number;
  facebook: number;
  newspaper: number;
}

export function useMarketingSimulation() {
  // Start with the Excel scenario data
  const [channelSpend, setChannelSpend] = useState<ChannelSpend>({
    ...INITIAL_SPEND,
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

  // Calculate mixed revenue (all products) for each channel
  const channelMetrics = useMemo(() => {
    return CHANNEL_IDS.reduce((acc, channelId) => {
      acc[channelId] = calculateMixedRevenue(
        channelId,
        channelSpend[channelId as keyof ChannelSpend]
      );
      return acc;
    }, {} as Record<string, ReturnType<typeof calculateMixedRevenue>>);
  }, [channelSpend]);

  const totals = useMemo(() => {
    const values = Object.values(channelMetrics);
    return {
      clicks: values.reduce((sum, m) => sum + m.clicks, 0),
      totalRevenue: values.reduce((sum, m) => sum + m.totalRevenue, 0),
      profit: values.reduce((sum, m) => sum + m.profit, 0),
      bottleRevenue: values.reduce((sum, m) => sum + m.bottleRevenue, 0),
      cushionRevenue: values.reduce((sum, m) => sum + m.cushionRevenue, 0),
      chairRevenue: values.reduce((sum, m) => sum + m.chairRevenue, 0),
    };
  }, [channelMetrics]);

  const resetSimulation = useCallback(() => {
    setChannelSpend({ ...INITIAL_SPEND });
  }, []);

  return {
    channelSpend,
    updateChannelSpend,
    totalSpent,
    remainingBudget,
    channelMetrics,
    totals,
    resetSimulation,
  };
}
