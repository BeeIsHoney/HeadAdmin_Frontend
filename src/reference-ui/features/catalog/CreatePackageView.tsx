'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, UploadCloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type ProductItem } from './types/product.types';
import type { GameItem } from './types/game.types';
import { adminPanelApi } from '../../shared/services/adminPanelApi';
import { requestJson } from '../../shared/services/apiClient';
import { providerColor } from '../../shared/utils/providerColor';
import { ProviderCategoryMapper, type CatalogDropdownKey } from './components/ProviderCategoryMapper';
import { type ProviderSkuItem } from './services/providerCatalog';
import { PACKAGE_PROVIDER_OPTIONS, isApiPackageProvider } from './utils/providerOptions';
import {
  calculateManualRemainingStock,
  getPackageStockKind,
  isProviderStockSource,
  formatProviderStock,
} from './utils/packageStock';

interface CreatePackageViewProps {
  onCancel: () => void;
  onSave: (product: Omit<ProductItem, 'id'>) => void | Promise<void>;
  editingProduct?: ProductItem | null;
  defaultProductId?: string;
  defaultGameType?: string;
  nextSortOrder?: number;
  giftCardsOnly?: boolean;
}

const DIRECT_OPTIONS = ['Select an option', ...PACKAGE_PROVIDER_OPTIONS];

const getProviderDisplayLabel = (provider: string): string => {
  if (provider === 'G2B') return 'G2';
  if (provider === 'G2B:GCV') return 'G2:GCV';
  if (provider === 'SMILEONE') return 'SmileOne';
  return provider;
};

