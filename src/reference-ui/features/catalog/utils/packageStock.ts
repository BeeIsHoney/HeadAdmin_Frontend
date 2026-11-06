const PROVIDER_STOCK_SOURCES = new Set(['G2B:GCV', 'FZC:GCV', 'LG:GCV']);

export const getPackageStockKind = (source: string): 'manual' | null => {
  if (source === 'Manual') return 'manual';
  return null;
};

export const isProviderStockSource = (source: string): boolean =>
  PROVIDER_STOCK_SOURCES.has(source);

export const formatProviderStock = (source: string, stock: {
  remainingStock?: number;
  stockKnown?: boolean;
  availabilityKnown?: boolean;
  available?: boolean;
}): string => {
  if (source === 'LG:GCV' && stock.stockKnown === false) {
    if (stock.availabilityKnown === false || stock.available === undefined) return 'Unavailable';
    return stock.available ? 'Available' : 'Out of stock';
  }
  return String(stock.remainingStock ?? 0);
};

export const calculateManualRemainingStock = (total: number, usage: number): number =>
  Math.max(0, Math.floor(total) - Math.max(0, Math.floor(usage)));
