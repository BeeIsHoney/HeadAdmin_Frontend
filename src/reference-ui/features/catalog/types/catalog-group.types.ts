export interface ProductCatalogGroupItem {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  logoStorageReference?: string;
  sortOrder: number;
  selectedProductIds: string[];
  productCardNames?: Record<string, string>;
  targetProductId?: string;
  isActive: boolean;
  idCheckerEnabled: boolean;
}

export interface ProductCatalogGroupFilterState {
  status: 'all' | 'active' | 'inactive';
}
