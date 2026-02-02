// Marketing Simulation Constants - Based on Excel Dashboard_1.0-2.xlsx

export const GLOBAL_BUDGET = 20000;

// Products from the Excel data
export const PRODUCTS = {
  BOTTLE: { id: 'bottle', name: '$10 Water Bottle', price: 10 },
  CUSHION: { id: 'cushion', name: '$50 Cushion', price: 50 },
  CHAIR: { id: 'chair', name: '$500 Pro Chair', price: 500 },
} as const;

export type ProductId = 'bottle' | 'cushion' | 'chair';

export interface ChannelConfig {
  id: string;
  name: string;
  color: string;
  cpc: number;
  conversionRates: {
    bottle: number;
    cushion: number;
    chair: number;
  };
}

// Channel data from Excel and Word document specs
export const CHANNELS: Record<string, ChannelConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    color: 'hsl(340, 82%, 52%)', // Vibrant pink
    cpc: 0.50,
    conversionRates: {
      bottle: 0.08,   // 8% - High for bottles
      cushion: 0.02,  // 2%
      chair: 0.0001,  // 0.01% - Very low for chairs
    },
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: 'hsl(280, 70%, 55%)', // Purple
    cpc: 0.75,
    conversionRates: {
      bottle: 0.04,   // 4%
      cushion: 0.03,  // 3%
      chair: 0.005,   // 0.5%
    },
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: 'hsl(214, 89%, 52%)', // Blue
    cpc: 1.00,
    conversionRates: {
      bottle: 0.02,   // 2%
      cushion: 0.02,  // 2%
      chair: 0.025,   // 2.5%
    },
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper/Email',
    color: 'hsl(45, 93%, 47%)', // Gold
    cpc: 2.50,
    conversionRates: {
      bottle: 0.01,   // 1% - Low for bottles
      cushion: 0.02,  // 2%
      chair: 0.05,    // 5% - High for chairs
    },
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>;

// Initial scenario from Excel: Current budget allocation
export const INITIAL_SPEND = {
  tiktok: 9000,      // 70% on TikTok (The Trap)
  instagram: 5000,
  facebook: 3000,
  newspaper: 500,    // Only 5% on Newspaper (The Solution)
};

// Initial revenue from Excel (for reference/validation)
export const INITIAL_REVENUE = {
  tiktok: 1200,
  instagram: 4800,
  facebook: 15000,
  newspaper: 22000,
};

// Product purchase distribution from Excel
export const PRODUCT_PURCHASES = {
  tiktok: { bottle: 5, cushion: 1, chair: 1 },
  instagram: { bottle: 1, cushion: 2, chair: 1 },
  facebook: { bottle: 0, cushion: 0, chair: 30 }, // Implied from revenue
  newspaper: { bottle: 1, cushion: 1, chair: 5 },
};

// Calculate metrics from spend
export function calculateChannelMetrics(
  channelId: string,
  spend: number,
  productId: ProductId = 'chair'
) {
  const channel = CHANNELS[channelId];
  if (!channel || spend <= 0) {
    return { clicks: 0, conversions: 0, revenue: 0, profit: 0 };
  }

  const clicks = Math.floor(spend / channel.cpc);
  const conversionRate = channel.conversionRates[productId];
  const conversions = Math.floor(clicks * conversionRate);
  const product = PRODUCTS[productId.toUpperCase() as keyof typeof PRODUCTS];
  const productPrice = product?.price || 10;
  const revenue = conversions * productPrice;
  const profit = revenue - spend;

  return { clicks, conversions, revenue, profit };
}

// Calculate all product revenue for a channel (mixed product sales)
export function calculateMixedRevenue(channelId: string, spend: number) {
  const channel = CHANNELS[channelId];
  if (!channel || spend <= 0) {
    return { 
      clicks: 0, 
      bottleRevenue: 0, 
      cushionRevenue: 0, 
      chairRevenue: 0, 
      totalRevenue: 0, 
      profit: 0 
    };
  }

  const clicks = Math.floor(spend / channel.cpc);
  
  const bottleSales = Math.floor(clicks * channel.conversionRates.bottle);
  const cushionSales = Math.floor(clicks * channel.conversionRates.cushion);
  const chairSales = Math.floor(clicks * channel.conversionRates.chair);
  
  const bottleRevenue = bottleSales * PRODUCTS.BOTTLE.price;
  const cushionRevenue = cushionSales * PRODUCTS.CUSHION.price;
  const chairRevenue = chairSales * PRODUCTS.CHAIR.price;
  
  const totalRevenue = bottleRevenue + cushionRevenue + chairRevenue;
  const profit = totalRevenue - spend;

  return { 
    clicks, 
    bottleRevenue, 
    cushionRevenue, 
    chairRevenue, 
    totalRevenue, 
    profit,
    bottleSales,
    cushionSales,
    chairSales,
  };
}
