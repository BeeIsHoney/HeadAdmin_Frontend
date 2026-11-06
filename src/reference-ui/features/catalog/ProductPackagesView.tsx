import {usePanel} from '@/components/context';
import Link from 'next/link';
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
import { AdminPageSkeleton } from '../../shared/components/Skeletons';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, X, Edit, Trash2, Box, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductFilterDropdown } from './components/ProductFilterDropdown';
import { type ProductFilterState, type ProductItem } from './types/product.types';
import type { GameItem } from './types/game.types';
import { CreatePackageView } from './CreatePackageView';
import { isManualSourceProductPackage } from './utils/catalogPricing';
import { packageBelongsToProduct } from './utils/productIdentity';
import { adminPanelApi } from '../../shared/services/adminPanelApi';
import { providerColor } from '../../shared/utils/providerColor';

export const ProductPackagesView: React.FC = () => {
  const {refresh} = usePanel();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<ProductFilterState>({
    productId: '',
    gameType: '',
    status: 'all',
    coinType: 'all',
  });
  
  // Product Data State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<GameItem[]>([]);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [showBulkActionMenu, setShowBulkActionMenu] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // View / Edit States
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const itemsPerPageRef = useRef<HTMLDivElement>(null);
  const bulkActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminPanelApi.packages.list(), adminPanelApi.products.list()])
      .then(([packageItems, productItems]) => {
        if (!active) return;
        setProducts(packageItems);
        setCatalogProducts(productItems);
      })
      .catch((e:unknown) => {if(active)setLoadError(e instanceof Error?e.message:'Unable to load records.');})
      .finally(() => { if (active) setIsLoading(false); });
    const handleClickOutside = (event: MouseEvent) => {
      if (itemsPerPageRef.current && !itemsPerPageRef.current.contains(event.target as Node)) {
        setIsItemsPerPageOpen(false);
      }
      if (bulkActionRef.current && !bulkActionRef.current.contains(event.target as Node)) {
        setShowBulkActionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [reload, refresh]);

  useEffect(() => {
    setSelectedPackageIds([]);
    setShowBulkActionMenu(false);
    setBulkError('');
  }, [filters.productId, filters.gameType, filters.status, filters.coinType, searchTerm]);

  useEffect(() => {
    const liveIds = new Set(products.map((item) => item.id));
    setSelectedPackageIds((current) => current.filter((id) => liveIds.has(id)));
  }, [products]);

  // Filter Data
  const filteredData = useMemo(() => {
    const selectedProduct = catalogProducts.find((product) => product.id === filters.productId);


    return products.filter((prod) => {
      const lowerQuery = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        prod.name.toLowerCase().includes(lowerQuery) ||
        prod.sellingPrice.toString().includes(lowerQuery) ||
        prod.profit.toString().includes(lowerQuery);

      const matchesGame = !selectedProduct || packageBelongsToProduct(prod, selectedProduct, catalogProducts);
      
      const matchesStatus =
        filters.status === 'all' || 
        (filters.status === 'active' && prod.isActive) ||
        (filters.status === 'inactive' && !prod.isActive);

      return matchesSearch && matchesGame && matchesStatus;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogProducts, products, searchTerm, filters]);

  // Calculation Logic
  const totalItems = filteredData.length; 
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  useEffect(()=>{setCurrentPage(n=>Math.min(n,totalPages));},[totalPages]);
  const paginatedData = useMemo(() => {
    const start = (Math.min(currentPage, totalPages) - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const selectedPackageIdSet = useMemo(() => new Set(selectedPackageIds), [selectedPackageIds]);
  const allFilteredSelected = filteredData.length > 0
    && filteredData.every((item) => selectedPackageIdSet.has(item.id));

  const togglePackageSelection = (id: string) => {
    setSelectedPackageIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    setBulkError('');
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const visibleIds = new Set(filteredData.map((item) => item.id));
      setSelectedPackageIds((current) => current.filter((id) => !visibleIds.has(id)));
    } else {
      setSelectedPackageIds(filteredData.map((item) => item.id));
    }
    setBulkError('');
  };

  // Actions
  const handleSaveProduct = async (productData: Omit<ProductItem, 'id'>) => {
    if (editingProduct) {
      await adminPanelApi.packages.update(editingProduct.id, productData, editingProduct);
    } else {
      await adminPanelApi.packages.create(productData);
    }
    setProducts(await adminPanelApi.packages.list());
    setIsCreating(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async () => {
    if (productToDelete) {
      await adminPanelApi.packages.remove(productToDelete.id);
      setProducts(await adminPanelApi.packages.list());
      setProductToDelete(null);
    }
  };

  const confirmDelete = (product: ProductItem) => {
    setProductToDelete(product);
  };

  const handleBulkStatus = async (active: boolean) => {
    if (selectedPackageIds.length === 0 || isBulkUpdating) return;
    setIsBulkUpdating(true);
    setShowBulkActionMenu(false);
    setBulkError('');
    try {
      await adminPanelApi.packages.bulkSetStatus(selectedPackageIds, active);
      setProducts(await adminPanelApi.packages.list());
      setSelectedPackageIds([]);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Unable to update selected packages.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPackageIds.length === 0) return;
    await adminPanelApi.packages.bulkRemove(selectedPackageIds);
    setProducts(await adminPanelApi.packages.list());
    setSelectedPackageIds([]);
    setShowBulkDeleteConfirm(false);
    setShowBulkActionMenu(false);
    setBulkError('');
  };

  const getNextSortOrder = () => {
    const selectedProduct = catalogProducts.find((product) => product.id === filters.productId);
    if (!selectedProduct) return 1;
    const gameProducts = products.filter((packageItem) =>
      packageBelongsToProduct(packageItem, selectedProduct, catalogProducts)
    );
    if (gameProducts.length === 0) return 1;
    return Math.max(...gameProducts.map(p => p.sortOrder)) + 1;
  };

  if (isCreating) {
    return (
      <CreatePackageView
        onCancel={() => {
          setIsCreating(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        defaultProductId={editingProduct ? editingProduct.productId : filters.productId}
        defaultGameType={editingProduct ? editingProduct.gameType : filters.gameType || ''}
        nextSortOrder={getNextSortOrder()}
      />
    );
  }

  if (loadError) return <div role="alert" className="rounded-lg border border-red-400/30 p-4 text-red-200"><p>{loadError}</p><button className="glass-effect-btn mt-3" onClick={()=>{setLoadError('');setIsLoading(true);setReload(n=>n+1);}}>Try again</button></div>;
  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 flex-1 flex flex-col">
      {/* Header Actions & Controls */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full">
        {/* Search */}
        <div className="relative flex-1 sm:flex-initial sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
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

        {/* Plus (+) Button for New Product Package */}
        <button
          type="button"
          onClick={() => {
            setSelectedPackageIds([]);
            setEditingProduct(null);
            setIsCreating(true);
          }}
          aria-label="New product package"
          title="New product package"
          className="glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:bg-white/10 cursor-pointer text-white/80 hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Filter Button */}
        <button
          type="button"
          onClick={() => setShowFilter(!showFilter)}
          aria-label="Open product filters"
          aria-expanded={showFilter}
          className={`glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl cursor-pointer transition-all ${
            showFilter ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/40 hover:bg-white/10'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      
    </div>

      {/* Filter Dropdown Modal (Balance Adjustments style) */}
      <ProductFilterDropdown
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        initialFilters={filters}
        products={catalogProducts}
        packages={products}
        title="Product Filter"
      />

      {/* Main Content Area */}
      <div className="card-container w-full flex-1 flex flex-col overflow-hidden">
        {selectedPackageIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-4 border-b border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-white/90">{selectedPackageIds.length} Selected</span>
              <button
                type="button"
                onClick={() => { setSelectedPackageIds([]); setShowBulkActionMenu(false); setBulkError(''); }}
                disabled={isBulkUpdating}
                className="text-xs text-white/45 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              {bulkError && <span role="alert" className="text-[11px] text-rose-300 max-w-[280px] truncate">{bulkError}</span>}
              <div className="relative" ref={bulkActionRef}>
                <button
                  type="button"
                  onClick={() => setShowBulkActionMenu((value) => !value)}
                  disabled={isBulkUpdating}
                  className="glass-effect-btn h-8 px-3 flex items-center gap-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isBulkUpdating ? 'Applying...' : 'Action'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${showBulkActionMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showBulkActionMenu && !isBulkUpdating && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 top-full mt-1.5 w-40 bg-[#161616] border border-white/15 rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.9)] overflow-hidden z-50"
                    >
                      <button type="button" onClick={() => { void handleBulkStatus(true); }} className="w-full text-left px-3 py-2 text-xs text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer">Set Active</button>
                      <button type="button" onClick={() => { void handleBulkStatus(false); }} className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-white/10 transition-colors cursor-pointer">Set Inactive</button>
                      <div className="h-px bg-white/10" />
                      <button type="button" onClick={() => { setShowBulkActionMenu(false); setShowBulkDeleteConfirm(true); }} className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-white/10 transition-colors cursor-pointer">Delete Selected</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Responsive Table View */}
        <div className="w-full overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-[10px] sm:text-[11px] md:text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-white/50 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md font-medium">
              <tr>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered packages"
                      title="Select All"
                      checked={allFilteredSelected}
                      disabled={filteredData.length === 0 || isBulkUpdating}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <span>Name</span>
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Cost</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Price · USD</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Profit · USD</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center">Status</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center">Sort</th>
                {selectedPackageIds.length === 0 && (
                  <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={selectedPackageIds.length > 0 ? 6 : 7} className="h-[500px]">
                    <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-3">
                      <Box className="w-12 h-12 opacity-50" />
                      <p className="text-sm font-medium">Product Packages Not Found</p>
      
                  </div>
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedData.map((prod) => (
                    <tr key={prod.id} className={`hover:bg-white/5 transition-colors group cursor-default ${selectedPackageIdSet.has(prod.id) ? 'bg-white/[0.04]' : ''}`}>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium text-white/90">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${prod.name}`}
                            checked={selectedPackageIdSet.has(prod.id)}
                            disabled={isBulkUpdating}
                            onChange={() => togglePackageSelection(prod.id)}
                            className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                          <span>{prod.name}</span>{prod.id.startsWith('store-package-')&&prod.directProvider==='Manual'&&<Link className="text-xs text-yellow-400" href={'/catalog/'+prod.productId}>Inventory</Link>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/80">
                        {isManualSourceProductPackage(prod) ? (
                          Number(prod.coinCost) > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span>{prod.coinCost.toFixed(2)}</span>
                              <span className="text-[9px] sm:text-[10px] text-white/35">Source</span>
                            </div>
                          ) : (
                            <span className="text-white/30">—</span>
                          )
                        ) : Number(prod.coinCost) > 0 ? (
                          <div className="flex items-center gap-1">
                            <span
                              className="ping inline-block shrink-0"
                              style={
                                {
                                  '--uib-size': '13px',
                                  '--uib-speed': '1s',
                                  '--uib-color': providerColor(prod.directProvider || '', '#eab308'),
                                } as React.CSSProperties
                              }
                            />
                            <span>{prod.coinCost.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/80">{prod.sellingPrice}</td>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/80">{prod.profit}</td>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center">
                        <div className="flex justify-center">
                          {prod.isActive ? (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
                              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 sm:w-3.5 sm:h-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-rose-500/50 flex items-center justify-center text-rose-400 bg-rose-500/10">
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center text-white/70">{prod.sortOrder}</td>
                      {selectedPackageIds.length === 0 && (
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right">
                          <div className="flex justify-end gap-2.5 sm:gap-3">
                            <button type="button" 
                              onClick={() => {
                                setEditingProduct(prod);
                                setIsCreating(true);
                              }}
                              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button type="button" 
                              onClick={() => confirmDelete(prod)}
                              className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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
                disabled={currentPage === 1}
                className={`p-1 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'text-white/80 hover:text-white'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-white/90 text-xs text-center select-none font-medium w-8 shrink-0">
                {currentPage}
              </span>

              <button type="button" 
                aria-label="Next page"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-1 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0 ${currentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : 'text-white/80 hover:text-white'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Package?"
        description="Are you sure you want to delete this product package? This action cannot be undone."
      />

      <DeleteConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedPackageIds.length} Packages?`}
        description="All selected packages will use the existing safe delete workflow. Packages with order history are disabled and hidden instead of breaking historical orders."
        confirmLabel={`Delete ${selectedPackageIds.length} Packages`}
      />
    </div>
  );
};
