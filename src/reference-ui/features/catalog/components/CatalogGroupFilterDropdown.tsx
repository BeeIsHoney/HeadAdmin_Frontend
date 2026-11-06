import { lockPageScroll } from '../../../shared/utils/pageScrollLock';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ProductCatalogGroupFilterState } from '../types/catalog-group.types';

interface CatalogGroupFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: ProductCatalogGroupFilterState) => void;
  initialFilters: ProductCatalogGroupFilterState;
}

const STATUS_OPTIONS: Array<{
  label: string;
  value: ProductCatalogGroupFilterState['status'];
}> = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const CatalogGroupFilterDropdown = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
}: CatalogGroupFilterDropdownProps) => {
  const [status, setStatus] = useState<ProductCatalogGroupFilterState['status']>(
    initialFilters.status,
  );

  useEffect(() => {
    if (isOpen) setStatus(initialFilters.status);
  }, [initialFilters.status, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const unlockScroll = lockPageScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-3 pt-6 backdrop-blur-md sm:p-4 sm:pt-10">
          <button
            type="button"
            aria-label="Close product catalog group filter dialog"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -70, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -70, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[400px] rounded-xl border border-white/15 bg-[#121212] text-white shadow-[0_20px_60px_rgba(0,0,0,0.85)] sm:max-w-[430px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-group-filter-title"
          >
            <div className="flex items-center justify-between rounded-t-xl border-b border-white/10 bg-white/[0.02] px-4 py-3 sm:px-5 sm:py-3.5">
              <h2 id="catalog-group-filter-title" className="text-base font-bold tracking-tight sm:text-lg">
                Product Catalog Group Filter
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="cursor-pointer rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <p className="text-xs font-medium text-white/70 sm:text-sm">Status</p>
              <div className="grid grid-cols-1 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2 text-left text-xs transition-colors sm:text-sm ${
                      status === option.value
                        ? 'border-white/30 bg-white/15 font-bold text-white'
                        : 'border-white/10 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{option.label}</span>
                    {status === option.value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setStatus('all')}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply({ status });
                  onClose();
                }}
                className="cursor-pointer rounded-lg border border-white/40 bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Apply Filter
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
