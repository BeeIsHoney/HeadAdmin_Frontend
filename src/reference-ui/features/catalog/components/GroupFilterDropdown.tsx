import { lockPageScroll } from '../../../shared/utils/pageScrollLock';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type ProductGroupFilterState, type ProductGroupItem } from '../types/group.types';
import type { GameItem } from '../types/game.types';
import { groupBelongsToProduct } from '../utils/productIdentity';

interface GroupFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: ProductGroupFilterState) => void;
  initialFilters?: ProductGroupFilterState;
  groups?: ProductGroupItem[];
  products?: GameItem[];
  title?: string;
}

export const GROUP_STATUS_FILTER_OPTIONS: { label: string; value: ProductGroupFilterState['status'] }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  groups = [],
  products = [],
  title = 'Product Groups Filter',
}) => {
  const [productId, setProductId] = useState<string>(initialFilters?.productId || 'all');
  const [status, setStatus] = useState<ProductGroupFilterState['status']>(
    initialFilters?.status || 'all'
  );

  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const productSelectRef = useRef<HTMLDivElement>(null);
  const statusSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !initialFilters) return;
    setProductId(initialFilters.productId || 'all');
    setStatus(initialFilters.status || 'all');
  }, [isOpen, initialFilters]);

  // Compute products list with their group counts
  const productOptions = useMemo(() => {
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      count: groups.filter((group) => groupBelongsToProduct(group, product, products)).length,
    }));
  }, [groups, products]);

  const filteredProductOptions = useMemo(() => {
    if (!productSearch) return productOptions;
    return productOptions.filter((opt) =>
      opt.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productOptions, productSearch]);

  const totalGroupsCount = groups.length;

  useEffect(() => {
    if (!isOpen) return;

    const unlockScroll = lockPageScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (productSelectRef.current && !productSelectRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (statusSelectRef.current && !statusSelectRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleApply = () => {
    onApply({
      productId,
      status,
    });
    onClose();
  };

  const handleReset = () => {
    setProductId('all');
    setStatus('all');
    setIsProductDropdownOpen(false);
    setIsStatusDropdownOpen(false);
    setProductSearch('');
  };

  const selectedProductLabel = useMemo(() => {
    if (productId === 'all') {
      return `All Products (${totalGroupsCount} ${totalGroupsCount === 1 ? 'Group' : 'Groups'})`;
    }
    const selected = productOptions.find((product) => product.id === productId);
    if (!selected) return 'All Products';
    return `${selected.name} (${selected.count} ${selected.count === 1 ? 'Group' : 'Groups'})`;
  }, [productId, productOptions, totalGroupsCount]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-10 bg-black/75 backdrop-blur-md transition-all select-none">
          <button
            type="button"
            aria-label="Close product groups filter dialog"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: -70, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -70, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[400px] sm:max-w-[430px] bg-[#121212] text-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/15 select-text"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-groups-filter-dialog-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/10 bg-white/[0.02] rounded-t-2xl">
              <h2
                id="product-groups-filter-dialog-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* 1. Product Filter */}
              <div className="space-y-1 relative z-20" ref={productSelectRef}>
                <p className="block text-xs sm:text-sm font-medium text-white/70">
                  Product
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductDropdownOpen(!isProductDropdownOpen);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white flex items-center justify-between shadow-inner hover:border-white/20 focus:border-white/30 transition-colors cursor-pointer"
                  >
                    <span className="truncate">{selectedProductLabel}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 transition-transform shrink-0 ml-2 ${
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
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-60 z-50"
                      >
                        {/* Search in product dropdown */}
                        <div className="p-2 border-b border-white/10 bg-black/20">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
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

                        <div className="overflow-y-auto max-h-48 divide-y divide-white/5">
                          {/* All Products Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setProductId('all');
                              setIsProductDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                              productId === 'all'
                                ? 'bg-white/15 text-white font-bold'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>All Products</span>
                            <span className="text-[11px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {totalGroupsCount} {totalGroupsCount === 1 ? 'Group' : 'Groups'}
                            </span>
                          </button>

                          {/* Individual Products */}
                          {filteredProductOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setProductId(opt.id);
                                setIsProductDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                                productId === opt.id
                                  ? 'bg-white/15 text-white font-bold'
                                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="truncate mr-2">{opt.name}</span>
                              <span className="text-[11px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0">
                                {opt.count} {opt.count === 1 ? 'Group' : 'Groups'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. Status Filter */}
              <div
                className="space-y-1 relative z-10"
                ref={statusSelectRef}
              >
                <p className="block text-xs sm:text-sm font-medium text-white/70">
                  Status
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusDropdownOpen(!isStatusDropdownOpen);
                      setIsProductDropdownOpen(false);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white flex items-center justify-between shadow-inner hover:border-white/20 focus:border-white/30 transition-colors cursor-pointer"
                  >
                    <span>
                      {GROUP_STATUS_FILTER_OPTIONS.find((opt) => opt.value === status)?.label || status}
                    </span>
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
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-48 overflow-y-auto z-50"
                      >
                        {GROUP_STATUS_FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStatus(opt.value);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                              status === opt.value
                                ? 'bg-white/15 text-white font-bold'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-end gap-2.5 rounded-b-2xl">
              <button
                type="button"
                onClick={handleReset}
                className="mr-auto rounded-lg px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="ultimate-3d-btn text-xs sm:text-sm px-5 py-1.5 font-bold cursor-pointer"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onClose}
                className="glass-effect-btn text-xs sm:text-sm px-4 py-1.5 text-white/80 hover:text-white border border-white/10 hover:border-white/20 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
