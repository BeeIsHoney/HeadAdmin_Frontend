import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type ProductGroupItem } from './types/group.types';
import type { GameItem } from './types/game.types';
import type { ProductItem } from './types/product.types';

export const CreateProductGroupView: React.FC<{
  onCancel: () => void;
  onSave: (groupData: Omit<ProductGroupItem, 'id'>) => void | Promise<void>;
  editingGroup?: ProductGroupItem | null;
  existingGroups?: ProductGroupItem[];
  products: GameItem[];
  packages: ProductItem[];
}> = ({ onCancel, onSave, editingGroup, existingGroups = [], products, packages }) => {
  const availableProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    [products],
  );

  const initialProduct = editingGroup?.productId
    ? availableProducts.find((product) => product.id === editingGroup.productId)
    : availableProducts.find((product) => product.name.toLowerCase() === editingGroup?.name?.toLowerCase());
  const [selectedProductId, setSelectedProductId] = useState(
    initialProduct?.id || availableProducts[0]?.id || ''
  );
  const selectedProduct = useMemo(
    () => availableProducts.find((product) => product.id === selectedProductId),
    [availableProducts, selectedProductId],
  );
  const [title, setTitle] = useState(editingGroup?.title || '');
  const [description, setDescription] = useState(editingGroup?.description || '');

  // Calculate default sort order based on selected product groups
  const calculateDefaultSortOrder = (productId: string, productName: string) => {
    const productGroups = existingGroups.filter((group) =>
      group.productId ? group.productId === productId : group.name.toLowerCase() === productName.toLowerCase()
    );
    if (productGroups.length === 0) return '1';
    return (Math.max(...productGroups.map((g) => g.sortOrder)) + 1).toString();
  };

  const [sortOrder, setSortOrder] = useState(
    editingGroup?.sortOrder?.toString() || calculateDefaultSortOrder(initialProduct?.id || '', initialProduct?.name || '')
  );
  const [status, setStatus] = useState<'On' | 'Off'>(editingGroup ? (editingGroup.isActive ? 'On' : 'Off') : 'On');

  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Packages that belong to the selected Product.
  const productPackages = useMemo(() => {
    if (!selectedProduct) return [];
    return packages.filter((pkg) =>
      pkg.productId ? pkg.productId === selectedProduct.id : pkg.gameType.toLowerCase() === selectedProduct.name.toLowerCase()
    );
  }, [packages, selectedProduct]);

  // A package can belong to only one Product Group. Existing groups are ordered
  // deterministically so legacy duplicate assignments keep the first group as owner.
  const packageOwnerById = useMemo(() => {
    const owners = new Map<string, string>();
    if (!selectedProduct) return owners;

    existingGroups
      .filter((group) =>
        group.productId
          ? group.productId === selectedProduct.id
          : group.name.toLowerCase() === selectedProduct.name.toLowerCase()
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
      .forEach((group) => {
        (group.selectedPackageIds ?? []).forEach((packageId) => {
          if (!owners.has(packageId)) owners.set(packageId, group.id);
        });
      });

    return owners;
  }, [existingGroups, selectedProduct]);

  const availableProductPackages = useMemo(
    () => productPackages.filter((pkg) => {
      const ownerId = packageOwnerById.get(pkg.id);
      return !ownerId || ownerId === editingGroup?.id;
    }),
    [editingGroup?.id, packageOwnerById, productPackages],
  );

  // Restore only packages owned by this group (or currently unclaimed packages).
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(
    (editingGroup?.selectedPackageIds ?? []).filter((packageId) => {
      const ownerId = packageOwnerById.get(packageId);
      return !ownerId || ownerId === editingGroup?.id;
    }),
  );

  const [isPackagesSelectorOpen, setIsPackagesSelectorOpen] = useState(false);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return availableProducts;
    return availableProducts.filter((product) =>
      product.name.toLowerCase().includes(query) || product.id.toLowerCase().includes(query)
    );
  }, [availableProducts, productSearch]);

  const filteredPackages = useMemo(() => {
    if (!packageSearchQuery) return availableProductPackages;
    return availableProductPackages.filter((p) => p.name.toLowerCase().includes(packageSearchQuery.toLowerCase()));
  }, [availableProductPackages, packageSearchQuery]);

  const handleSelectProduct = (product: GameItem) => {
    setSelectedProductId(product.id);
    setIsProductDropdownOpen(false);
    // Product changes never auto-select packages.
    setSelectedPackageIds([]);
    setPackageSearchQuery('');
    setIsPackagesSelectorOpen(false);
    if (!editingGroup) {
      setSortOrder(calculateDefaultSortOrder(product.id, product.name));
    }
  };

  const togglePackage = (packageId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(packageId) ? prev.filter((id) => id !== packageId) : [...prev, packageId]
    );
  };

  const handleSelectAllPackages = () => {
    setSelectedPackageIds(availableProductPackages.map((p) => p.id));
  };

  const handleDeselectAllPackages = () => {
    setSelectedPackageIds([]);
  };

  const inputBaseClasses =
    'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';
  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!selectedProduct || !title.trim()) return;

    const formattedCode =
      editingGroup?.code ||
      `${selectedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    setIsSaving(true);
    try {
      await onSave({
        productId: selectedProduct.id,
        name: selectedProduct.name.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        code: formattedCode,
        sortOrder: parseInt(sortOrder, 10) || 0,
        productCount: selectedPackageIds.length,
        packagesCount: selectedPackageIds.length,
        selectedPackageIds,
        isActive: status === 'On',
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
      className="w-full flex-1 flex flex-col text-white pb-4"
    >
      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* 1. Product* (Dropdown Selector) */}
          <div className="relative" ref={productDropdownRef}>
            <label htmlFor="group-product-select-btn" className={labelClass}>
              Product<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <button
                id="group-product-select-btn"
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
              >
                <span className="font-medium text-white">{selectedProduct?.name || 'Select a Product'}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform ${
                    isProductDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isProductDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-50 max-h-60"
                  >
                    <div className="p-2 border-b border-white/10">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search product..."
                          className="w-full bg-black/40 border border-white/10 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar max-h-48 py-1">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                            selectedProductId === product.id
                              ? 'bg-white/15 text-white font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{product.name}</span>
                            <span className="block text-[10px] font-mono text-white/35">{product.id}</span>
                          </span>
                          {selectedProductId === product.id && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 2. Title* */}
          <div>
            <label htmlFor="group-title" className={labelClass}>
              Title<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="group-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UC Top-Up & Royale Pass"
              className={inputBaseClasses}
            />
          </div>

          {/* 3. Description (Optional) */}
          <div>
            <label htmlFor="group-description" className={labelClass}>
              Description <span className="text-white/35">(Optional)</span>
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter product group description or category notes..."
              rows={3}
              className={`${inputBaseClasses} resize-y min-h-20`}
            />
          </div>

          {/* 4. Sort Order & 5. Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sort Order */}
            <div>
              <label htmlFor="group-sort-order" className={labelClass}>
                Sort Order
              </label>
              <input
                id="group-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                className={inputBaseClasses}
              />
            </div>

            {/* Status (On / Off Dropdown) */}
            <div className="relative" ref={statusDropdownRef}>
              <label htmlFor="group-status-btn" className={labelClass}>
                Status
              </label>
              <div className="relative">
                <button
                  id="group-status-btn"
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
                >
                  <span>{status}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/50 transition-transform ${
                      isStatusDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isStatusDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-50"
                    >
                      {(['On', 'Off'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setStatus(opt);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                            status === opt
                              ? 'bg-white/15 text-white font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span>{opt}</span>
                          {status === opt && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 6. Packages Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/90">
                  Packages {selectedPackageIds.length} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackagesSelectorOpen(!isPackagesSelectorOpen)}
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white/70" />
                  <span>{isPackagesSelectorOpen ? 'Hide Packages' : 'Add Packages'}</span>
                </button>
              </div>
            </div>

            {/* Packages Selector Box */}
            <AnimatePresence>
              {isPackagesSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/30 border border-white/10 rounded-lg p-3 space-y-3 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAllPackages}
                        className="text-white/80 hover:text-white font-medium transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-white/20">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllPackages}
                        className="text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {availableProductPackages.length > 6 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={packageSearchQuery}
                        onChange={(e) => setPackageSearchQuery(e.target.value)}
                        placeholder="Search package (e.g. UC, Diamonds)..."
                        className="w-full bg-black/40 border border-white/10 rounded-md pl-8 pr-2.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      />
                      {packageSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPackageSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {productPackages.length === 0 ? (
                    <div className="py-6 text-center text-xs text-white/40">
                      No packages found for {selectedProduct?.name || 'the selected product'}.
                    </div>
                  ) : availableProductPackages.length === 0 ? (
                    <div className="py-6 text-center text-xs text-white/40">
                      All packages for {selectedProduct?.name || 'the selected product'} are already assigned to other groups.
                    </div>
                  ) : filteredPackages.length === 0 ? (
                    <div className="py-4 text-center text-xs text-white/40">
                      No matching packages found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {filteredPackages.map((pkg) => {
                        const isChecked = selectedPackageIds.includes(pkg.id);
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => togglePackage(pkg.id)}
                            className={`w-full text-left flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-white/10 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                                : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                                  isChecked
                                    ? 'bg-white border-white text-black'
                                    : 'border-white/30 bg-black/40'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium truncate">{pkg.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2 text-[11px] text-white/40">
                              <span>{pkg.sellingPrice.toLocaleString()} MMK</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-wrap gap-3 items-center">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] border border-white/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
              ) : (editingGroup ? 'Save Changes' : 'Create Product Group')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white font-medium rounded-lg text-xs sm:text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

