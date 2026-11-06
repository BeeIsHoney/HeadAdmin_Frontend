export interface ProductGroupItem {
  id: string;
  productId?: string;
  name: string;
  title: string;
  code?: string;
  sortOrder: number;
  productCount?: number;
  packagesCount?: number;
  selectedPackageIds?: string[];
  isActive: boolean;
  description?: string;
}

export interface ProductGroupFilterState {
  productId: string; // 'all' or a unique Product ID
  status: 'all' | 'active' | 'inactive';
}
