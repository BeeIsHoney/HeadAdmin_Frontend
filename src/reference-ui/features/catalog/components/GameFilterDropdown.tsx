import { lockPageScroll } from '../../../shared/utils/pageScrollLock';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type GameFilterState, type ProductProviderType } from '../types/game.types';

interface GameFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: GameFilterState) => void;
  initialFilters?: GameFilterState;
  title?: string;
}

export const PROVIDER_FILTER_OPTIONS: { label: string; value: 'all' | ProductProviderType }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Manual', value: 'Manual' },
  { label: 'Direct Top-ups', value: 'Direct Top-ups' },
  { label: 'GiftCards & Vouchers', value: 'GiftCards & Vouchers' },
];

export const STATUS_FILTER_OPTIONS: { label: string; value: GameFilterState['status'] }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const GameFilterDropdown: React.FC<GameFilterDropdownProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  title = 'Products Filter',
}) => {
  const [provider, setProvider] = useState<'all' | ProductProviderType>(
    initialFilters?.provider || 'all'
  );
  const [status, setStatus] = useState<GameFilterState['status']>(
    initialFilters?.status || 'all'
  );

  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const providerSelectRef = useRef<HTMLDivElement>(null);
  const statusSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !initialFilters) return;
    setProvider(initialFilters.provider || 'all');
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
      if (providerSelectRef.current && !providerSelectRef.current.contains(e.target as Node)) {
        setIsProviderDropdownOpen(false);
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
      provider,
      status,
    });
    onClose();
  };

  const handleReset = () => {
    setProvider('all');
    setStatus('all');
    setIsProviderDropdownOpen(false);
    setIsStatusDropdownOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-10 bg-black/75 backdrop-blur-md transition-all select-none">
          <button
            type="button"
            aria-label="Close products filter dialog"
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
            aria-labelledby="products-filter-dialog-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/10 bg-white/[0.02] rounded-t-2xl">
              <h2
                id="products-filter-dialog-title"
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
              {/* Source Filter */}
              <div
                className={`space-y-1 relative ${isProviderDropdownOpen ? 'z-50' : 'z-20'}`}
                ref={providerSelectRef}
              >
                <p className="block text-xs sm:text-sm font-medium text-white/70">
                  Source
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProviderDropdownOpen(!isProviderDropdownOpen);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white flex items-center justify-between shadow-inner hover:border-white/20 focus:border-white/30 transition-colors cursor-pointer"
                  >
                    <span>
                      {PROVIDER_FILTER_OPTIONS.find((opt) => opt.value === provider)?.label || provider}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 transition-transform ${
                        isProviderDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isProviderDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-48 overflow-y-auto z-50"
                      >
                        {PROVIDER_FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setProvider(opt.value);
                              setIsProviderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                              provider === opt.value
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
                      setIsProviderDropdownOpen(false);
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
                        className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/15 rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-48 overflow-y-auto z-50"
                      >
                        {STATUS_FILTER_OPTIONS.map((opt) => (
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
