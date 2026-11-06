import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type DiscountItem } from './types/discount.types';
import type { GameItem } from './types/game.types';
import type { ProductItem } from './types/product.types';
import { packageBelongsToProduct } from './utils/productIdentity';
import { isManualSourceProductPackage } from './utils/catalogPricing';
import { formatProfitOptionLabel, PROFIT_OPTIONS } from './components/UpdatePriceModal';

const roundDiscountPrice = (value: number, profitMode: string): number => {
  if (!Number.isFinite(value)) return 0;
  let step = 1;
  if (profitMode.includes('ငါးဆယ်ဂဏန်း')) step = 50;
  else if (profitMode.includes('ရာဂဏန်း')) step = 100;
  else if (profitMode.includes('ဆယ်ဂဏန်း')) step = 10;
  if (step <= 1) return Math.round(value);
  return Math.ceil(value / step) * step;
};

const normalizedFamilyValue = (value?: string): string => (value ?? '').trim().toUpperCase();

const samePricingFamily = (left: ProductItem, right: ProductItem): boolean =>
  normalizedFamilyValue(left.directProvider) === normalizedFamilyValue(right.directProvider)
  && normalizedFamilyValue(left.providerCategory) === normalizedFamilyValue(right.providerCategory);

const exactPositiveMultiplier = (value: number, base: number): number | null => {
  if (!Number.isFinite(value) || !Number.isFinite(base) || value <= 0 || base <= 0) return null;
  const ratio = value / base;
  const rounded = Math.round(ratio);
  if (rounded < 1 || rounded > 100) return null;
  const tolerance = Math.max(1e-7, Math.abs(ratio) * 1e-7);
  return Math.abs(ratio - rounded) <= tolerance ? rounded : null;
};

const findProportionalAnchor = (
  target: ProductItem,
  siblings: ProductItem[],
): { item: ProductItem; multiplier: number } | null => {
  // Source Cost is for Manual/Auto package repricing only. Do not let a
  // manually-entered cost opt Manual packages into API bundle heuristics.
  if (isManualSourceProductPackage(target)) return null;

  const targetCost = Number(target.coinCost);
  if (!Number.isFinite(targetCost) || targetCost <= 0) return null;

  let best: { item: ProductItem; multiplier: number } | null = null;
  let bestCost = -1;

  for (const candidate of siblings) {
    if (candidate.id === target.id || !samePricingFamily(target, candidate)) continue;
    const candidateCost = Number(candidate.coinCost);
    if (!Number.isFinite(candidateCost) || candidateCost <= 0 || candidateCost >= targetCost) continue;

    const multiplier = exactPositiveMultiplier(targetCost, candidateCost);
    if (multiplier == null || multiplier < 2) continue;

    const familyMembers = siblings.filter((item) => {
      if (!samePricingFamily(candidate, item)) return false;
      const itemCost = Number(item.coinCost);
      return exactPositiveMultiplier(itemCost, candidateCost) != null;
    });
    if (familyMembers.length < 3) continue;

    if (candidateCost > bestCost) {
      best = { item: candidate, multiplier };
      bestCost = candidateCost;
    }
  }

  return best;
};

interface CreateDiscountViewProps {
  onCancel: () => void;
  onSave: (discount: DiscountItem) => void | Promise<void>;
  editingDiscount?: DiscountItem | null;
  products: GameItem[];
  packages: ProductItem[];
}

