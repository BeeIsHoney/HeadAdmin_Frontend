import {usePanel} from '@/components/context';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { AdminPageSkeleton } from '../../shared/components/Skeletons';
import { CreateProductCatalogGroupView } from './CreateProductCatalogGroupView';
import { CatalogGroupFilterDropdown } from './components/CatalogGroupFilterDropdown';
import { adminPanelApi } from '../../shared/services/adminPanelApi';
import type { GameItem } from './types/game.types';
import type {
  ProductCatalogGroupFilterState,
  ProductCatalogGroupItem,
} from './types/catalog-group.types';
import {
  getSelectableCatalogProducts,
  sortProductCatalogGroups,
} from './utils/catalogGrouping';

export const ProductCatalogGroupsView = () => {
  const {refresh} = usePanel();
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductCatalogGroupItem | null>(null);
  const [groups, setGroups] = useState<ProductCatalogGroupItem[]>([]);
  const [products, setProducts] = useState<GameItem[]>([]);
  const [groupToDelete, setGroupToDelete] = useState<ProductCatalogGroupItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<ProductCatalogGroupFilterState>({ status: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const itemsPerPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminPanelApi.catalogGroups.list(), adminPanelApi.products.list()])
      .then(([groupItems, productItems]) => {
        if (!active) return;
        setGroups(groupItems);
        setProducts(productItems);
      })
      .catch((e:unknown) => {if(active)setLoadError(e instanceof Error?e.message:'Unable to load records.');})
      .finally(() => { if (active) setIsLoading(false); });
    const handleClickOutside = (event: MouseEvent) => {
      if (itemsPerPageRef.current && !itemsPerPageRef.current.contains(event.target as Node)) {
        setIsItemsPerPageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reload, refresh]);

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortProductCatalogGroups(
      groups.filter((group) => {
        const matchesSearch =
          !query ||
          group.name.toLowerCase().includes(query) ||
          group.code.toLowerCase().includes(query) ||
          group.id.toLowerCase().includes(query);
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'active' && group.isActive) ||
          (filters.status === 'inactive' && !group.isActive);
        return matchesSearch && matchesStatus;
      }),
    );
  }, [filters.status, groups, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  useEffect(()=>{setCurrentPage(n=>Math.min(n,totalPages));},[totalPages]);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [currentPage, filteredData, itemsPerPage]);

  const handleSaveGroup = async (groupData: Omit<ProductCatalogGroupItem, 'id'>) => {
    const selectableIds = new Set(
      getSelectableCatalogProducts(products, groups, editingGroup?.id).map((product) => product.id),
    );
    const selectedProductIds = Array.from(
      new Set(groupData.selectedProductIds.filter((id) => selectableIds.has(id))),
    );
    const normalizedGroupData = {
      ...groupData,
      selectedProductIds,
      targetProductId:
        groupData.targetProductId && selectedProductIds.includes(groupData.targetProductId)
          ? groupData.targetProductId
          : selectedProductIds[0],
    };

    if (editingGroup) {
      await adminPanelApi.catalogGroups.update({ ...normalizedGroupData, id: editingGroup.id }, editingGroup);
    } else {
      await adminPanelApi.catalogGroups.create(normalizedGroupData);
    }

    const [groupItems, productItems] = await Promise.all([
      adminPanelApi.catalogGroups.list(),
      adminPanelApi.products.list(),
    ]);
    setGroups(groupItems);
    setProducts(productItems);
    setIsCreating(false);
    setEditingGroup(null);
  };

  if (isCreating) {
    return (
      <CreateProductCatalogGroupView
        onCancel={() => {
          setIsCreating(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
        editingGroup={editingGroup}
        existingGroups={groups}
        products={products}
      />
    );
  }

  if (isLoading) return <AdminPageSkeleton />;

  const isFilterActive = filters.status !== 'all';

  return (
    <div className="flex w-full flex-1 flex-col space-y-3 sm:space-y-4">
      <div className="flex w-full items-center justify-end gap-2.5 sm:gap-3">
        <div className="relative flex-1 sm:w-64 sm:flex-initial lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search catalog groups..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            className="h-[38px] w-full rounded-lg border border-white/10 bg-black/40 pl-9 pr-9 text-sm text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingGroup(null);
            setIsCreating(true);
          }}
          aria-label="New product catalog group"
          title="New product catalog group"
          className="glass-effect-btn relative flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center border-white/10 p-0 text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowFilter((current) => !current)}
          aria-label="Open product catalog group filters"
          aria-expanded={showFilter}
          className={`glass-effect-btn relative flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center border-white/10 p-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-white/30 ${
            isFilterActive || showFilter
              ? 'border-white/40 bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'bg-black/40 hover:bg-white/10'
          }`}
        >
          <Filter className="h-4 w-4" />
          {isFilterActive && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
        </button>
      </div>

      <CatalogGroupFilterDropdown
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        initialFilters={filters}
      />

      <div className="card-container flex w-full flex-1 flex-col overflow-hidden">
        <div className="w-full flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full whitespace-nowrap text-left text-[10px] sm:text-[11px] md:text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/10 bg-white/5 text-white/50 backdrop-blur-md">
              <tr>
                <th className="px-2 py-1.5 font-medium sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Catalog Group Name</th>
                <th className="px-2 py-1.5 font-medium sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Products</th>
                <th className="px-2 py-1.5 font-medium sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Sort</th>
                <th className="px-2 py-1.5 text-center font-medium sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Status</th>
                <th className="px-2 py-1.5 text-right sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-[280px] sm:h-[360px]">
                    <div className="flex h-full flex-col items-center justify-center space-y-4 text-white/40">
                      <Box className="h-12 w-12 opacity-50" />
                      <p className="text-sm font-medium">No product catalog groups found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((group) => (
                  <tr key={group.id} className="group transition-colors hover:bg-white/5">
                    <td className="px-2 py-1.5 font-medium text-white/90 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                      {group.name}
                    </td>
                    <td className="px-2 py-1.5 font-medium text-white/80 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                      {group.selectedProductIds.length}
                    </td>
                    <td className="px-2 py-1.5 text-white/80 sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                      {group.sortOrder}
                    </td>
                    <td className="px-2 py-1.5 text-center sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                      <div className="flex justify-center">
                        {group.isActive ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 sm:h-6 sm:w-6">
                            <Check className="h-3 w-3 stroke-[2.5] sm:h-4 sm:w-4" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/10 text-rose-400 sm:h-6 sm:w-6">
                            <X className="h-3 w-3 stroke-[2.5] sm:h-4 sm:w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right sm:px-2.5 sm:py-2 md:px-4 md:py-2.5">
                      <div className="flex justify-end gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(group);
                            setIsCreating(true);
                          }}
                          className="flex cursor-pointer items-center gap-1.5 font-medium text-amber-400 transition-colors hover:text-amber-300"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupToDelete(group)}
                          className="flex cursor-pointer items-center gap-1.5 font-medium text-rose-400 transition-colors hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex w-full items-center justify-between border-t border-white/10 bg-black/20 p-4">
          <div className="min-w-[80px] text-sm text-white/40">
            Total: <span className="font-medium text-white/90">{Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totalItems)}</span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative" ref={itemsPerPageRef}>
              <button
                type="button"
                onClick={() => setIsItemsPerPageOpen((current) => !current)}
                className="glass-effect-btn flex h-7 w-[72px] items-center justify-between px-2.5 text-xs"
              >
                <span>{itemsPerPage}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${isItemsPerPageOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isItemsPerPageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 z-50 mb-2 w-full min-w-[72px] overflow-hidden rounded-lg border border-white/15 bg-[#161616] shadow-[0_10px_25px_rgba(0,0,0,0.9)]"
                  >
                    {[10, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setItemsPerPage(amount);
                          setCurrentPage(1);
                          setIsItemsPerPageOpen(false);
                        }}
                        className={`w-full cursor-pointer px-3 py-1.5 text-left text-xs transition-colors ${
                          itemsPerPage === amount
                            ? 'bg-white/20 font-bold text-white'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass-effect-btn flex h-7 items-center gap-1 px-1">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className={`flex shrink-0 items-center justify-center rounded p-1 transition-colors ${
                  currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="w-8 shrink-0 select-none text-center text-xs font-medium text-white/90">{currentPage}</span>
              <button
                type="button"
                aria-label="Next page"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className={`flex shrink-0 items-center justify-center rounded p-1 transition-colors ${
                  currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(groupToDelete)}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (!groupToDelete) return;
          return adminPanelApi.catalogGroups.remove(groupToDelete.id).then(async () => {
            setGroups(await adminPanelApi.catalogGroups.list());
            setGroupToDelete(null);
          });
        }}
        title="Delete Product Catalog Group?"
        description="The group will be deleted. Its products will remain available as ungrouped products."
      />
    </div>
  );
};
