'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { fetchProviderCategories } from '../services/providerCatalog';

interface ValidationItem {
  name: string;
  code: string;
}

type ValidationProvider = 'G2' | 'SMILEONE' | 'LG';

interface ValidationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode?: string;
  onSelect: (code: string) => void;
}

const validationProviderLabel = (provider: ValidationProvider) =>
  provider === 'LG' ? 'LG' : provider === 'SMILEONE' ? 'SmileOne' : 'G2';

const providerCatalogCode = (provider: ValidationProvider) =>
  provider === 'LG' ? 'LG:VALIDATION' : provider === 'SMILEONE' ? 'SMILEONE' : 'G2B';

const storedValidationCode = (provider: ValidationProvider, code: string) =>
  provider === 'LG' ? `LG:${code}` : provider === 'SMILEONE' ? `SMILEONE:${code}` : `G2:${code}`;

export const ValidationSelectModal: React.FC<ValidationSelectModalProps> = ({
  isOpen,
  onClose,
  selectedCode,
  onSelect,
}) => {
  const [provider, setProvider] = useState<ValidationProvider | null>(null);
  const [search, setSearch] = useState('');
  const [games, setGames] = useState<ValidationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !provider) return;

    let active = true;

    fetchProviderCategories(providerCatalogCode(provider))
      .then((items) => {
        if (!active) return;
        setGames(items
          .filter((item) => Boolean(item.id && item.gameName))
          .map((item) => ({ name: item.gameName, code: item.id })));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setGames([]);
        setError(reason instanceof Error ? reason.message : 'Unable to load API validation categories.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [isOpen, provider]);

  const resetSelector = () => {
    setProvider(null);
    setSearch('');
    setGames([]);
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetSelector();
    onClose();
  };

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return games;
    return games.filter((game) =>
      game.name.toLowerCase().includes(query) || game.code.toLowerCase().includes(query));
  }, [games, search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
            role="dialog"
            aria-modal="true"
            aria-label="API validation selector"
          >
            <div className="p-4 pb-3 border-b border-white/5">
              <div className={`flex items-center justify-between ${provider ? 'mb-3' : 'mb-0'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {provider && (
                    <button
                      type="button"
                      onClick={() => {
                        setProvider(null);
                        setSearch('');
                        setGames([]);
                        setError(null);
                      }}
                      className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">API Validation</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Close validation selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {provider && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search API categories..."
                    className="w-full bg-[#1a1a1f] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {!provider ? (
                <div className="space-y-1">
                  <button type="button" onClick={() => {resetSelector();onSelect('mlbb');}} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 text-left cursor-pointer border border-transparent">
                    <span className="text-xs sm:text-sm">MLBB ID Checker<small className="block mt-1 text-[10px] text-white/40">Existing dedicated checker</small></span>
                    {selectedCode?.toLowerCase()==='mlbb'&&<Check className="w-3.5 h-3.5"/>}
                  </button>
                  {(['G2', 'SMILEONE', 'LG'] as ValidationProvider[]).map((item) => {
                    const selectedProvider = selectedCode?.toUpperCase().startsWith('LG:') ? 'LG'
                      : selectedCode?.toUpperCase().startsWith('SMILEONE:') ? 'SMILEONE'
                        : selectedCode ? 'G2' : null;
                    const isSelected = selectedCode?.toLowerCase() !== 'mlbb' && selectedProvider === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setGames([]);
                          setError(null);
                          setIsLoading(true);
                          setProvider(item);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer text-left group ${
                          isSelected ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`font-medium text-xs sm:text-sm flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-white/90'}`}>
                            <span>{validationProviderLabel(item)}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider bg-white/10 group-hover:bg-white/20 border border-white/10 text-white shrink-0">
                          SELECT
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : isLoading ? (
                <div className="text-center py-6 text-white/40 text-xs">Loading API categories...</div>
              ) : error ? (
                <div className="text-center py-6 px-3 text-red-300/80 text-xs">{error}</div>
              ) : filteredGames.length > 0 ? (
                <div className="space-y-1">
                  {filteredGames.map((game) => {
                    const storedCode = storedValidationCode(provider, game.code);
                    const isSelected = selectedCode?.toLowerCase() === storedCode.toLowerCase() || (provider === 'G2' && selectedCode?.toLowerCase() !== 'mlbb' && selectedCode?.toLowerCase() === game.code.toLowerCase());
                    return (
                      <button
                        key={game.code}
                        type="button"
                        onClick={() => {
                          resetSelector();
                          onSelect(storedCode);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer text-left group ${
                          isSelected ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`font-medium text-xs sm:text-sm flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-white/90'}`}>
                            <span className="truncate">{game.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>
                          <div className="text-white/40 text-[10px] font-mono mt-0.5 break-all">{storedCode}</div>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-white text-black font-extrabold'
                              : 'bg-white/10 group-hover:bg-white/20 border border-white/10 text-white opacity-0 group-hover:opacity-100 sm:opacity-100'
                          }`}
                        >
                          {isSelected ? 'SELECTED' : 'SELECT'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-white/40 text-xs">No results found</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
