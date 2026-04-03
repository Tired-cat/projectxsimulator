// Marketing Simulation Constants
// Starting state revenue: ~$71,360 (TikTok $1.3k, Instagram $6.2k, Facebook $22.9k, Newspaper $40.9k)
// The designed trap: TikTok gets 45% of budget but generates only 2% of revenue
// The hidden gem: Newspaper gets 5% of budget but generates 57% of revenue

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

// Channel data calibrated to match Excel revenue figures:
// At starting spend: TikTok=$9k→$1.2k, Instagram=$5k→$4.8k, Facebook=$3k→$15k, Newspaper=$500→$22k
// Total starting revenue: ~$43,000
export const CHANNELS: Record<string, ChannelConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    color: 'hsl(340, 82%, 52%)', // Vibrant pink
    cpc: 0.50,
    // At $9k spend: 18,000 clicks → ~$1,200 revenue
    // Bottle: 18000 * 0.006 = 108 → $1,080
    // Cushion: 18000 * 0.0005 = 9 → $450 (but we want ~$120 total from cushion/chair)
    conversionRates: {
      bottle: 0.006,    // 0.6% - Mostly sells bottles
      cushion: 0.0003,  // 0.03%
      chair: 0.00001,   // 0.001% - Almost never sells chairs
    },
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: 'hsl(280, 70%, 55%)', // Purple
    cpc: 0.75,
    // At $5k spend: 6,667 clicks → ~$4,800 revenue
    // Mix of bottles and cushions
    conversionRates: {
      bottle: 0.025,    // 2.5%
      cushion: 0.008,   // 0.8%
      chair: 0.0005,    // 0.05% - Rarely sells chairs
    },
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: 'hsl(214, 89%, 52%)', // Blue
    cpc: 1.00,
    // At $3k spend: 3,000 clicks → ~$15,000 revenue
    // Strong chair sales
    conversionRates: {
      bottle: 0.015,    // 1.5%
      cushion: 0.01,    // 1%
      chair: 0.009,     // 0.9% - Good chair conversion
    },
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    color: 'hsl(45, 93%, 47%)', // Gold
    cpc: 2.50,
    // At $500 spend: 200 clicks → ~$22,000 revenue (!)
    // This is the hidden gem - very high chair conversion
    conversionRates: {
      bottle: 0.02,     // 2%
      cushion: 0.04,    // 4%
      chair: 0.20,      // 20% - EXCELLENT chair conversion (the secret!)
    },
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>;

// Initial scenario: Match Excel's starting allocation exactly
// Updated to total $20,000 to avoid confusion
export const INITIAL_SPEND = {
  tiktok: 9000,      // 45% - The "Trap" (high views, low revenue)
  instagram: 5500,   // 27.5%
  facebook: 4500,    // 22.5%
  newspaper: 1000,   // 5% - The "Hidden Gem" (low views, high revenue)
};

// Target revenue from Excel at starting spend (for validation)
export const EXCEL_BASELINE_REVENUE = {
  tiktok: 1200,      // Low despite high spend
  instagram: 4800,   
  facebook: 15000,   
  newspaper: 22000,  // High despite low spend!
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
      profit: 0,
      bottleSales: 0,
      cushionSales: 0,
      chairSales: 0,
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
