export interface ProductItem {
  id: string;
  productId?: string;
  name: string;
  coinCost: number;
  coinType: 'Coins' | 'PCoins';
  sellingPrice: number;
  profit: number;
  isActive: boolean;
  sortOrder: number;
  gameType: string;
  category?: string;
  icon?: string;
  directProvider?: string;
  amount?: string | number;
  note?: string;
  url?: string;
  providerCategory?: string;
  providerSkuId?: string;
  providerSupportsMultipleQuantity?: boolean;
  multipleQuantityEnabled?: boolean;
  maxQuantity?: number;
  stockModeEnabled?: boolean;
  totalStockLimit?: number;
  stockUsage?: number;
  remainingStock?: number;
  stockKnown?: boolean;
  availabilityKnown?: boolean;
  available?: boolean;
  mediaStorageReference?: string;
}

export interface ProductFilterState {
  productId: string;
  gameType: string;
  status: 'all' | 'active' | 'inactive';
  coinType: 'all' | 'Coins' | 'PCoins';
}

export type SortField = 'name' | 'coinCost' | 'sellingPrice' | 'profit' | 'sortOrder';
export type SortDirection = 'asc' | 'desc';
