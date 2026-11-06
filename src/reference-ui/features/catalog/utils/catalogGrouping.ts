import type { GameItem } from '../types/game.types';
import type { ProductCatalogGroupItem } from '../types/catalog-group.types';

export const getAssignedCatalogProductIds = (
  groups: ProductCatalogGroupItem[],
  excludedGroupId?: string,
): Set<string> =>
  new Set(
    groups
      .filter((group) => group.id !== excludedGroupId && group.isActive)
      .flatMap((group) => group.selectedProductIds),
  );

export const getSelectableCatalogProducts = (
  products: GameItem[],
  groups: ProductCatalogGroupItem[],
  editingGroupId?: string,
): GameItem[] => {
  const assignedElsewhere = getAssignedCatalogProductIds(groups, editingGroupId);
  return products.filter((product) => !assignedElsewhere.has(product.id));
};

export const getUngroupedCatalogProducts = (
  products: GameItem[],
  groups: ProductCatalogGroupItem[],
): GameItem[] => {
  const assignedIds = getAssignedCatalogProductIds(groups);
  return products.filter((product) => !assignedIds.has(product.id));
};

export const sortProductCatalogGroups = (
  groups: ProductCatalogGroupItem[],
): ProductCatalogGroupItem[] =>
  [...groups].sort(
    (first, second) =>
      first.sortOrder - second.sortOrder ||
      first.name.localeCompare(second.name) ||
      first.id.localeCompare(second.id),
  );

export const removeProductCatalogGroup = (
  groups: ProductCatalogGroupItem[],
  groupId: string,
): ProductCatalogGroupItem[] => groups.filter((group) => group.id !== groupId);
