// Marketing Simulation Constants

export const GLOBAL_BUDGET = 20000;

export const PRODUCTS = {
  CHAIR: {
    id: 'chair',
    name: 'Pro Chair',
    price: 500,
  },
  BOTTLE: {
    id: 'bottle',
    name: 'Ergo-Bottle',
    price: 10,
  },
} as const;

export type ProductId = 'chair' | 'bottle';

export interface ChannelConfig {
  id: string;
  name: string;
  color: string;
  cpc: number; // Cost Per Click
  conversionRates: {
    chair: number;
    bottle: number;
  };
}

export const CHANNELS: Record<string, ChannelConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    color: 'hsl(340, 82%, 52%)', // Vibrant pink
    cpc: 0.50,
    conversionRates: {
      chair: 0.0001, // 0.01%
      bottle: 0.05,  // 5%
    },
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: 'hsl(280, 70%, 55%)', // Purple
    cpc: 0.75,
    conversionRates: {
      chair: 0.005, // 0.5%
      bottle: 0.03, // 3%
    },
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: 'hsl(214, 89%, 52%)', // Blue
    cpc: 1.00,
    conversionRates: {
      chair: 0.01, // 1%
      bottle: 0.02, // 2%
    },
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    color: 'hsl(45, 93%, 47%)', // Gold/Yellow
    cpc: 2.50,
    conversionRates: {
      chair: 0.05, // 5%
      bottle: 0.005, // 0.5%
    },
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>;

// Calculate metrics from spend
export function calculateChannelMetrics(
  channelId: string,
  spend: number,
  productId: ProductId
) {
  const channel = CHANNELS[channelId];
  if (!channel || spend <= 0) {
    return { clicks: 0, conversions: 0, revenue: 0, profit: 0 };
  }

  const clicks = Math.floor(spend / channel.cpc);
  const conversionRate = channel.conversionRates[productId];
  const conversions = Math.floor(clicks * conversionRate);
  const productPrice = productId === 'chair' ? PRODUCTS.CHAIR.price : PRODUCTS.BOTTLE.price;
  const revenue = conversions * productPrice;
  const profit = revenue - spend;

  return { clicks, conversions, revenue, profit };
}