export const CreatePackageView: React.FC<CreatePackageViewProps> = ({
  onCancel,
  onSave,
  editingProduct,
  defaultProductId = '',
  defaultGameType = '',
  nextSortOrder = 0,
  giftCardsOnly=false,
}) => {
  const [productOptions, setProductOptions] = useState<GameItem[]>([]);
  // Main Service does not expose a LioGames connection-setting endpoint.
  const isProviderConnected=(source:string)=>!['LG','LG:GCV'].includes(source)&&source.trim().length>0;
  // Form States
  const [gameType, setGameType] = useState<string>(
    editingProduct?.gameType || defaultGameType || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    editingProduct?.productId || defaultProductId
  );
  const [productTypeSearch, setProductTypeSearch] = useState<string>(
    editingProduct?.gameType || defaultGameType || ''
  );
  const [directProvider, setDirectProvider] = useState<string>(
    editingProduct?.directProvider === 'Manual Order'
      ? 'Manual'
      : editingProduct?.directProvider || 'Select an option'
  );
  const [coinCost, setCoinCost] = useState<string>(() => {
    const existingCost = Number(editingProduct?.coinCost);
    return Number.isFinite(existingCost) && existingCost > 0 ? String(existingCost) : '';
  });
  const coinType = editingProduct?.coinType || 'Coins';
  const [name, setName] = useState<string>(editingProduct?.name || '');
  const [sellingPrice, setSellingPrice] = useState<string>(
    editingProduct?.sellingPrice !== undefined ? editingProduct.sellingPrice.toString() : ''
  );
  const [profit, setProfit] = useState<string>(
    editingProduct?.profit !== undefined ? editingProduct.profit.toString() : ''
  );
  const [url, setUrl] = useState<string>(editingProduct?.url || editingProduct?.icon || '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<'On' | 'Off'>(
    editingProduct ? (editingProduct.isActive ? 'On' : 'Off') : 'On'
  );
  const [sortOrder, setSortOrder] = useState<string>(
    editingProduct?.sortOrder !== undefined
      ? editingProduct.sortOrder.toString()
      : nextSortOrder.toString()
  );
  const [selectedProviderSkuId, setSelectedProviderSkuId] = useState<string>(
    editingProduct?.providerSkuId ?? ''
  );
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<string>(
    editingProduct?.providerCategory ?? ''
  );
  const [stockMode, setStockMode] = useState<'On' | 'Off'>(
    editingProduct?.stockModeEnabled ? 'On' : 'Off'
  );
  const [totalStockLimit, setTotalStockLimit] = useState<string>(
    editingProduct?.totalStockLimit !== undefined
      ? editingProduct.totalStockLimit.toString()
      : ''
  );
  const stockUsage = editingProduct?.stockUsage ?? 0;
  const [providerRemainingStock, setProviderRemainingStock] = useState<string>(() => {
    if (editingProduct?.directProvider === 'LG:GCV') {
      return formatProviderStock('LG:GCV', editingProduct);
    }
    if (editingProduct?.remainingStock !== undefined) {
      return editingProduct.remainingStock.toString();
    }
    return '0';
  });
  const [providerSupportsMultipleQuantity, setProviderSupportsMultipleQuantity] = useState(
    editingProduct?.providerSupportsMultipleQuantity === true,
  );
  const [multipleQuantityEnabled, setMultipleQuantityEnabled] = useState(
    editingProduct?.multipleQuantityEnabled === true,
  );
  const [providerMaxQuantity, setProviderMaxQuantity] = useState(
    Math.max(1, Number(editingProduct?.maxQuantity ?? 1)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError,setFormError]=useState('');
  const saveInFlightRef = useRef(false);

  // UI Dropdown States (Mutual exclusion: only one dropdown open at a time)
  const [activeDropdown, setActiveDropdown] = useState<CatalogDropdownKey>(null);

  const gameDropdownRef = useRef<HTMLDivElement>(null);
  const directDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const stockModeDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const initialProductIdentityRef = useRef({
    productId: editingProduct?.productId || defaultProductId,
    gameType: editingProduct?.gameType || defaultGameType || '',
  });

  // Close dropdowns on outside click
  useEffect(() => {
    let active = true;
    adminPanelApi.products.list().then((items) => {
      if (!active) return;
      setProductOptions(items.filter(item=>!giftCardsOnly||item.id.startsWith('store-')));
      const initialIdentity = initialProductIdentityRef.current;
      const initial=items.find(p=>p.id===initialIdentity.productId&&(!giftCardsOnly||p.id.startsWith('store-')));
      if(initial){setGameType(initial.name);setProductTypeSearch(initial.name);}
      if (!initialIdentity.productId && initialIdentity.gameType) {
        const matches = items.filter(
          (item) => item.name.toLowerCase() === initialIdentity.gameType.toLowerCase(),
        );
        if (matches.length === 1) setSelectedProductId(matches[0].id);
      }
    }).catch(error=>{if(active)setFormError(error instanceof Error?error.message:'Unable to load products.');});
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        gameDropdownRef.current &&
        !gameDropdownRef.current.contains(target) &&
        directDropdownRef.current &&
        !directDropdownRef.current.contains(target) &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(target) &&
        (!stockModeDropdownRef.current || !stockModeDropdownRef.current.contains(target))
      ) {
        setActiveDropdown((prev) => {
          if (prev === 'productType' || prev === 'source' || prev === 'status' || prev === 'stockMode') {
            return null;
          }
          return prev;
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const clearPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const filteredProductTypes = useMemo(() => {
    const query = productTypeSearch.toLowerCase().trim();
    if (!query) return productOptions;
    return productOptions.filter((product) =>
      product.name.toLowerCase().includes(query) || product.id.toLowerCase().includes(query)
    );
  }, [productOptions, productTypeSearch]);

  const isManualPackage = directProvider === 'Manual';

  const applyProviderQuantityCapability = (sku: ProviderSkuItem, resetEnabled: boolean) => {
    const supportsMultiple =
      sku.supportsMultipleQuantity === true && Number(sku.maxQuantity ?? 1) > 1;
    setProviderSupportsMultipleQuantity(supportsMultiple);
    setProviderMaxQuantity(
      supportsMultiple ? Math.max(2, Math.min(Number(sku.maxQuantity ?? 10), 10)) : 1,
    );
    if (!supportsMultiple || resetEnabled) {
      setMultipleQuantityEnabled(false);
    }
  };
  const selectedProduct = productOptions.find((product) => product.id === selectedProductId);
  const isGamePackageTarget = selectedProduct?.provider !== 'GiftCards & Vouchers';
  const stockModeKind = getPackageStockKind(directProvider);
  const providerStockSource = isProviderStockSource(directProvider);
  const stockModeEnabled = stockMode === 'On' && stockModeKind === 'manual';
  const manualRemainingStock = calculateManualRemainingStock(
    Number(totalStockLimit) || 0,
    stockUsage,
  );

  const inputBaseClasses =
    'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';
  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 2 * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      e.target.value = '';
      return;
    }

    clearPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setFileName(file.name);
    setUrl(objectUrl);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving || saveInFlightRef.current) return;

    if (!selectedProductId || !gameType || !directProvider || directProvider === 'Select an option' || !name.trim() || !sellingPrice.trim() || !profit.trim()) {
      setFormError('Choose a product and source, then enter Name, Price and Profit.');
      return;
    }

    if (
      isGamePackageTarget && stockModeEnabled &&
      stockModeKind === 'manual' &&
      (
        !totalStockLimit.trim() ||
        !Number.isInteger(Number(totalStockLimit)) ||
        Number(totalStockLimit) < 0
      )
    ) {
      return;
    }

    if (
      providerStockSource &&
      (!selectedProviderCategory || !selectedProviderSkuId)
    ) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    setFormError('');
    try {
      if (!isManualPackage && selectedProviderCategory) {
        try {
          const compatibility = await adminPanelApi.packages.checkCompatibility({
            productId: selectedProductId,
            gameType,
            directProvider,
            providerCategory: selectedProviderCategory,
            packageId: editingProduct?.id,
          });
          if (compatibility.warning && !window.confirm(`${compatibility.warning}\n\nSave anyway?`)) {
            return;
          }
        } catch {
          // Compatibility is advisory only. A failed preflight must not hard-block an otherwise valid save.
        }
      }

      const productPayload: Omit<ProductItem, 'id'> = {
        productId: selectedProductId,
        name: name.trim(),
        gameType,
        coinCost: (() => {
          const parsed = Number(coinCost);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        })(),
        coinType,
        sellingPrice: parseFloat(sellingPrice) || 0,
        profit: parseFloat(profit) || 0,
        isActive: status === 'On',
        sortOrder: parseInt(sortOrder, 10) || 0,
        directProvider: directProvider !== 'Select an option' ? directProvider : undefined,
        url: url || undefined,
        icon: url || undefined,
        providerCategory: selectedProviderCategory || undefined,
        providerSkuId: selectedProviderSkuId || undefined,
        multipleQuantityEnabled:
          isGamePackageTarget && providerSupportsMultipleQuantity && multipleQuantityEnabled,
        maxQuantity:
          isGamePackageTarget && providerSupportsMultipleQuantity
            ? Math.max(1, Math.min(providerMaxQuantity, 10))
            : 1,
        stockModeEnabled,
        totalStockLimit:
          stockModeEnabled && stockModeKind === 'manual'
            ? Number(totalStockLimit)
            : undefined,
        stockUsage:
          stockModeEnabled && stockModeKind === 'manual' ? stockUsage : undefined,
        remainingStock:
          stockModeEnabled && stockModeKind === 'manual'
            ? manualRemainingStock
            : providerStockSource
              ? directProvider === 'LG:GCV' && !/^\d+$/.test(providerRemainingStock)
                ? undefined
                : Number(providerRemainingStock) || 0
              : undefined,
      };

      await onSave(productPayload);
    } catch (error) {
      setFormError(error instanceof Error?error.message:'Unable to save package.');
    } finally {
      saveInFlightRef.current = false;
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
      {/* Form Container (No outer card, matching CreateProductView) */}
      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <form
          className="space-y-3 sm:space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          {/* Row 1: Product Type & Source */}
          <div
            className={`grid grid-cols-1 gap-2.5 sm:gap-3 relative ${
              activeDropdown === 'productType' || activeDropdown === 'source' ? 'z-40' : 'z-20'
            }`}
          >
            {/* Product Type */}
            <div
              className={`relative ${activeDropdown === 'productType' ? 'z-50' : 'z-30'}`}
              ref={gameDropdownRef}
            >
              <label htmlFor="package-product-type-search" className={labelClass}>
                Product Type<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  id="package-product-type-search"
                  type="text"
                  required
                  value={productTypeSearch}
                  onFocus={() => setActiveDropdown('productType')}
                  onChange={(e) => {
                    setProductTypeSearch(e.target.value);
                    setActiveDropdown('productType');
                    if (gameType && e.target.value !== gameType) {
                      setGameType('');
                      setSelectedProductId('');
                    }
                  }}
                  placeholder="Select Product"
                  autoComplete="off"
                  className={`${inputBaseClasses} pr-9`}
                />
                {productTypeSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProductTypeSearch('');
                      setGameType('');
                      setSelectedProductId('');
                      setActiveDropdown('productType');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                    aria-label="Clear product selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <ChevronDown
                    onClick={() =>
                      setActiveDropdown(activeDropdown === 'productType' ? null : 'productType')
                    }
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
                    {/* List of Products */}
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
                              if(selectedProductId!==product.id){setDirectProvider('Select an option');setSelectedProviderSkuId('');setSelectedProviderCategory('');setCoinCost('');setStockMode('Off');}
                              setSelectedProductId(product.id);
                              setGameType(product.name);
                              setProductTypeSearch(product.name);
                              setActiveDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                              selectedProductId === product.id
                                ? 'bg-white/5 text-white font-medium'
                                : 'text-white/70'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">{product.name}</span>
                              <span className="block text-[10px] font-mono text-white/35">{product.id}</span>
                            </span>
                            {selectedProductId === product.id && (
                              <Check className="w-4 h-4 text-white shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Source */}
            <div
              className={`relative ${activeDropdown === 'source' ? 'z-50' : 'z-20'}`}
              ref={directDropdownRef}
            >
              <label htmlFor="package-direct-provider-btn" className={labelClass}>
                Source<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  className="opacity-0 absolute inset-0 pointer-events-none w-full h-full"
                  value={directProvider !== 'Select an option' ? directProvider : ''}
                  onChange={() => {}}
                  required
                />
                <button
                  id="package-direct-provider-btn"
                  type="button"
                  onClick={() =>
                    setActiveDropdown(activeDropdown === 'source' ? null : 'source')
                  }
                  className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
                >
                  <span
                    className={
                      directProvider !== 'Select an option'
                        ? 'text-white font-medium inline-flex items-center gap-2'
                        : 'text-white/40'
                    }
                  >
                    <span>{getProviderDisplayLabel(directProvider)}</span>
                    {directProvider !== 'Select an option' && directProvider !== 'Manual' && (
                      <span
                        className="ping inline-block shrink-0"
                        style={
                          {
                            '--uib-size': '14px',
                            '--uib-speed': '1s',
                            '--uib-color': providerColor(directProvider),
                          } as React.CSSProperties
                        }
                      />
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
                      activeDropdown === 'source' ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {activeDropdown === 'source' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-60 overflow-y-auto"
                  >
                    {DIRECT_OPTIONS.filter(opt=>opt==='Manual'||opt==='Select an option'||(selectedProductId.startsWith('store-')?opt.includes(':GCV'):!opt.includes(':GCV'))).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={!isProviderConnected(opt)}
                        onClick={() => {
                          if (!isProviderConnected(opt)) return;
                          setDirectProvider(opt);
                          setSelectedProviderSkuId('');
                          setSelectedProviderCategory('');
                          // Never carry an API Cost across when switching to Manual Source.
                          // Manual Source Cost is an independent optional admin-entered value.
                          setCoinCost(opt === 'Manual' ? '' : '0');
                          setProviderSupportsMultipleQuantity(false);
                          setMultipleQuantityEnabled(false);
                          setProviderMaxQuantity(1);
                          setStockMode('Off');
                          setTotalStockLimit('');
                          setProviderRemainingStock('');
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between transition-colors ${
                          !isProviderConnected(opt)
                            ? 'text-white/40 cursor-not-allowed bg-white/[0.02]'
                            : directProvider === opt
                              ? 'bg-white/5 text-white font-medium cursor-pointer hover:bg-white/10'
                              : 'text-white/70 cursor-pointer hover:bg-white/10'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>{getProviderDisplayLabel(opt)}</span>
                          {opt !== 'Select an option' && opt !== 'Manual' && (
                            <span
                              className="ping inline-block shrink-0"
                              style={
                                {
                                  '--uib-size': '14px',
                                  '--uib-speed': '1s',
                                  '--uib-color': providerColor(opt),
                                } as React.CSSProperties
                              }
                            />
                          )}
                        </span>
                        {directProvider === opt && (
                          <Check className="w-4 h-4 text-white shrink-0" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Connected Provider Category & SKUs Mapping */}
          {isApiPackageProvider(directProvider) && (
            <ProviderCategoryMapper
              key={directProvider}
              provider={directProvider}
              selectedSkuId={selectedProviderSkuId}
              selectedCategory={selectedProviderCategory}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              onSelectSku={(sku: ProviderSkuItem, providerCategory?: string) => {
                setSelectedProviderSkuId(sku.id);
                setSelectedProviderCategory(providerCategory ?? '');
                setProviderRemainingStock(
                  formatProviderStock(directProvider, sku),
                );
                applyProviderQuantityCapability(sku, selectedProviderSkuId !== sku.id);
                // Provider Package Price displayed in Cost ( API )
                setCoinCost(sku.priceUsd.toString());
              }}
              onResolveSelectedSku={(sku) => {
                setProviderRemainingStock(formatProviderStock(directProvider, sku));
                applyProviderQuantityCapability(sku, false);
              }}
              onClearSku={() => {
                setSelectedProviderSkuId('');
                setSelectedProviderCategory('');
                setProviderRemainingStock('');
                setProviderSupportsMultipleQuantity(false);
                setMultipleQuantityEnabled(false);
                setProviderMaxQuantity(1);
                setCoinCost('0');
              }}
            />
          )}


          {isGamePackageTarget && !isManualPackage && providerSupportsMultipleQuantity && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <label htmlFor="package-multiple-quantity-switch" className="text-xs font-medium text-white/80 cursor-pointer">
                  Multiple Quantity
                </label>
                <label htmlFor="package-multiple-quantity-switch" className="relative inline-flex items-center cursor-pointer shrink-0">
                  <span className="sr-only">Toggle Multiple Quantity</span>
                  <input
                    id="package-multiple-quantity-switch"
                    type="checkbox"
                    className="sr-only peer"
                    checked={multipleQuantityEnabled}
                    onChange={(event) => setMultipleQuantityEnabled(event.target.checked)}
                  />
                  <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/60 peer-checked:after:bg-[#121212] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="package-coin-cost" className={labelClass}>
              {isManualPackage ? 'Source Cost (Optional)' : 'Cost ( API )'}
            </label>
            <input
              id="package-coin-cost"
              type="number"
              min="0"
              step={isManualPackage ? 'any' : '0.01'}
              readOnly={!isManualPackage}
              value={coinCost}
              onChange={isManualPackage ? (event) => setCoinCost(event.target.value) : undefined}
              placeholder="0.00"
              className={isManualPackage
                ? inputBaseClasses
                : `${inputBaseClasses} bg-white/[0.03] text-white/70 border-white/10 cursor-not-allowed select-none`}
            />
          </div>

          {/* Name* */}
          <div>
            <label htmlFor="package-name" className={labelClass}>
              Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="package-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 86 Diamonds (78 + 8 Bonus)"
              className={inputBaseClasses}
            />
          </div>

          {/* Price* & Profit* Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {/* Price* */}
            <div>
              <label htmlFor="package-price" className={labelClass}>
                Price · USD<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="package-price"
                type="number" step="0.0001" min="0.0001" inputMode="decimal"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g. 1.50"
                className={inputBaseClasses}
              />
            </div>

            {/* Profit* */}
            <div>
              <label htmlFor="package-profit" className={labelClass}>
                Profit · USD<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="package-profit"
                type="number" step="0.0001" min="0" inputMode="decimal"
                required
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                placeholder="e.g. 0.15"
                className={inputBaseClasses}
              />
            </div>
          </div>

          {/* Package Icon / Image (Matching CreateProductView) */}
          <div className="space-y-3">
            <label htmlFor="package-logo" className={labelClass}>
              Package Icon / Image
            </label>

            <input
              type="file"
              id="package-logo"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <label
              htmlFor="package-logo" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)handleFileChange({target:{files:[file],value:''}} as unknown as React.ChangeEvent<HTMLInputElement>);}}
              className="w-full min-h-20 bg-black/40 border border-white/10 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-xs sm:text-sm text-white/50 hover:text-white/90 hover:bg-white/[0.04] hover:border-white/30 transition-all cursor-pointer group"
            >
              {url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={url}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded-lg border border-white/20 shadow-md"
                  />
                  <div className="text-left">
                    <p className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                      {fileName || 'Current image'}
                    </p>
                    <p className="text-[11px] text-white/40">Click to replace file</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 group-hover:bg-white/10 group-hover:text-white transition-colors text-white/60">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white/80">
                    Drag &amp; Drop your file or <span className="text-white underline underline-offset-2 decoration-white/40 group-hover:decoration-white transition-colors">Browse</span>
                  </span>
                  <span className="text-[11px] text-white/40 mt-1">Supports JPG, PNG, WEBP (Max 2MB)</span>
                </>
              )}
            </label>

          </div>

          {/* Status* & Sort Order Grid (Matching CreateProductView) */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {/* Status Dropdown */}
            <div
              className={`relative ${activeDropdown === 'status' ? 'z-50' : 'z-10'}`}
              ref={statusDropdownRef}
            >
              <label htmlFor="package-status-btn" className={labelClass}>
                Status<span className="text-red-500 ml-0.5">*</span>
              </label>
              <button
                id="package-status-btn"
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                }
                className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'On' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="text-white font-medium">{status}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/40 transition-transform ${
                    activeDropdown === 'status' ? 'rotate-180' : ''
                  }`}
                />
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

            {/* Sort Order */}
            <div>
              <label htmlFor="package-sort-order" className={labelClass}>
                Sort Order
              </label>
              <input
                id="package-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className={inputBaseClasses}
              />
            </div>
          </div>

          {/* Manually controlled stock is available only for the Manual source. */}
          {stockModeKind && (
            <div className="space-y-3">
              <div
                className={`relative ${activeDropdown === 'stockMode' ? 'z-50' : 'z-10'}`}
                ref={stockModeDropdownRef}
              >
                <label htmlFor="package-stock-mode-btn" className={labelClass}>
                  Stock Mode
                </label>
                <button
                  id="package-stock-mode-btn"
                  type="button"
                  onClick={() =>
                    setActiveDropdown(activeDropdown === 'stockMode' ? null : 'stockMode')
                  }
                  className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stockMode === 'On' ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-white font-medium">{stockMode}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform ${
                      activeDropdown === 'stockMode' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'stockMode' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                      {(['On', 'Off'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setStockMode(option);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                            stockMode === option
                              ? 'bg-white/5 text-white'
                              : 'text-white/70'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                option === 'On' ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            />
                            {option}
                          </span>
                          {stockMode === option && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {stockModeEnabled && stockModeKind === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div>
                    <label htmlFor="package-total-stock-limit" className={labelClass}>
                      Total Stock Limit<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      id="package-total-stock-limit"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={isGamePackageTarget?totalStockLimit:'0'}
                      readOnly={!isGamePackageTarget}
                      onChange={(event) => setTotalStockLimit(event.target.value)}
                      placeholder="0"
                      className={inputBaseClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="package-stock-usage" className={labelClass}>
                      Stock Usage
                    </label>
                    <input
                      id="package-stock-usage"
                      type="number"
                      readOnly
                      value={stockUsage}
                      className={`${inputBaseClasses} bg-white/[0.03] text-white/70 cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label htmlFor="package-remaining-stock" className={labelClass}>
                      Remaining
                    </label>
                    <input
                      id="package-remaining-stock"
                      type="number"
                      readOnly
                      value={manualRemainingStock}
                      className={`${inputBaseClasses} bg-white/[0.03] text-white/70 cursor-not-allowed`}
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* GCV stock is always provider-owned and has no manual Stock Mode toggle. */}
          {providerStockSource && (
            <div>
              <label htmlFor="package-provider-remaining-stock" className={labelClass}>
                {directProvider === 'LG:GCV' ? 'Availability / Stock' : 'Remaining Stock'}
              </label>
              <input
                id="package-provider-remaining-stock"
                type="text"
                readOnly
                value={selectedProviderSkuId ? providerRemainingStock : ''}
                placeholder="Select Category & Package"
                className={`${inputBaseClasses} bg-white/[0.03] text-white/70 cursor-not-allowed`}
              />
            </div>
          )}

          {/* Action Buttons (Matching CreateProductView) */}
          {!isGamePackageTarget&&isManualPackage&&stockMode==='On'&&<p className="text-xs text-white/45">Inventory comes from codes. Add codes from the package list after saving.</p>}
          {formError&&<p role="alert" className="text-xs text-red-300">{formError}</p>}
          <div className="pt-4 flex flex-wrap gap-3 items-center">
            {/* Create / Save Primary Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] border border-white/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
              ) : (editingProduct ? 'Save Changes' : 'Create Package')}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white font-medium rounded-lg text-xs sm:text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
