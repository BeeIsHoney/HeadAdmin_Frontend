import { lockPageScroll } from '../../../shared/utils/pageScrollLock';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type DiscountFilterState, type DiscountItem } from '../types/discount.types';
import type { GameItem } from '../types/game.types';
import type { ProductItem } from '../types/product.types';
import { getDiscountProductId } from '../utils/productIdentity';

interface DiscountFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: DiscountFilterState) => void;
  initialFilters?: DiscountFilterState;
  products: GameItem[];
  packages: ProductItem[];
  discounts: DiscountItem[];
  title?: string;
}

export const STATUS_FILTER_OPTIONS: { label: string; value: DiscountFilterState['status'] }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const DiscountFilterDropdown: React.FC<DiscountFilterDropdownProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  products,
  packages,
  discounts,
  title = 'Discount Filter',
}) => {
  const [productId, setProductId] = useState(initialFilters?.productId || 'all');
  const [status, setStatus] = useState<DiscountFilterState['status']>(initialFilters?.status || 'all');

  const [isProductTypeDropdownOpen, setIsProductTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const productTypeSelectRef = useRef<HTMLDivElement>(null);
  const statusSelectRef = useRef<HTMLDivElement>(null);

  const productOptions = useMemo(() => products.map((product) => ({
    ...product,
    count: discounts.filter(
      (discount) => getDiscountProductId(discount, packages) === product.id,
    ).length,
  })), [discounts, packages, products]);

  const selectedProduct = productOptions.find((product) => product.id === productId);

  useEffect(() => {
    if (!isOpen || !initialFilters) return;
    setProductId(initialFilters.productId || 'all');
    setStatus(initialFilters.status || 'all');
  }, [isOpen, initialFilters]);

  // Lock background body scroll when modal is open
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

  // Click outside to close inner selects
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (productTypeSelectRef.current && !productTypeSelectRef.current.contains(e.target as Node)) {
        setIsProductTypeDropdownOpen(false);
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
    setIsProductTypeDropdownOpen(false);
    setIsStatusDropdownOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-10 bg-black/75 backdrop-blur-md transition-all select-none">
          <button
            type="button"
            aria-label="Close discount filter dialog"
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
            aria-labelledby="discount-filter-dialog-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/10 bg-white/[0.02] rounded-t-2xl">
              <h2
                id="discount-filter-dialog-title"
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
            <div className="p-4 sm:p-5 space-y-3 sm:space-y-3.5">
              {/* Product Type Filter */}
              <div
                className={`space-y-1 relative ${isProductTypeDropdownOpen ? 'z-50' : 'z-20'}`}
                ref={productTypeSelectRef}
              >
                <p className="block text-xs sm:text-sm font-medium text-white/70">
                  Product Type
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductTypeDropdownOpen(!isProductTypeDropdownOpen);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white flex items-center justify-between shadow-inner hover:border-white/20 focus:border-white/30 transition-colors cursor-pointer"
                  >
                    <span className={productId !== 'all' ? 'text-white' : 'text-white/40'}>
                      {productId === 'all' ? 'All Products' : selectedProduct?.name ?? 'All Products'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 transition-transform ${
                        isProductTypeDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isProductTypeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.95)] flex flex-col max-h-52 overflow-y-auto z-50 p-1.5 space-y-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setProductId('all');
                            setIsProductTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                            productId === 'all'
                              ? 'bg-white/15 text-white font-semibold shadow-sm'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          All Products
                        </button>
                        {productOptions.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setProductId(product.id);
                              setIsProductTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              productId === product.id
                                ? 'bg-white/15 text-white font-semibold shadow-sm'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{product.name}</span>
                            <span className="text-[11px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0">
                              {product.count} {product.count === 1 ? 'Discount' : 'Discounts'}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Status Filter */}
              <div
                className={`space-y-1 relative ${isStatusDropdownOpen ? 'z-50' : 'z-10'}`}
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
                      setIsProductTypeDropdownOpen(false);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white flex items-center justify-between shadow-inner hover:border-white/20 focus:border-white/30 transition-colors cursor-pointer"
                  >
                    <span>
                      {STATUS_FILTER_OPTIONS.find((opt) => opt.value === status)?.label || status}
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
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.95)] flex flex-col max-h-52 overflow-y-auto z-50 p-1.5 space-y-0.5"
                      >
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStatus(opt.value);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                              status === opt.value
                                ? 'bg-white/15 text-white font-semibold shadow-sm'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
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
