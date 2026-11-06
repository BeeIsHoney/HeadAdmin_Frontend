import {usePanel} from '@/components/context';
import { AdminPageSkeleton } from '../../shared/components/Skeletons';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Edit, Trash2, Box, X, Filter, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreateProductView } from './CreateProductView';
import { GameFilterDropdown } from './components/GameFilterDropdown';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';

import { type GameItem, type GameFilterState } from './types/game.types';
import type { ProductCatalogGroupItem } from './types/catalog-group.types';
import { adminPanelApi } from '../../shared/services/adminPanelApi';

export const ProductsView: React.FC = () => {
  const {refresh} = usePanel();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GameItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<GameFilterState>({
    provider: 'all',
    status: 'all',
  });
  const [games, setGames] = useState<GameItem[]>([]);
  const [catalogGroups, setCatalogGroups] = useState<ProductCatalogGroupItem[]>([]);
  const [gameToDelete, setGameToDelete] = useState<GameItem | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const itemsPerPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminPanelApi.products.list(), adminPanelApi.catalogGroups.list()])
      .then(([productItems, groupItems]) => {
        if (!active) return;
        setGames(productItems);
        setCatalogGroups(groupItems);
      })
      .catch((e:unknown) => {if(active)setLoadError(e instanceof Error?e.message:'Unable to load records.');})
      .finally(() => { if (active) setIsLoading(false); });
    const handleClickOutside = (event: MouseEvent) => {
      if (itemsPerPageRef.current && !itemsPerPageRef.current.contains(event.target as Node)) {
        setIsItemsPerPageOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [reload, refresh]);

  // Filter Data
  const filteredData = useMemo(() => {
    return games.filter((game) => {
      const lowerQuery = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        game.name.toLowerCase().includes(lowerQuery) ||
        game.id.includes(lowerQuery);

      const matchesProvider =
        filters.provider === 'all' ||
        game.provider === filters.provider;

      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && game.isActive) ||
        (filters.status === 'inactive' && !game.isActive);

      return matchesSearch && matchesProvider && matchesStatus;
    }).sort((a, b) => a.sort - b.sort);
  }, [games, searchTerm, filters]);

  const nextSharedSortOrder = useMemo(() => {
    const highestProductSort = games.reduce((highest, game) => Math.max(highest, Number(game.sort) || 0), 0);
    const highestCatalogGroupSort = catalogGroups.reduce(
      (highest, group) => Math.max(highest, Number(group.sortOrder) || 0),
      0,
    );
    return Math.max(highestProductSort, highestCatalogGroupSort) + 1;
  }, [catalogGroups, games]);

  // Calculation Logic
  const totalItems = filteredData.length; 
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, safeCurrentPage, itemsPerPage]);

  const handleDeleteGame = async () => {
    if (gameToDelete) {
      await adminPanelApi.products.remove(gameToDelete.id);
      setGames(await adminPanelApi.products.list());
      setGameToDelete(null);
    }
  };

  const confirmDelete = (game: GameItem) => {
    setGameToDelete(game);
  };

  if (isCreating) {
    return <CreateProductView
      onCancel={() => { setIsCreating(false); setEditingProduct(null); }}
      onSaved={async () => {
        setGames(await adminPanelApi.products.list());
        setIsCreating(false); setEditingProduct(null);
      }}
      editingProduct={editingProduct}
      defaultSortOrder={nextSharedSortOrder}
    />;
  }

  if (loadError) return <div role="alert" className="rounded-lg border border-red-400/30 p-4 text-red-200"><p>{loadError}</p><button className="glass-effect-btn mt-3" onClick={()=>{setLoadError('');setIsLoading(true);setReload(n=>n+1);}}>Try again</button></div>;
  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 flex-1 flex flex-col">
      {/* Header Actions & Controls */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full">
        <div className="relative flex-1 sm:flex-initial sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] bg-black/40 border border-white/10 rounded-lg text-white/90 pl-9 pr-9 text-sm transition-all placeholder:text-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl focus:outline-none focus:border-white/30"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
      
    </div>

        <button
          type="button"
          onClick={() => { setEditingProduct(null); setIsCreating(true); }}
          aria-label="New game"
          title="New game"
          className="glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:bg-white/10 cursor-pointer text-white/80 hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowFilter(!showFilter)}
          aria-label="Open product filters"
          aria-expanded={showFilter}
          className={`glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl cursor-pointer transition-all ${
            showFilter
              ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'bg-black/40 hover:bg-white/10'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      
    </div>

      {/* Filter Dropdown */}
      <GameFilterDropdown
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        initialFilters={filters}
        title="Products Filter"
      />

      {/* Main Content Area */}
      <div className="card-container w-full flex-1 flex flex-col overflow-hidden">
        
        {/* Responsive Table View */}
        <div className="w-full overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-[10px] sm:text-[11px] md:text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-white/50 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Name
      
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Source
      
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Sort
      
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Total Sold
      
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium text-center">Status</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-[500px]">
                    <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
                      <Box className="w-12 h-12 opacity-50" />
                      <p className="text-sm font-medium">No games found</p>
      
                  </div>
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedData.map((game) => {
                                        return (
                      <tr key={game.id} className="hover:bg-white/5 transition-colors group">
                        
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium text-white/90">{game.name}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-white/10 text-white/90 border border-white/10">
                            {game.provider || 'Manual'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">{game.sort}</td>
                        
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">{game.totalSold}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center">
                          <div className="flex justify-center">
                            {game.isActive ? (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
                                <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 sm:w-4 sm:h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </div>
                            ) : (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-rose-500/50 flex items-center justify-center text-rose-400 bg-rose-500/10">
                                <X className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right">
                          <div className="flex justify-end gap-2.5 sm:gap-3">
                            <button type="button" 
                              onClick={() => { setEditingProduct(game); setIsCreating(true); }}
                              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button type="button" 
                              onClick={() => confirmDelete(game)}
                              className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
      
                        </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
      
    </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 sm:p-4 border-t border-white/10 bg-black/20 w-full">
          <div className="text-white/40 text-sm min-w-[80px]">
            Total: <span className="text-white/90 font-medium">
              {Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(totalItems)}
            </span>
      
    </div>
          
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Rows per page Dropdown */}
            <div className="relative" ref={itemsPerPageRef}>
              <button type="button" 
                onClick={() => setIsItemsPerPageOpen(!isItemsPerPageOpen)}
                className="glass-effect-btn w-[72px] h-7 px-2.5 flex items-center justify-between text-xs"
              >
                <span>{itemsPerPage}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform shrink-0 ${isItemsPerPageOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isItemsPerPageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 w-full min-w-[72px] bg-[#161616] border border-white/15 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.9)] overflow-hidden z-50"
                  >
                    {[10, 50, 100].map((num) => (
                      <button type="button"
                        key={num}
                        onClick={() => {
                          setItemsPerPage(num);
                          setCurrentPage(1);
                          setIsItemsPerPageOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                          itemsPerPage === num
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
      
    </div>

            {/* Pagination Controls */}
            <div className="glass-effect-btn h-7 flex items-center px-1 gap-1">
              <button type="button" 
                aria-label="Previous page"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className={`p-1 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0 ${safeCurrentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'text-white/80 hover:text-white'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-white/90 text-xs text-center select-none font-medium w-8 shrink-0">
                {safeCurrentPage}
              </span>

              <button type="button" 
                aria-label="Next page"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages || totalPages === 0}
                className={`p-1 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0 ${safeCurrentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : 'text-white/80 hover:text-white'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={handleDeleteGame}
        title="Delete Product?"
        description="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
};
