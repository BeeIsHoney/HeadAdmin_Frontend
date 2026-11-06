import type { ProductItem } from '../types/product.types';

const MANUAL_SOURCES = new Set(['manual', 'manual order']);
const LIVE_USDT_COST_SOURCES = new Set(['g2b:gcv', 'fzc:gcv', 'g2b', 'g2bulk', 'fzc', 'fzr', 'gxl', 'tpn', 'ltb', 'b2']);

/** Manual fulfillment is determined by Source, not by whether a cost exists. */
export const isManualSourceProductPackage = (
  product: Pick<ProductItem, 'directProvider'>,
): boolean => MANUAL_SOURCES.has(product.directProvider?.trim().toLowerCase() ?? '');

/**
 * Legacy helper retained for existing callers. A package is effectively manual
 * for old UI purposes when it is Manual Source or has no usable stored cost.
 */
export const isManualProductPackage = (
  product: Pick<ProductItem, 'directProvider' | 'coinCost'>,
): boolean => {
  const cost = Number(product.coinCost);
  return isManualSourceProductPackage(product) || !Number.isFinite(cost) || cost <= 0;
};

export type PriceServer = 'USDT' | 'SC';

export const isSmileOneProductPackage = (
  product: Pick<ProductItem, 'directProvider'>,
): boolean => (product.directProvider?.trim().toUpperCase() ?? '') === 'SMILEONE';

/**
 * Manual Source Cost packages are priced in USDT only. They remain selectable on
 * USDT while Source Cost is blank; the backend skips calculation until it is positive.
 * SC is reserved for SmileOne/API coin-cost packages.
 */
export const isPackageEligibleForPriceServer = (
  product: Pick<ProductItem, 'directProvider' | 'coinCost'>,
  server: PriceServer,
): boolean => {
  if (isManualSourceProductPackage(product)) return server === 'USDT';

  const cost = Number(product.coinCost);
  const source = product.directProvider?.trim().toLowerCase() ?? '';
  if (!Number.isFinite(cost) || cost <= 0) {
    return server === 'USDT' && LIVE_USDT_COST_SOURCES.has(source);
  }

  return server === 'SC'
    ? isSmileOneProductPackage(product)
    : !isSmileOneProductPackage(product);
};
