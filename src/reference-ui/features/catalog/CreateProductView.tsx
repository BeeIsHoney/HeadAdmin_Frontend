'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, UploadCloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  type GameItem,
  type ProductInputField,
  type ProductInputOption,
  type ProductProviderType,
} from './types/game.types';
import { ValidationSelectModal } from './components/ValidationSelectModal';
import { ProductInputFieldsEditor } from './components/ProductInputFieldsEditor';
import {
  canonicalInputFieldId,
  normalizeProductInputFields,
} from './utils/productInputFields';
import { fetchValidationSchema } from './services/providerCatalog';
import { adminPanelApi } from '../../shared/services/adminPanelApi';
import {validationSelection} from '@/lib/validation-selection';
import {validateFields} from '@/lib/product-management';

const PRODUCT_PROVIDER_OPTIONS: ProductProviderType[] = ['Manual', 'Direct Top-ups', 'GiftCards & Vouchers'];

export const CreateProductView: React.FC<{ 
  onCancel: () => void;
  onSaved?: (product: GameItem) => void | Promise<void>;
  editingProduct?: GameItem | null;
  defaultSortOrder?: number;
  giftCard?: boolean;
}> = ({ onCancel, onSaved, editingProduct, defaultSortOrder = 1, giftCard = false }) => {
  const [name, setName] = useState(editingProduct?.name || '');
  const [logoUrl, setLogoUrl] = useState(editingProduct?.image || '');
  const [status, setStatus] = useState<'On' | 'Off'>(editingProduct ? (editingProduct.isActive ? 'On' : 'Off') : 'On');
  const [sortOrder, setSortOrder] = useState(editingProduct?.sort?.toString() ?? defaultSortOrder.toString());
  const [groupType, setGroupType] = useState(editingProduct?.category || (giftCard ? 'GiftCards' : 'Games'));
  const [totalSold, setTotalSold] = useState(editingProduct?.totalSold || '');
  const [importantNote, setImportantNote] = useState(editingProduct?.note || '');
  const [isValidationOn, setIsValidationOn] = useState(Boolean(editingProduct?.validationCode));
  const [validationCode, setValidationCode] = useState(editingProduct?.validationCode || '');
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isLoadingValidationSchema, setIsLoadingValidationSchema] = useState(false);
  const [validationSchemaNote, setValidationSchemaNote] = useState('');
  const [validationSchemaError, setValidationSchemaError] = useState('');
  // Full G2 server lists are transient selection catalogs, never Product JSON.
  const [validationOptionCatalog, setValidationOptionCatalog] = useState<Record<string, ProductInputOption[]>>({});
  const [isDeliveryOn, setIsDeliveryOn] = useState(Boolean(editingProduct?.deliveryEstimate));
  const [deliveryTime, setDeliveryTime] = useState(editingProduct?.deliveryEstimate || 'Less than 2 minutes');
  const [inputFields, setInputFields] = useState<ProductInputField[]>(
    () => editingProduct?.inputFields?.length
      ? normalizeProductInputFields(editingProduct.inputFields)
      : [],
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [provider, setProvider] = useState(editingProduct?.provider || (giftCard ? 'GiftCards & Vouchers' : 'Manual'));
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError,setFormError]=useState('');
  const previewObjectUrlRef = useRef<string | null>(null);
  const lastSyncedValidationCodeRef = useRef(editingProduct?.validationCode || '');
  const validationRequestRef = useRef(0);

  const inputBaseClasses = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20";
  const labelClass = "block text-xs font-medium text-white/70 mb-1.5";

  useEffect(() => {
    return () => {
      validationRequestRef.current++;
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);


  const syncValidationFields = async (selectedValidationCode: string) => {
    const request=++validationRequestRef.current;
    setIsLoadingValidationSchema(true);
    setValidationSchemaError('');
    setValidationOptionCatalog({});
    try {
      const selection = validationSelection(selectedValidationCode);
      const schema = await fetchValidationSchema(selection.provider, selection.code);
      if(request!==validationRequestRef.current)return;
      const isSameValidationCategory = lastSyncedValidationCodeRef.current === selectedValidationCode;
      lastSyncedValidationCodeRef.current = selectedValidationCode;
      setValidationSchemaNote(selection.provider === 'LG' ? '' : schema.notes?.trim() || '');
      const catalog: Record<string, ProductInputOption[]> = {};
      schema.fields.forEach((field) => {
        if (field.type !== 'Dropdown' || field.optionSource !== 'validation_api' || !field.validationKey) return;
        catalog[field.validationKey] = (field.options ?? []).map((option) => typeof option === 'string'
          ? { label: option, value: option }
          : { label: String(option.label), value: String(option.value) });
      });
      setValidationOptionCatalog(catalog);
      setInputFields((current) => {
        const normalizedCurrent = normalizeProductInputFields(current, true);
        const incomingKeys = new Set(schema.fields.map((field) =>
          canonicalInputFieldId(field.providerKey || field.id),
        ));

        const byKey = new Map(normalizedCurrent.map((field) => {
          const key = canonicalInputFieldId(field.providerKey || field.id);
          const wasValidationManaged = Boolean(field.validationKey && field.validationSource);
          const shouldDetach = wasValidationManaged && !incomingKeys.has(key);
          return [key, shouldDetach ? {
            ...field,
            validationKey: undefined,
            validationSource: undefined,
            optionSource: field.optionSource === 'validation_api' ? 'manual' as const : field.optionSource,
          } : field] as const;
        }));

        for (const incoming of schema.fields) {
          const key = canonicalInputFieldId(incoming.providerKey || incoming.id);
          const existing = byKey.get(key);
          const merged: ProductInputField = existing
            ? {
              ...existing,
              id: existing.id,
              // Keep local Product display/order mapping edits. Validation has its own key.
              providerKey: existing.providerKey?.trim() || incoming.providerKey,
              label: existing.label?.trim() || incoming.label,
              placeholder: existing.placeholder?.trim() || incoming.placeholder,
              type: incoming.type,
              // Persist a curated subset, not thousands of G2 server values.
              // Existing selections survive Refresh Fields; new small lists can
              // still auto-populate without an extra selection step.
              options: incoming.type !== 'Dropdown' ? undefined
                : incoming.optionSource === 'validation_api'
                  ? isSameValidationCategory && existing?.options?.length ? existing.options
                    : (incoming.options?.length ?? 0) <= 100 ? incoming.options ?? [] : []
                  : incoming.options ?? [],
              required: incoming.required,
              validationKey: incoming.validationKey,
              validationSource: incoming.validationSource,
              optionSource: incoming.optionSource ?? 'manual',
            }
            : { ...incoming, options: incoming.type === 'Dropdown' && incoming.optionSource === 'validation_api'
                && (incoming.options?.length ?? 0) > 100 ? [] : incoming.options };
          byKey.set(key, merged);
        }

        return [...byKey.values()];
      });
    } catch (error: unknown) {
      if(request!==validationRequestRef.current)return;
      setValidationSchemaNote('');
      setValidationSchemaError(error instanceof Error ? error.message : 'Unable to load API validation fields.');
    } finally {
      if(request===validationRequestRef.current)setIsLoadingValidationSchema(false);
    }
  };

  const clearPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 2 * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      e.target.value = '';
      return;
    }

    clearPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setFileName(file.name);
    setLogoUrl(objectUrl);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full flex-1 flex flex-col text-white pb-4"
    >
      {/* Form Container (No outer card) */}
      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <form
          className="space-y-3 sm:space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (isSaving) return;
            if (isLoadingValidationSchema) {setFormError('Wait for the validation fields to finish loading.');return;}
            setIsSaving(true);
            setFormError('');
            try {
              if(provider==='Direct Top-ups'&&isValidationOn&&(!validationCode.trim()||lastSyncedValidationCodeRef.current!==validationCode))throw Error('Load the selected validation fields successfully before saving.');
              validateFields(inputFields.map(field=>({...field,required:field.required!==false})),false);
              const normalizedFields=normalizeProductInputFields(inputFields,provider==='Direct Top-ups');
              if(normalizedFields.length!==inputFields.length)throw Error('Input fields must have distinct IDs after normalization.');
              validateFields(normalizedFields.map(field=>({...field,required:field.required!==false})),provider==='Direct Top-ups');
              const oversizedSelection = inputFields.find((field) =>
                field.type === 'Dropdown' && field.optionSource === 'validation_api'
                && (field.options?.length ?? 0) > 100);
              if (oversizedSelection) {
                setValidationSchemaError('Keep at most 100 selected API servers per field.');
                return;
              }
              const emptyValidationDropdown = provider === 'Direct Top-ups' && isValidationOn
                && inputFields.find((field) => field.type === 'Dropdown' && field.validationKey
                  && field.required !== false && !field.options?.length);
              if (emptyValidationDropdown) {
                setValidationSchemaError(`Select at least one option for ${emptyValidationDropdown.label} before saving.`);
                return;
              }
              const payload = {
                name: name.trim(),
                provider,
                image: logoUrl.trim() || null,
                isActive: status === 'On',
                sort: Number.parseInt(sortOrder, 10) || 0,
                category: groupType,
                totalSold: totalSold.trim(),
                note: importantNote.trim() || null,
                validationCode: provider === 'Direct Top-ups' && isValidationOn
                  ? validationCode.trim() || null
                  : null,
                inputFields: normalizedFields,
                deliveryEstimate: isDeliveryOn ? deliveryTime.trim() || null : null,
              };

              const fieldSize = new TextEncoder().encode(JSON.stringify(payload.inputFields)).length;
              if (fieldSize > 60_000) {
                setValidationSchemaError('Product fields exceed the 60 KB storage limit. Remove unneeded server options.');
                return;
              }
              setValidationSchemaError('');
              const saved = editingProduct
                ? await adminPanelApi.products.update(editingProduct.id, payload, editingProduct)
                : await adminPanelApi.products.create(payload);
              await onSaved?.(saved);
              onCancel();
            } catch (error) {
              setFormError(error instanceof Error?error.message:'Unable to save product.');
            } finally {
              setIsSaving(false);
            }
          }}
        >
          
          {/* Name */}
          <div>
            <label htmlFor="product-name" className={labelClass}>
              Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile Legends: Bang Bang"
              className={inputBaseClasses}
            />
          </div>

          {/* Source */}
          <div className={`relative ${isProviderDropdownOpen ? 'z-50' : 'z-20'}`}>
            <label htmlFor="product-provider-btn" className={labelClass}>
              Source<span className="text-red-500 ml-0.5">*</span>
            </label>
            <button
              id="product-provider-btn"
              type="button"
              disabled={giftCard||Boolean(editingProduct?.id.startsWith('store-'))} onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
              className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
            >
              <span className="text-white font-medium">{provider}</span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isProviderDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col"
                >
                  {PRODUCT_PROVIDER_OPTIONS.filter(p=>!editingProduct||(p==='GiftCards & Vouchers')===editingProduct.id.startsWith('store-')).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setProvider(p);
                        validationRequestRef.current++;setIsLoadingValidationSchema(false);
                        if(p === 'GiftCards & Vouchers') setGroupType('GiftCards');
                        else if(groupType === 'GiftCards' || groupType === 'Vouchers') setGroupType('Games');
                        setIsProviderDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${provider === p ? 'bg-white/5 text-white font-medium' : 'text-white/70'}`}
                    >
                      <span>{p}</span>
                      {provider === p && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* Validation */}
          {provider === 'Direct Top-ups' && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <label htmlFor="product-validation-switch" className="text-xs font-medium text-white/80 cursor-pointer">
                  API Validation
                </label>
                <label htmlFor="product-validation-switch" className="relative inline-flex items-center cursor-pointer shrink-0">
                  <span className="sr-only">Toggle API Validation</span>
                  <input
                    id="product-validation-switch"
                    type="checkbox"
                    className="sr-only peer"
                    checked={isValidationOn}
                    onChange={(e) => {setIsValidationOn(e.target.checked);if(!e.target.checked){validationRequestRef.current++;setIsLoadingValidationSchema(false);}}}
                  />
                  <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/60 peer-checked:after:bg-[#121212] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>
              
              <AnimatePresence>
                {isValidationOn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2">
                      <input
                        id="product-validation-code"
                        type="text"
                        value={validationCode}
                        readOnly
                        required={isValidationOn}
                        placeholder="Select an API validation category..."
                        className={`${inputBaseClasses} font-mono cursor-default`}
                      />
                      <button
                        type="button"
                        onClick={() => setIsValidationModalOpen(true)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-xs transition-colors border border-white/10 shrink-0 cursor-pointer flex items-center justify-center"
                      >
                        Select
                      </button>
                      {validationCode.trim() && (
                        <button
                          type="button"
                          disabled={isLoadingValidationSchema}
                          onClick={() => void syncValidationFields(validationCode)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 font-medium rounded-lg text-xs transition-colors border border-white/10 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Refresh Fields
                        </button>
                      )}
                    </div>
                    {isLoadingValidationSchema && (
                      <p className="mt-2 text-[10px] text-white/45">Loading API validation fields...</p>
                    )}
                    {!isLoadingValidationSchema && validationSchemaNote && (
                      <p className="mt-2 text-[10px] text-white/45">Validation note: {validationSchemaNote}</p>
                    )}
                    {!isLoadingValidationSchema && validationSchemaError && (
                      <p role="alert" className="mt-2 text-[10px] text-red-300">{validationSchemaError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {(provider === 'Manual' || provider === 'Direct Top-ups') && (
            <ProductInputFieldsEditor
              fields={inputFields}
              onChange={setInputFields}
              showProviderKey={provider === 'Direct Top-ups'}
              validationOptionCatalog={validationOptionCatalog}
            />
          )}


          {/* Estimated Delivery: Manual and Direct Top-ups use the same UI. */}
          {(provider === 'Manual' || provider === 'Direct Top-ups') && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <label htmlFor="product-delivery-switch" className="text-xs font-medium text-white/80 cursor-pointer">
                  Estimated Delivery
                </label>
                <label htmlFor="product-delivery-switch" className="relative inline-flex items-center cursor-pointer shrink-0">
                  <span className="sr-only">Toggle Estimated Delivery</span>
                  <input
                    id="product-delivery-switch"
                    type="checkbox"
                    className="sr-only peer"
                    checked={isDeliveryOn}
                    onChange={(e) => setIsDeliveryOn(e.target.checked)}
                  />
                  <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/60 peer-checked:after:bg-[#121212] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>
              
              <AnimatePresence>
                {isDeliveryOn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      id="product-delivery-time"
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="e.g. Less than 2 minutes"
                      className={inputBaseClasses}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}


          {/* Logo & Image Section */}
          <div className="space-y-2.5">
            <label htmlFor="product-logo" className={labelClass}>
              Logo/Icon
            </label>
            
            <input 
              id="product-logo" 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleFileChange}
              className="sr-only" 
            />
            
            <label 
              htmlFor="product-logo" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)handleFileChange({target:{files:[file],value:''}} as unknown as React.ChangeEvent<HTMLInputElement>);}}
              className="w-full min-h-20 bg-black/40 border border-white/10 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-xs sm:text-sm text-white/50 hover:text-white/90 hover:bg-white/[0.04] hover:border-white/30 transition-all cursor-pointer group"
            >
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img 
                    src={logoUrl} 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded-lg border border-white/20 shadow-md"
                  />
                  <div className="text-left">
                    <p className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                      {fileName || 'Current image'}
                    </p>
                    <p className="text-[11px] text-white/40">Click to replace file</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 group-hover:bg-white/10 group-hover:text-white transition-colors text-white/60">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white/80">
                    Drag & Drop your file or <span className="text-white underline underline-offset-2 decoration-white/40 group-hover:decoration-white transition-colors">Browse</span>
                  </span>
                  <span className="text-[11px] text-white/40 mt-1">Supports JPG, PNG, WEBP (Max 2MB)</span>
                </>
              )}
            </label>

          </div>

          {/* Status & Sort Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            
            {/* Status Dropdown */}
            <div className={`relative ${isStatusDropdownOpen ? 'z-50' : 'z-10'}`}>
              <label htmlFor="product-status-btn" className={labelClass}>
                Status<span className="text-red-500 ml-0.5">*</span>
              </label>
              <button
                id="product-status-btn"
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status === 'On' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-white font-medium">{status}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('On');
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${status === 'On' ? 'bg-white/5 text-white' : 'text-white/70'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      On (Active)
                    </span>
                    {status === 'On' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('Off');
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${status === 'Off' ? 'bg-white/5 text-white' : 'text-white/70'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Off (Inactive)
                    </span>
                    {status === 'Off' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              )}
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="product-sort" className={labelClass}>
                Sort Order
              </label>
              <input
                id="product-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className={inputBaseClasses}
              />
            </div>
          </div>

          {/* Group Type & Total Sold Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            
            {/* Category */}
            <div className={`relative ${isGroupDropdownOpen ? 'z-50' : 'z-10'}`}>
              <label htmlFor="product-group-btn" className={labelClass}>
                Category<span className="text-red-500 ml-0.5">*</span>
              </label>
              <button
                id="product-group-btn"
                type="button"
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                className={`${inputBaseClasses} flex items-center justify-between cursor-pointer`}
              >
                <span className="text-white font-medium">{groupType}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isGroupDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
                  {['Games', 'Vouchers', 'GiftCards', 'Apps'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => {
                        setGroupType(grp);
                        setIsGroupDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${groupType === grp ? 'bg-white/5 text-white font-medium' : 'text-white/70'}`}
                    >
                      <span>{grp}</span>
                      {groupType === grp && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Store product sales are calculated from successful orders. */}
            {provider !== 'GiftCards & Vouchers' && (
              <div className="space-y-2">
                <label htmlFor="product-total-sold" className={labelClass}>
                  Total Sold (Display)
                </label>
                <input
                  id="product-total-sold"
                  type="number"
                  min="0"
                  value={totalSold} readOnly title="Calculated from successful orders"
                  placeholder="0"
                  className={inputBaseClasses}
                />
              </div>
            )}
          </div>

          {/* Important Note (For All) */}
          <div className="space-y-2">
            <label htmlFor="product-important-note" className={labelClass}>
              Important Note
            </label>
            <textarea
              id="product-important-note"
              rows={3}
              value={importantNote}
              onChange={(e) => setImportantNote(e.target.value)}
              placeholder="Enter important note or instructions for customers (e.g. Double check Player ID and Server before purchasing)..."
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20 resize-none"
            />
          </div>

          {formError&&<p role="alert" className="text-xs text-red-300">{formError}</p>}
          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap gap-3 items-center">
            <button 
              type="submit"
              disabled={isSaving || isLoadingValidationSchema}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] border border-white/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
              ) : (editingProduct ? 'Save Changes' : 'Create Product')}
            </button>
            <button 
              type="button"
              onClick={onCancel} 
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white font-medium rounded-lg text-xs sm:text-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>

      <ValidationSelectModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        selectedCode={validationCode}
        onSelect={(code) => {
          setValidationCode(code);
          setIsValidationModalOpen(false);
          void syncValidationFields(code);
        }}
      />
    </motion.div>
  );
};