export const CreateDiscountView: React.FC<CreateDiscountViewProps> = ({
  onCancel,
  onSave,
  editingDiscount,
  products,
  packages,
}) => {
  const initialPackage = editingDiscount
    ? packages.find((item) => item.id.replace(/^game-package-/, '') === editingDiscount.id.replace(/^game-package-/, ''))
    : undefined;
  const initialProductId = initialPackage?.productId || '';

  // Form States
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [productTypeSearch, setProductTypeSearch] = useState<string>(
    editingDiscount?.gameName || ''
  );
  
  const [selectedPackage, setSelectedPackage] = useState<string>(
    initialPackage?.name || editingDiscount?.productName || ''
  );
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackage?.id || '');

  const [discountPercent, setDiscountPercent] = useState<string>(
    editingDiscount?.discountPercent !== undefined ? editingDiscount.discountPercent.toString() : '0'
  );

  const [totalStockLimit, setTotalStockLimit] = useState<string>(
    editingDiscount?.limit !== undefined ? editingDiscount.limit.toString() : '1'
  );
  const [stockUsage] = useState<string>(
    editingDiscount?.sold !== undefined ? editingDiscount.sold.toString() : '0'
  );
  const [profitMode, setProfitMode] = useState<string>(PROFIT_OPTIONS[0]);
  const [status, setStatus] = useState<'On' | 'Off'>(
    editingDiscount ? (editingDiscount.isActive ? 'On' : 'Off') : 'On'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Dropdowns Mutual Exclusion
  const [activeDropdown, setActiveDropdown] = useState<'productType' | 'package' | 'profit' | 'status' | null>(null);

  const productTypeDropdownRef = useRef<HTMLDivElement>(null);
  const packageDropdownRef = useRef<HTMLDivElement>(null);
  const profitDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        productTypeDropdownRef.current &&
        !productTypeDropdownRef.current.contains(target) &&
        packageDropdownRef.current &&
        !packageDropdownRef.current.contains(target) &&
        profitDropdownRef.current &&
        !profitDropdownRef.current.contains(target) &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProductTypes = useMemo(() => {
    const query = productTypeSearch.toLowerCase().trim();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, productTypeSearch]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  const availablePackages = useMemo(() => {
    if (!selectedProduct) return [];
    return packages.filter(
      (packageItem) => packageItem.id.startsWith('game-package-')
        && packageBelongsToProduct(packageItem, selectedProduct, products),
    );
  }, [packages, products, selectedProduct]);

  const selectedPackageItem = useMemo(
    () => availablePackages.find((item) => item.id === selectedPackageId),
    [availablePackages, selectedPackageId],
  );

  const discountPricePreview = useMemo(() => {
    if (!selectedPackageItem) return 0;
    const dPercent = Number(discountPercent);
    const sellingPrice = selectedPackageItem?.sellingPrice;
    const packageProfit = selectedPackageItem?.profit;
    if (!Number.isFinite(dPercent) || dPercent <= 0 || dPercent > 100
      || sellingPrice == null || !Number.isFinite(sellingPrice) || sellingPrice <= 0
      || packageProfit == null || !Number.isFinite(packageProfit) || packageProfit <= 0) {
      return null;
    }
    const rawPrice = Math.max(0, sellingPrice - (packageProfit * dPercent / 100));
    let roundedPrice = roundDiscountPrice(rawPrice, profitMode);

    // Match backend proportional-bundle protection. For a proven 3+ member
    // exact API-cost family (for example 76 / 152 / 228), a larger bundle
    // cannot become cheaper per unit only because each total was rounded alone.
    const anchor = findProportionalAnchor(selectedPackageItem, availablePackages);
    if (anchor) {
      const anchorSelling = Number(anchor.item.sellingPrice);
      const anchorProfit = Number(anchor.item.profit);
      if (Number.isFinite(anchorSelling) && anchorSelling > 0
        && Number.isFinite(anchorProfit) && anchorProfit > 0) {
        const anchorRawPrice = Math.max(
          0,
          anchorSelling - (anchorProfit * dPercent / 100),
        );
        const anchorDiscountPrice = roundDiscountPrice(anchorRawPrice, profitMode);
        const proportionalFloor = anchorDiscountPrice * anchor.multiplier;
        if (proportionalFloor > roundedPrice && proportionalFloor < sellingPrice) {
          roundedPrice = proportionalFloor;
        }
      }
    }

    return roundedPrice;
  }, [availablePackages, discountPercent, profitMode, selectedPackageItem]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    const dPercent = parseFloat(discountPercent);
    const tLimit = parseInt(totalStockLimit);

    if (!selectedProduct || !selectedPackage || !selectedPackageId || isNaN(tLimit) || isNaN(dPercent)) {
      return;
    }

    const selected = availablePackages.find((item) => item.id === selectedPackageId);
    if (!selected || discountPricePreview == null || discountPricePreview <= 0) {
      return;
    }
    const newDiscount: DiscountItem = {
      id: selectedPackageId.replace(/^game-package-/, ''),
      gameName: selectedProduct.name,
      productName: selectedPackage,
      discountPercent: dPercent,
      discountPrice: String(discountPricePreview),
      profitMode,
      createdAt: editingDiscount?.createdAt || '',
      // New offers are stock-based. Preserve existing dated offers on edit.
      startsAt: editingDiscount?.startsAt || '',
      endsAt: editingDiscount?.endsAt || '',
      limit: tLimit || 1,
      sold: parseInt(stockUsage) || 0,
      remaining: (tLimit || 1) - (parseInt(stockUsage) || 0),
      isActive: status === 'On',
    };
    
    setIsSaving(true);
    try {
      await onSave(newDiscount);
    } finally {
      setIsSaving(false);
    }
  };

  const inputBaseClasses = 'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';
  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full flex-1 flex flex-col text-white pb-4"
    >
      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <form onSubmit={handleSave} className="space-y-3 sm:space-y-4">
          
          {/* Product Type Search Dropdown */}
          <div className={`relative ${activeDropdown === 'productType' ? 'z-50' : 'z-30'}`} ref={productTypeDropdownRef}>
            <label htmlFor="discount-product-type-search" className={labelClass}>
              Product Type<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                id="discount-product-type-search"
                type="text"
                required
                value={productTypeSearch}
                onFocus={() => setActiveDropdown('productType')}
                onChange={(e) => {
                  setProductTypeSearch(e.target.value);
                  setActiveDropdown('productType');
                  if (selectedProduct && e.target.value !== selectedProduct.name) {
                    setSelectedProductId('');
                    setSelectedPackage('');
                    setSelectedPackageId('');
                  }
                }}
                placeholder="Select Product Type"
                autoComplete="off"
                className={`${inputBaseClasses} pr-9`}
              />
              {productTypeSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setProductTypeSearch('');
                    setSelectedProductId('');
                    setSelectedPackage('');
                    setSelectedPackageId('');
                    setActiveDropdown('productType');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <ChevronDown
                  onClick={() => setActiveDropdown(activeDropdown === 'productType' ? null : 'productType')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 cursor-pointer transition-transform duration-200 ${
                    activeDropdown === 'productType' ? 'rotate-180 text-white' : ''
                  }`}
                />
              )}
            </div>

            <AnimatePresence>
              {activeDropdown === 'productType' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-60"
                >
                  <div className="overflow-y-auto max-h-60">
                    {filteredProductTypes.length === 0 ? (
                      <div className="px-3.5 py-4 text-center text-xs text-white/40">
                        No product matches found
                      </div>
                    ) : (
                      filteredProductTypes.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setProductTypeSearch(product.name);
                            setSelectedPackage('');
                            setSelectedPackageId('');
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                            selectedProductId === product.id ? 'bg-white/5 text-white font-medium' : 'text-white/70'
                          }`}
                        >
                          <span>{product.name}</span>
                          {selectedProductId === product.id && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Package Dropdown */}
          <div className={`relative ${activeDropdown === 'package' ? 'z-50' : 'z-20'}`} ref={packageDropdownRef}>
            <div id="discount-package-label" className={labelClass}>
              Package<span className="text-red-500 ml-0.5">*</span>
            </div>
            <div className="relative">
              <input
                tabIndex={-1}
                autoComplete="off"
                className="opacity-0 absolute inset-0 pointer-events-none w-full h-full"
                value={selectedPackage}
                onChange={() => {}}
                required
              />
              <button
                type="button"
                id="discount-package-btn"
                aria-labelledby="discount-package-label discount-package-btn"
                disabled={!selectedProductId}
                onClick={() => setActiveDropdown(activeDropdown === 'package' ? null : 'package')}
                className={`${inputBaseClasses} flex items-center justify-between transition-colors ${!selectedProductId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={selectedPackage ? 'text-white' : 'text-white/30'}>
                  {selectedPackage || 'Select an option'}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${activeDropdown === 'package' ? 'rotate-180 text-white' : ''}`} />
              </button>
            </div>
            
            <AnimatePresence>
              {activeDropdown === 'package' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 w-full mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                >
                  <div className="p-1">
                    {availablePackages.length === 0 ? (
                      <div className="px-3 py-3 text-xs sm:text-sm text-white/40 text-center">
                        No packages found
                      </div>
                    ) : (
                      availablePackages.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackage(prod.name);
                            setSelectedPackageId(prod.id);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs sm:text-sm rounded-md transition-colors flex items-center justify-between ${
                            selectedPackageId === prod.id
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {prod.name}
                          {selectedPackageId === prod.id && <Check className="w-4 h-4" />}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Discount Percent */}
          <div className="space-y-1">
            <label htmlFor="discount-percent" className={labelClass}>
              Discount Percent<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="discount-percent"
              type="number"
              min="1"
              max="100"
              required
              value={discountPercent}
              onChange={(e) => {
                if (e.target.value === '') {
                  setDiscountPercent('');
                  return;
                }
                const val = parseFloat(e.target.value);
                if (val > 100) setDiscountPercent("100");
                else if (val < 1) setDiscountPercent("1");
                else setDiscountPercent(e.target.value);
              }}
              className={inputBaseClasses}
            />
          </div>

          {/* Profit / Rounding Mode */}
          <div className={`relative ${activeDropdown === 'profit' ? 'z-50' : 'z-20'}`} ref={profitDropdownRef}>
            <div id="discount-profit-label" className={labelClass}>
              Profit<span className="text-red-500 ml-0.5">*</span>
            </div>
            <button
              type="button"
              id="discount-profit-btn"
              aria-labelledby="discount-profit-label discount-profit-btn"
              onClick={() => setActiveDropdown(activeDropdown === 'profit' ? null : 'profit')}
              className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
            >
              <span className="text-white">{formatProfitOptionLabel(profitMode)}</span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${activeDropdown === 'profit' ? 'rotate-180 text-white' : ''}`} />
            </button>

            <AnimatePresence>
              {activeDropdown === 'profit' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col"
                >
                  {PROFIT_OPTIONS.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setProfitMode(mode);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                        profitMode === mode ? 'bg-white/5 text-white font-medium' : 'text-white/70'
                      }`}
                    >
                      <span>{formatProfitOptionLabel(mode)}</span>
                      {profitMode === mode && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Discount Price Preview */}
          <div className="space-y-1">
            <label htmlFor="discount-price-preview" className={labelClass}>
              Discount Price
            </label>
            <input
              id="discount-price-preview"
              type="text"
              readOnly
              value={discountPricePreview == null ? '' : Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(discountPricePreview)}
              placeholder="Select a package and discount percent"
              className={`${inputBaseClasses} bg-white/[0.03] text-white/70 border-white/10 cursor-not-allowed select-none`}
            />
          </div>

          <p className="text-xs text-white/50">
            {editingDiscount?.startsAt || editingDiscount?.endsAt
              ? 'This existing discount keeps its saved schedule. Stock limits still apply.'
              : 'The discount stays available until its stock runs out.'}
          </p>

          {/* Total Stock Limit */}
          <div className="space-y-1">
            <label htmlFor="total-stock-limit" className={labelClass}>
              Total Stock Limit<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="total-stock-limit"
              type="number"
              required
              min={Math.max(1, parseInt(stockUsage) || 0)}
              value={totalStockLimit}
              onChange={(e) => setTotalStockLimit(e.target.value)}
              className={inputBaseClasses}
            />
          </div>

          {/* Stock Usage and Remaining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="stock-usage" className={labelClass}>
                Stock Usage
              </label>
              <input
                id="stock-usage"
                type="text"
                readOnly
                value={`${stockUsage} / ${totalStockLimit || 0}`}
                className={`${inputBaseClasses} bg-white/[0.03] text-white/70 border-white/10 cursor-not-allowed select-none`}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="remaining-stock" className={labelClass}>
                Remaining
              </label>
              <input
                id="remaining-stock"
                type="text"
                readOnly
                value={((parseInt(totalStockLimit) || 0) - (parseInt(stockUsage) || 0)).toString()}
                className={`${inputBaseClasses} bg-white/[0.03] text-white/70 border-white/10 cursor-not-allowed select-none`}
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className={`relative ${activeDropdown === 'status' ? 'z-50' : 'z-10'} pt-2`} ref={statusDropdownRef}>
            <div id="discount-status-label" className={labelClass}>
              Status<span className="text-red-500 ml-0.5">*</span>
            </div>
            <button
              type="button"
              id="discount-status-btn"
              aria-labelledby="discount-status-label discount-status-btn"
              onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status === 'On' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-white font-medium">{status}</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${activeDropdown === 'status' ? 'rotate-180 text-white' : ''}`} />
            </button>

            <AnimatePresence>
              {activeDropdown === 'status' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('On');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                      status === 'On' ? 'bg-white/5 text-white' : 'text-white/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      On (Active)
                    </span>
                    {status === 'On' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('Off');
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                      status === 'Off' ? 'bg-white/5 text-white' : 'text-white/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Off (Inactive)
                    </span>
                    {status === 'Off' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap gap-3 items-center">
            {/* Create / Save Primary Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] border border-white/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span>
              ) : (editingDiscount ? 'Save Changes' : 'Create Discount')}
            </button>

            {/* Cancel Button */}
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
