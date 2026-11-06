import type { GameItem } from '../types/game.types';
import type { ProductItem } from '../types/product.types';

const normalizedName = (value?: string): string => value?.trim().toLowerCase() ?? '';

const hasUniqueProductName = (products: GameItem[], name?: string): boolean => {
  const target = normalizedName(name);
  if (!target) return false;
  return products.filter((product) => normalizedName(product.name) === target).length === 1;
};

export const packageBelongsToProduct = (
  packageItem: ProductItem,
  product: GameItem,
  products: GameItem[],
): boolean => {
  if (packageItem.productId) return packageItem.productId === product.id;

  // A legacy name fallback is safe only when that name identifies one Product.
  return hasUniqueProductName(products, product.name)
    && normalizedName(packageItem.gameType) === normalizedName(product.name);
};
