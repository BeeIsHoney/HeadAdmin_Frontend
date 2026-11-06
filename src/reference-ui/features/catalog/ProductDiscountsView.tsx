import {usePanel} from '@/components/context';
import { AdminPageSkeleton } from '../../shared/components/Skeletons';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Edit, Trash2, Percent, Check, X, Filter, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type DiscountItem, type DiscountFilterState } from './types/discount.types';
import { CreateDiscountView } from './CreateDiscountView';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { DiscountFilterDropdown } from './components/DiscountFilterDropdown';
import { adminPanelApi } from '../../shared/services/adminPanelApi';
import type { GameItem } from './types/game.types';
import type { ProductItem } from './types/product.types';
import { getDiscountProductId } from './utils/productIdentity';

export const ProductDiscountsView: React.FC = () => {
  const {refresh} = usePanel();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DiscountFilterState>({
    productId: 'all',
    status: 'all',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [products, setProducts] = useState<GameItem[]>([]);
  const [packages, setPackages] = useState<ProductItem[]>([]);
  const [discountToDelete, setDiscountToDelete] = useState<DiscountItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const itemsPerPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminPanelApi.discounts.list(),
      adminPanelApi.products.list(),
      adminPanelApi.packages.list(),
    ]).then(([discountItems, productItems, packageItems]) => {
      if (!active) return;
      setDiscounts(discountItems);
      setProducts(productItems);
      setPackages(packageItems);
    }).catch((e:unknown) => {if(active)setLoadError(e instanceof Error?e.message:'Unable to load records.');})
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
    return discounts.filter((discount) => {
      const lowerQuery = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || discount.discountPrice.toLowerCase().includes(lowerQuery) || (discount.productName && discount.productName.toLowerCase().includes(lowerQuery));
      
      const matchesProductType = filters.productId === 'all'
        || getDiscountProductId(discount, packages) === filters.productId;
      const matchesStatus = filters.status === 'all' || (filters.status === 'active' ? discount.isActive : !discount.isActive);
      
      return matchesSearch && matchesProductType && matchesStatus;
    });
  }, [discounts, filters, packages, searchTerm]);

  // Calculation Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  useEffect(()=>{setCurrentPage(n=>Math.min(n,totalPages));},[totalPages]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleEdit = (discount: DiscountItem) => {
    setEditingDiscount(discount);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (discountToDelete) {
      await adminPanelApi.discounts.remove(discountToDelete.id);
      setDiscounts(await adminPanelApi.discounts.list());
      setDiscountToDelete(null);
    }
  };

  const confirmDelete = (discount: DiscountItem) => {
    setDiscountToDelete(discount);
  };

  if (isCreating) {
    return (
      <CreateDiscountView
        onCancel={() => {
          setIsCreating(false);
          setEditingDiscount(null);
        }}
        onSave={async (discount) => {
          await adminPanelApi.discounts.save(discount);
          setDiscounts(await adminPanelApi.discounts.list());
          setIsCreating(false);
          setEditingDiscount(null);
        }}
        editingDiscount={editingDiscount}
        products={products}
        packages={packages}
      />
    );
  }

  if (loadError) return <div role="alert" className="rounded-lg border border-red-400/30 p-4 text-red-200"><p>{loadError}</p><button className="glass-effect-btn mt-3" onClick={()=>{setLoadError('');setIsLoading(true);setReload(n=>n+1);}}>Try again</button></div>;
  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 flex-1 flex flex-col">
      <p className="text-sm text-white/60">Discount records are shown below. Creating or editing USD discounts requires USD support in Main Backend; the legacy MMK discount editor is unavailable.</p>
      {/* Header Actions & Controls */}
      <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full">
        <div className="relative flex-1 sm:flex-initial sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search discounts..."
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
          onClick={() => {
            setEditingDiscount(null);
            setIsCreating(false);
          }}
          disabled title="Requires USD discount support in Main Backend" aria-label="New discount"

          className="glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:bg-white/10 cursor-pointer text-white/80 hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          aria-label="Filter discounts"
          title="Filter discounts"
          aria-expanded={isFilterOpen}
          className={`glass-effect-btn h-[38px] w-[38px] p-0 relative flex items-center justify-center border-white/10 hover:border-white/30 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl cursor-pointer transition-all ${
            isFilterOpen
              ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'bg-black/40 hover:bg-white/10 text-white/80 hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <DiscountFilterDropdown
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        initialFilters={filters}
        products={products}
        packages={packages}
        discounts={discounts}
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
                    Package
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Percent
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Discount Price
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Sold
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Limit
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">Remaining</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium">
                  <div className="flex items-center gap-1">
                    Created at
                  </div>
                </th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 font-medium text-center">Active</th>
                <th className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-[500px]">
                    <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
                      <Percent className="w-12 h-12 opacity-50" />
                      <p className="text-sm font-medium">No discounts found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedData.map((discount) => {
                    return (
                      <tr key={discount.id} className="hover:bg-white/5 transition-colors group cursor-default">
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.productName}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.discountPercent}%</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.discountPrice}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.sold}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.limit}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/90 font-medium">{discount.remaining}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-white/70">{discount.createdAt ? new Date(discount.createdAt).toLocaleString() : '—'}</td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-center">
                          <div className="flex justify-center">
                            {discount.isActive ? (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-rose-500/50 flex items-center justify-center text-rose-400 bg-rose-500/10">
                                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5 text-right">
                          <div className="flex justify-end gap-2.5 sm:gap-3">
                            <button
                              type="button" 
                              disabled title="Requires USD discount support in Main Backend" onClick={() => handleEdit(discount)}
                              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button" 
                              onClick={() => confirmDelete(discount)}
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
        isOpen={!!discountToDelete}
        onClose={() => setDiscountToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Discount?"
        description="Are you sure you want to delete this discount? This action cannot be undone."
      />
    </div>
  );
};
