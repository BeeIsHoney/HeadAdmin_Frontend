'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchProviderCategories,
  fetchProviderPackages,
  type ProviderSkuItem,
  type ProviderGameCategory,
} from '../services/providerCatalog';

export type CatalogDropdownKey = 'productType' | 'source' | 'category' | 'package' | 'status' | 'stockMode' | null;

interface ProviderCategoryMapperProps {
  provider: string;
  onSelectSku: (sku: ProviderSkuItem, gameCategory?: string) => void;
  onClearSku?: () => void;
  onResolveSelectedSku?: (sku: ProviderSkuItem, gameCategory?: string) => void;
  selectedSkuId?: string;
  selectedCategory?: string;
  activeDropdown?: CatalogDropdownKey;
  setActiveDropdown?: (type: CatalogDropdownKey) => void;
}

export const ProviderCategoryMapper: React.FC<ProviderCategoryMapperProps> = ({
  provider,
  onSelectSku,
  onClearSku,
  onResolveSelectedSku,
  selectedSkuId,
  selectedCategory,
  activeDropdown,
  setActiveDropdown,
}) => {
  const [categories, setCategories] = useState<ProviderGameCategory[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const isLioProvider = provider === 'LG' || provider === 'LG:GCV';

  // No auto-selected category; defaults to empty for purely manual selection
  const [selectedGame, setSelectedGame] = useState<string>(selectedCategory ?? '');
  const [categorySearch, setCategorySearch] = useState<string>(selectedCategory ?? '');
  const [packageSearchQuery, setPackageSearchQuery] = useState<string | null>(null);

  // Fallback internal states if activeDropdown is not provided
  const [internalCategoryOpen, setInternalCategoryOpen] = useState(false);
  const [internalPackageOpen, setInternalPackageOpen] = useState(false);
  const onResolveSelectedSkuRef = useRef(onResolveSelectedSku);

  useEffect(() => {
    onResolveSelectedSkuRef.current = onResolveSelectedSku;
  }, [onResolveSelectedSku]);

  useEffect(() => {
    let active = true;

    fetchProviderCategories(provider)
      .then(async (items) => {
        if (!active) return;
        setCatalogError('');
        setCategories(items);

        const selected = items.find(
          (item) => item.id === selectedCategory,
        );
        if (!selected) return;

        setSelectedGame(selected.id);
        setCategorySearch(selected.gameName);

        let skus: ProviderSkuItem[];
        try {
          skus = await fetchProviderPackages(provider, selected.id);
        } catch (reason) {
          if (active) setCatalogError(reason instanceof Error ? reason.message : 'Unable to load packages.');
          return;
        }
        if (!active) return;
        setCategories((current) =>
          current.map((item) => (item.id === selected.id ? { ...item, skus } : item)),
        );

        const resolvedSelectedSku = selectedSkuId
          ? skus.find((sku) => sku.id === selectedSkuId)
          : undefined;
        if (resolvedSelectedSku) {
          onResolveSelectedSkuRef.current?.(resolvedSelectedSku, selected.id);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setCategories([]);
          setCatalogError(reason instanceof Error ? reason.message : 'Unable to load categories.');
        }
      });

    return () => {
      active = false;
    };
  }, [provider, selectedCategory, selectedSkuId, isLioProvider]);

  const isCategoryDropdownOpen =
    activeDropdown !== undefined
      ? activeDropdown === 'category'
      : internalCategoryOpen;

  const isPackageDropdownOpen =
    activeDropdown !== undefined
      ? activeDropdown === 'package'
      : internalPackageOpen;

  const setCategoryOpen = (open: boolean) => {
    if (setActiveDropdown) {
      setActiveDropdown(open ? 'category' : null);
    } else {
      setInternalCategoryOpen(open);
      if (open) setInternalPackageOpen(false);
    }
  };

  const setPackageOpen = (open: boolean) => {
    if (setActiveDropdown) {
      setActiveDropdown(open ? 'package' : null);
    } else {
      setInternalPackageOpen(open);
      if (open) setInternalCategoryOpen(false);
    }
  };

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const packageDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click if standalone
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        if (activeDropdown === 'category') {
          setActiveDropdown?.(null);
        } else if (activeDropdown === undefined) {
          setInternalCategoryOpen(false);
        }
      }
      if (
        packageDropdownRef.current &&
        !packageDropdownRef.current.contains(e.target as Node)
      ) {
        if (activeDropdown === 'package') {
          setActiveDropdown?.(null);
        } else if (activeDropdown === undefined) {
          setInternalPackageOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown, setActiveDropdown]);

  const currentCategory = useMemo<ProviderGameCategory | undefined>(() => {
    if (!selectedGame) return undefined;
    return categories.find((c) => c.id === selectedGame);
  }, [categories, selectedGame]);

  const selectedSku = useMemo(() => {
    if (!selectedSkuId || !currentCategory?.skus) return undefined;
    return currentCategory.skus.find((s) => s.id === selectedSkuId);
  }, [selectedSkuId, currentCategory]);

  const displayedPackageValue = packageSearchQuery ?? selectedSku?.name ?? '';

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter((c) =>
      c.gameName.toLowerCase().includes(categorySearch.toLowerCase().trim())
    );
  }, [categories, categorySearch]);

  const filteredSkus = useMemo(() => {
    if (!currentCategory?.skus) return [];
    if (!displayedPackageValue.trim()) return currentCategory.skus;
    const query = displayedPackageValue.toLowerCase().trim();
    return currentCategory.skus.filter(
      (sku) =>
        sku.name.toLowerCase().includes(query) ||
        sku.id.toLowerCase().includes(query) ||
        sku.priceUsd.toString().includes(query)
    );
  }, [currentCategory, displayedPackageValue]);

  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';
  const inputBaseClasses =
    'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 relative ${
        isCategoryDropdownOpen || isPackageDropdownOpen ? 'z-40' : 'z-10'
      }`}
    >
      {/* 1. Category Search & Select */}
      <div
        className={`relative ${isCategoryDropdownOpen ? 'z-50' : 'z-20'}`}
        ref={categoryDropdownRef}
      >
        <label htmlFor="provider-category-search" className={labelClass}>
          Category<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <input
            id="provider-category-search"
            type="text"
            value={categorySearch}
            onFocus={() => setCategoryOpen(true)}
            onChange={(e) => {
              setCategorySearch(e.target.value);
              setCategoryOpen(true);
              if (selectedGame && e.target.value !== currentCategory?.gameName) {
                setSelectedGame('');
                setPackageSearchQuery('');
                onClearSku?.();
              }
            }}
            placeholder="Select Category"
            autoComplete="off"
            className={`${inputBaseClasses} pr-9`}
          />
          {categorySearch ? (
            <button
              type="button"
              onClick={() => {
                setCategorySearch('');
                setSelectedGame('');
                setPackageSearchQuery('');
                onClearSku?.();
                setCategoryOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
              aria-label="Clear category selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown
              onClick={() => setCategoryOpen(!isCategoryDropdownOpen)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 cursor-pointer transition-transform duration-200 ${
                isCategoryDropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          )}
        </div>

        {/* Category Dropdown Menu */}
        <AnimatePresence>
          {isCategoryDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-60 overflow-y-auto"
            >
              {filteredCategories.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-xs text-white/40">
                  No category matches found
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <button
                    key={`${provider}:${cat.id}`}
                    type="button"
                    onClick={() => {
                      setCatalogError('');
                      setSelectedGame(cat.id);
                      setCategorySearch(cat.gameName);
                      setCategoryOpen(false);
                      setPackageSearchQuery('');
                      onClearSku?.();
                      void fetchProviderPackages(provider, cat.id)
                        .then((skus) => {
                          setCategories((current) =>
                            current.map((item) =>
                              item.id === cat.id ? { ...item, skus } : item,
                            ),
                          );
                        })
                        .catch((reason: unknown) => {
                          setCatalogError(reason instanceof Error ? reason.message : 'Unable to load packages.');
                          setCategories((current) =>
                            current.map((item) =>
                              item.id === cat.id ? { ...item, skus: [] } : item,
                            ),
                          );
                        });
                    }}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                      selectedGame === cat.id
                        ? 'bg-white/5 text-white font-medium'
                        : 'text-white/70'
                    }`}
                  >
                    <span>{cat.gameName}</span>
                    {selectedGame === cat.id && (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Package Search & Select */}
      <div
        className={`relative ${isPackageDropdownOpen ? 'z-50' : 'z-10'}`}
        ref={packageDropdownRef}
      >
        <label htmlFor="provider-package-search" className={labelClass}>
          Package<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <input
            id="provider-package-search"
            type="text"
            disabled={!currentCategory}
            value={displayedPackageValue}
            onFocus={() => {
              if (currentCategory) setPackageOpen(true);
            }}
            onChange={(e) => {
              setPackageSearchQuery(e.target.value);
              if (currentCategory) setPackageOpen(true);
            }}
            placeholder={
              currentCategory ? 'Select Package' : 'Select Category first'
            }
            autoComplete="off"
            className={`${inputBaseClasses} pr-9 ${
              !currentCategory ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          {displayedPackageValue ? (
            <button
              type="button"
              onClick={() => {
                setPackageSearchQuery('');
                onClearSku?.();
                if (currentCategory) setPackageOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
              aria-label="Clear package selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown
              onClick={() => {
                if (currentCategory) setPackageOpen(!isPackageDropdownOpen);
              }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 transition-transform duration-200 ${
                currentCategory ? 'cursor-pointer' : 'pointer-events-none'
              } ${isPackageDropdownOpen ? 'rotate-180 text-white' : ''}`}
            />
          )}
        </div>

        {/* Package Dropdown Menu */}
        <AnimatePresence>
          {isPackageDropdownOpen && currentCategory && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-64 overflow-y-auto divide-y divide-white/5"
            >
              {filteredSkus.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-xs text-white/40">
                  No package matches found
                </div>
              ) : (
                filteredSkus.map((sku) => {
                  return (
                    <button
                      key={sku.id}
                      type="button"
                      onClick={() => {
                        setPackageSearchQuery(sku.name);
                        setPackageOpen(false);
                        onSelectSku(sku, currentCategory.id);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group hover:bg-white/10"
                    >
                      {/* Left: SKU Name & ID */}
                      <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-medium text-white/90 group-hover:text-white truncate w-full">
                          {sku.name}
                        </span>
                        <span className="text-[11px] font-mono text-white/40 group-hover:text-white/60 mt-0.5">
                          {sku.id}
                        </span>
                      </div>

                      {/* Right: Price (White font without USD) */}
                      <div className="shrink-0 text-right">
                        <span className="text-xs sm:text-sm font-medium text-white font-mono">
                          {sku.priceUsd.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {catalogError && (
        <p role="alert" className="col-span-full rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{catalogError}</p>
      )}
    </motion.div>
  );
};
