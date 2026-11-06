export interface DiscountFilterState {
  productId: string;
  status: 'all' | 'active' | 'inactive';
}

export interface DiscountItem {
  id: string;
  gameName?: string;
  productName?: string;
  discountPercent?: number;
  discountPrice: string;
  profitMode?: string;
  sold: number;
  limit: number;
  remaining: number;
  createdAt: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}
