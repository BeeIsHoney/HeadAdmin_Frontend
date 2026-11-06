import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, UploadCloud, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PREVIEW_IMAGE_ACCEPT,
  readImageFileAsDataUrl,
  validatePreviewImageFile,
} from '../../shared/utils/imageFile';
import { getSafeNavigationHref } from '../../shared/utils/safeUrl';
import type { GameItem } from './types/game.types';
import type { ProductCatalogGroupItem } from './types/catalog-group.types';
import { getSelectableCatalogProducts } from './utils/catalogGrouping';

interface CreateProductCatalogGroupViewProps {
  onCancel: () => void;
  onSave: (group: Omit<ProductCatalogGroupItem, 'id'>) => void | Promise<void>;
  editingGroup?: ProductCatalogGroupItem | null;
  existingGroups: ProductCatalogGroupItem[];
  products: GameItem[];
}

const createCatalogGroupCode = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const CreateProductCatalogGroupView = ({
  onCancel,
  onSave,
  editingGroup,
  existingGroups,
  products,
}: CreateProductCatalogGroupViewProps) => {
  const nextSortOrder = useMemo(() => {
    const highestCatalogGroupSort = existingGroups.reduce(
      (highest, group) => Math.max(highest, Number(group.sortOrder) || 0),
      0,
    );
    const highestProductSort = products.reduce(
      (highest, product) => Math.max(highest, Number(product.sort) || 0),
      0,
    );
    return Math.max(highestCatalogGroupSort, highestProductSort) + 1;
  }, [existingGroups, products]);

  const [name, setName] = useState(editingGroup?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(editingGroup?.logoUrl ?? '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(
    editingGroup?.sortOrder.toString() ?? nextSortOrder.toString(),
  );
  const [status, setStatus] = useState<'On' | 'Off'>(
    editingGroup?.isActive === false ? 'Off' : 'On',
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    editingGroup?.selectedProductIds ?? [],
  );
  const [productCardNames, setProductCardNames] = useState<Record<string, string>>(
    editingGroup?.productCardNames ?? {},
  );
  const [targetProductId, setTargetProductId] = useState<string>(
    editingGroup?.targetProductId ?? editingGroup?.selectedProductIds?.[0] ?? '',
  );
  const [productSearch, setProductSearch] = useState('');
  const [idCheckerEnabled, setIdCheckerEnabled] = useState(
    editingGroup?.idCheckerEnabled ?? false,
  );
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectableProducts = useMemo(
    () =>
      getSelectableCatalogProducts(products, existingGroups, editingGroup?.id).sort(
        (first, second) => first.name.localeCompare(second.name) || first.id.localeCompare(second.id),
      ),
    [editingGroup?.id, existingGroups, products],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return selectableProducts;
    return selectableProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.id.toLowerCase().includes(query),
    );
  }, [productSearch, selectableProducts]);

  const inputBaseClasses =
    'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';
  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validatePreviewImageFile(file);
    if (validationError) {
      setImageError(validationError);
      event.target.value = '';
      return;
    }

    try {
      setLogoUrl(await readImageFileAsDataUrl(file));
      setFileName(file.name);
      setImageError('');
    } catch {
      setImageError('Could not read the selected image.');
      event.target.value = '';
    }
  };

  const toggleProduct = (productId: string) => {
    const isCurrentlySelected = selectedProductIds.includes(productId);
    if (isCurrentlySelected) {
      setProductCardNames((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }

    setSelectedProductIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      setTargetProductId((currentTarget) =>
        currentTarget && next.includes(currentTarget) ? currentTarget : next[0] ?? '',
      );
      return next;
    });
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Catalog Group Name is required.');
      return;
    }
    if (selectedProductIds.length === 0) {
      setFormError('Select at least one product.');
      return;
    }

    const trimmedLogoUrl = logoUrl.trim();
    if (trimmedLogoUrl && !fileName && !getSafeNavigationHref(trimmedLogoUrl)) {
      setImageError('Use a valid relative, HTTP, or HTTPS image URL.');
      return;
    }

    const normalizedProductCardNames = selectedProductIds.reduce<Record<string, string>>(
      (result, productId) => {
        const customName = productCardNames[productId]?.trim();
        if (customName) result[productId] = customName;
        return result;
      },
      {},
    );

    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        code: editingGroup?.code || createCatalogGroupCode(trimmedName),
        logoUrl: trimmedLogoUrl || undefined,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        selectedProductIds,
        productCardNames: normalizedProductCardNames,
        targetProductId: targetProductId && selectedProductIds.includes(targetProductId)
          ? targetProductId
          : selectedProductIds[0],
        isActive: status === 'On',
        idCheckerEnabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex w-full flex-1 flex-col pb-4 text-white"
    >
      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="catalog-group-name" className={labelClass}>
              Catalog Group Name<span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="catalog-group-name"
              type="text"
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError('');
              }}
              placeholder="e.g. Mobile Legends"
              className={inputBaseClasses}
            />
          </div>

          <div className="space-y-2.5">
            <label htmlFor="catalog-group-logo" className={labelClass}>
              Logo/Icon
            </label>
            <input
              id="catalog-group-logo"
              type="file"
              accept={PREVIEW_IMAGE_ACCEPT}
              onChange={(event) => void handleFileChange(event)}
              className="sr-only"
            />
            <label
              htmlFor="catalog-group-logo"
              className="group flex min-h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 p-4 text-xs text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.04] hover:text-white/90 sm:text-sm"
            >
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Catalog group preview"
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-lg border border-white/20 object-cover shadow-md"
                  />
                  <div className="text-left">
                    <p className="max-w-[200px] truncate text-xs font-medium text-white sm:max-w-xs">
                      {fileName || 'Current image'}
                    </p>
                    <p className="text-[11px] text-white/40">Click to replace file</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors group-hover:bg-white/10 group-hover:text-white">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-white/80">
                    Drag & Drop your file or <span className="underline decoration-white/40 underline-offset-2">Browse</span>
                  </span>
                  <span className="mt-1 text-[11px] text-white/40">Supports JPG, PNG, WEBP (Max 2MB)</span>
                </>
              )}
            </label>

            {imageError && <p role="alert" className="text-xs text-rose-400">{imageError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <div>
              <label htmlFor="catalog-group-sort" className={labelClass}>Sort Order</label>
              <input
                id="catalog-group-sort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                placeholder="1"
                className={inputBaseClasses}
              />
            </div>

            <div className={`relative ${isStatusDropdownOpen ? 'z-40' : 'z-10'}`}>
              <label htmlFor="catalog-group-status" className={labelClass}>Status</label>
              <button
                id="catalog-group-status"
                type="button"
                onClick={() => setIsStatusDropdownOpen((current) => !current)}
                className={`${inputBaseClasses} flex cursor-pointer items-center justify-between`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${status === 'On' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="font-medium text-white">{status}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isStatusDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#121212] shadow-2xl"
                  >
                    {(['On', 'Off'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setStatus(option);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-white/10 ${
                          status === option ? 'bg-white/5 font-medium text-white' : 'text-white/70'
                        }`}
                      >
                        <span>{option}</span>
                        {status === option && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-white/90">Products Selector</span>
              <span className="text-xs text-white/50">{selectedProductIds.length} Selected</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search product..."
                  aria-label="Search catalog products"
                  className="w-full rounded-md border border-white/10 bg-black/40 py-1.5 pl-8 pr-8 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    aria-label="Clear product search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-white/40 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/40">No products found.</div>
              ) : (
                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 custom-scrollbar sm:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        aria-pressed={isSelected}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-2 text-left text-xs transition-all ${
                          isSelected
                            ? 'border-white/30 bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                            : 'border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected ? 'border-white bg-white text-black' : 'border-white/30 bg-black/40'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                          <span className="truncate font-medium">{product.name}</span>
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] text-white/35">{product.id}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedProductIds.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-white/90">Product Card Names (Optional)</span>
              <div className="grid grid-cols-1 gap-2.5 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-2">
                {selectedProductIds.map((id) => {
                  const product = products.find((item) => item.id === id);
                  const originalName = product?.name || id;
                  return (
                    <div key={id}>
                      <label htmlFor={`catalog-card-name-${id}`} className={labelClass}>
                        {originalName}
                      </label>
                      <input
                        id={`catalog-card-name-${id}`}
                        type="text"
                        maxLength={80}
                        value={productCardNames[id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setProductCardNames((current) => ({ ...current, [id]: value }));
                        }}
                        placeholder={originalName}
                        className={inputBaseClasses}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedProductIds.length > 0 && (
            <div>
              <label htmlFor="catalog-group-default-product" className={labelClass}>Default Product</label>
              <select
                id="catalog-group-default-product"
                value={targetProductId && selectedProductIds.includes(targetProductId) ? targetProductId : selectedProductIds[0]}
                onChange={(event) => setTargetProductId(event.target.value)}
                className={`${inputBaseClasses} cursor-pointer`}
              >
                {selectedProductIds.map((id) => {
                  const product = products.find((item) => item.id === id);
                  return (
                    <option key={id} value={id} className="bg-[#121212] text-white">
                      {product?.name || id}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-black/30 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="catalog-group-id-checker" className="cursor-pointer text-xs font-medium text-white/80">
                MLBB ID Checker (Optional)
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${idCheckerEnabled ? 'text-emerald-400' : 'text-white/40'}`}>
                  {idCheckerEnabled ? 'On' : 'Off'}
                </span>
                <label htmlFor="catalog-group-id-checker" className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <span className="sr-only">Toggle MLBB ID Checker</span>
                  <input
                    id="catalog-group-id-checker"
                    type="checkbox"
                    className="peer sr-only"
                    checked={idCheckerEnabled}
                    onChange={(event) => setIdCheckerEnabled(event.target.checked)}
                  />
                  <span className="relative h-5.5 w-10 rounded-full bg-white/10 after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white/60 after:transition-all after:content-[''] peer-checked:bg-white peer-checked:after:translate-x-[18px] peer-checked:after:bg-[#121212]" />
                </label>
              </div>
            </div>
          </div>

          {formError && <p role="alert" className="text-xs text-rose-400">{formError}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer rounded-lg border border-white/40 bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-[0.98] sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
              ) : (editingGroup ? 'Save Changes' : 'Create Product Catalog Group')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
