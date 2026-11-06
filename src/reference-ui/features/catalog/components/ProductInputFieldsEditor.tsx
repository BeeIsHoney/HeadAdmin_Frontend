'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2, X } from 'lucide-react';

import type { ProductInputField, ProductInputOption } from '../types/game.types';
import { createCustomInputFieldId, inferProductProviderKey } from '../utils/productInputFields';

interface ProductInputFieldsEditorProps {
  fields: ProductInputField[];
  onChange: (fields: ProductInputField[]) => void;
  showProviderKey?: boolean;
  validationOptionCatalog?: Record<string, ProductInputOption[]>;
}

const PROVIDER_KEY_SUGGESTIONS = [
  'player_id',
  'server_id',
  'charname',
];

const optionObject = (value: ProductInputOption | string): ProductInputOption => typeof value === 'string'
  ? { label: value, value }
  : { label: String(value.label ?? ''), value: String(value.value ?? '') };

// Cap only validation-API server selections. A 65KB MySQL TEXT column cannot
// hold a complete provider catalog with thousands of server entries.
const MAX_API_OPTIONS = 100;
const OPTION_ROW_HEIGHT = 38;

interface ApiServerOptionPickerProps {
  fieldId: string;
  available: ProductInputOption[];
  selected: ProductInputOption[];
  onChange: (next: ProductInputOption[]) => void;
}

// Virtualized list: exactly five rows fit in the scroll viewport even when
// the provider returns thousands of servers. Only ~12 DOM rows are mounted.
const ApiServerOptionPicker = ({ available, selected, onChange, fieldId }: ApiServerOptionPickerProps) => {
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [notice, setNotice] = useState('');
  const selectedValues = useMemo(() => new Set(selected.map((option) => option.value)), [selected]);
  const choices = useMemo(() => {
    const byValue = new Map<string, ProductInputOption>();
    for (const option of available) byValue.set(option.value, option);
    // Keep manual entries selectable even if not returned in a fresh API list.
    for (const option of selected) if (!byValue.has(option.value)) byValue.set(option.value, option);
    return [...byValue.values()];
  }, [available, selected]);
  const matches = useMemo(() => {
    const token = query.trim().toLowerCase();
    return token ? choices.filter((item) =>
      item.label.toLowerCase().includes(token) || item.value.toLowerCase().includes(token)) : choices;
  }, [choices, query]);
  const start = Math.max(0, Math.min(Math.floor(scrollTop / OPTION_ROW_HEIGHT) - 3, Math.max(0, matches.length - 1)));
  const visible = matches.slice(start, start + 12);
  const selectionLimit = selected.length >= MAX_API_OPTIONS;

  const toggle = (option: ProductInputOption) => {
    setNotice('');
    if (selectedValues.has(option.value)) {
      onChange(selected.filter((item) => item.value !== option.value));
    } else if (selectionLimit) {
      setNotice(`Only ${MAX_API_OPTIONS} server options can be saved per Product. Remove others first.`);
    } else {
      onChange([...selected, option]);
    }
  };
  const selectMatches = () => {
    const merged = new Map(selected.map((option) => [option.value, option]));
    for (const option of matches) {
      if (merged.size >= MAX_API_OPTIONS) break;
      merged.set(option.value, option);
    }
    onChange([...merged.values()]);
    setNotice(matches.length > MAX_API_OPTIONS
      ? `Selection limited to ${MAX_API_OPTIONS}. Search for the specific servers you need.` : '');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/50">
        <span>{selected.length} selected · {choices.length} available</span>
        <div className="flex gap-2">
          <button type="button" onClick={selectMatches} className="rounded-md border border-white/15 px-2 py-1 text-white/70 hover:text-white">Select matches</button>
          <button type="button" onClick={() => { onChange([]); setNotice(''); }} className="rounded-md border border-red-500/25 px-2 py-1 text-red-300 hover:text-red-200">Clear all</button>
        </div>
      </div>
      <input
        type="search"
        aria-label="Search provider servers"
        placeholder="Search server label or API value..."
        value={query}
        onChange={(event) => { setQuery(event.target.value); setScrollTop(0); }}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/30"
      />
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20px] gap-2 bg-white/[0.04] px-2.5 py-2 text-[10px] font-medium text-white/45">
          <span>Display Label</span><span>G2 Value</span><span>✓</span>
        </div>
        <div
          key={`${fieldId}-${query}`}
          className="overflow-y-auto overscroll-contain"
          style={{ height: Math.min(matches.length, 5) * OPTION_ROW_HEIGHT, maxHeight: 5 * OPTION_ROW_HEIGHT }}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <div style={{ height: matches.length * OPTION_ROW_HEIGHT, position: 'relative' }}>
            {visible.map((option, index) => (
              <label
                key={option.value}
                className="absolute left-0 right-0 grid cursor-pointer grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20px] items-center gap-2 border-b border-white/5 px-2.5 text-xs text-white/80 hover:bg-white/[0.04]"
                style={{ top: (start + index) * OPTION_ROW_HEIGHT, height: OPTION_ROW_HEIGHT }}
              >
                <span className="truncate">{option.label}</span>
                <span className="truncate font-mono text-white/55">{option.value}</span>
                <input type="checkbox" checked={selectedValues.has(option.value)} onChange={() => toggle(option)} aria-label={`Use server ${option.label}`} className="accent-white" />
              </label>
            ))}
          </div>
        </div>
        {matches.length === 0 && <div className="px-3 py-2 text-xs text-white/40">No servers found. Refresh Fields or add a manual value below.</div>}
      </div>
      {notice && <p role="alert" className="text-[10px] text-amber-300">{notice}</p>}
      <p className="text-[10px] text-white/40">Five rows are visible at a time. Scroll/search, then select only the servers this Product needs. G2 API values stay unchanged.</p>
    </div>
  );
};

export const ProductInputFieldsEditor = ({
  fields,
  onChange,
  showProviderKey = false,
  validationOptionCatalog = {},
}: ProductInputFieldsEditorProps) => {
  const [isAddTypeMenuOpen, setIsAddTypeMenuOpen] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState<Record<string, string>>({});
  const [newOptionValue, setNewOptionValue] = useState<Record<string, string>>({});
  const inputBaseClasses = 'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all hover:border-white/20';

  const addField = (type: ProductInputField['type']) => {
    onChange([
      ...fields,
      {
        id: createCustomInputFieldId(),
        label: '',
        type,
        options: type === 'Dropdown' ? [] : undefined,
        required: true,
        optionSource: 'manual',
      },
    ]);
    setIsAddTypeMenuOpen(false);
  };

  const updateField = (index: number, patch: Partial<ProductInputField>) => {
    onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  };

  const addOption = (index: number, field: ProductInputField) => {
    const label = (newOptionLabel[field.id] ?? '').trim();
    const value = (newOptionValue[field.id] ?? '').trim() || label;
    if (!label || !value) return;
    const options = (field.options ?? []).map(optionObject);
    if (field.optionSource === 'validation_api' && options.length >= MAX_API_OPTIONS) return;
    if (!options.some((option) => option.label === label && option.value === value)) {
      updateField(index, { options: [...options, { label, value }] });
    }
    setNewOptionLabel((current) => ({ ...current, [field.id]: '' }));
    setNewOptionValue((current) => ({ ...current, [field.id]: '' }));
  };

  return (
    <div className="bg-black/30 border border-white/10 rounded-lg p-3.5 sm:p-4 relative">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h4 className="text-xs font-medium text-white/80">
            User Input Fields<span className="text-red-500 ml-0.5">*</span>
          </h4>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAddTypeMenuOpen((open) => !open)}
            className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors border border-white/10 cursor-pointer shrink-0"
            title="Add Field"
          >
            <Plus className={`w-3.5 h-3.5 transition-transform ${isAddTypeMenuOpen ? 'rotate-45' : ''}`} />
          </button>

          {isAddTypeMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-[#121212] border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1 z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/5">
                Select Type
              </div>
              {(['Text Input', 'Dropdown'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-white/10 rounded-lg text-white/30 text-xs">
          No input fields added yet. Select API Validation or click &quot;+&quot; to configure.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {fields.map((field, index) => {
              const validationManaged = Boolean(field.validationKey && field.validationSource);
              const apiOptions = field.optionSource === 'validation_api';
              const options = (field.options ?? []).map(optionObject);

              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative z-10"
                >
                  <div className="bg-black/50 border border-white/10 rounded-lg p-3.5 sm:p-4 relative">
                    {!validationManaged && (
                      <button
                        type="button"
                        onClick={() => onChange(fields.filter((item) => item.id !== field.id))}
                        className="absolute top-3 right-3 p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="pr-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor={`input-field-label-${field.id}`} className="block text-[11px] font-medium text-white/60 mb-1">Field Label</label>
                        <input
                          id={`input-field-label-${field.id}`}
                          type="text"
                          value={field.label}
                          onChange={(event) => updateField(index, { label: event.target.value })}
                          placeholder="e.g. Player ID / Server"
                          className={inputBaseClasses}
                        />
                      </div>

                      <div>
                        <label htmlFor={`input-field-placeholder-${field.id}`} className="block text-[11px] font-medium text-white/60 mb-1">Placeholder</label>
                        <input
                          id={`input-field-placeholder-${field.id}`}
                          type="text"
                          value={field.placeholder ?? ''}
                          onChange={(event) => updateField(index, { placeholder: event.target.value })}
                          placeholder="e.g. Enter your Player ID"
                          className={inputBaseClasses}
                        />
                      </div>

                      {showProviderKey && (
                        <div>
                          <label htmlFor={`input-field-provider-key-${field.id}`} className="block text-[11px] font-medium text-white/60 mb-1">Provider Key</label>
                          <input
                            id={`input-field-provider-key-${field.id}`}
                            type="text"
                            list={`provider-key-suggestions-${field.id}`}
                            value={field.providerKey ?? ''}
                            onChange={(event) => updateField(index, { providerKey: event.target.value })}
                            placeholder={inferProductProviderKey(field) || 'e.g. player_id'}
                            className={`${inputBaseClasses} font-mono`}
                          />
                          <datalist id={`provider-key-suggestions-${field.id}`}>
                            {PROVIDER_KEY_SUGGESTIONS.map((key) => <option key={key} value={key} />)}
                          </datalist>
                          {!field.providerKey?.trim() && inferProductProviderKey(field) && (
                            <p className="mt-1 text-[10px] text-white/50">Auto mapping: {inferProductProviderKey(field)}</p>
                          )}
                        </div>
                      )}

                      {validationManaged && (
                        <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
                          <div className="text-xs font-semibold text-white/80">Source: {field.validationSource}</div>
                          <div className="mt-1 text-[10px] font-mono text-white/45">Validation Key: {field.validationKey}</div>
                        </div>
                      )}
                    </div>

                    <div className="pr-7 mt-2 flex items-center justify-between gap-4 bg-white/[0.025] border border-white/5 rounded-lg px-3 py-2">
                      <div>
                        <div className="text-[11px] font-medium text-white/60">Required</div>
                        <div className="text-[10px] text-white/30">
                          {validationManaged ? `Required by ${field.validationSource} validation.` : 'User must provide this field before ordering.'}
                        </div>
                      </div>
                      <label className={`relative inline-flex items-center shrink-0 ${validationManaged ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                        <span className="sr-only">Toggle required field</span>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={field.required !== false}
                          disabled={validationManaged}
                          onChange={(event) => updateField(index, { required: event.target.checked })}
                        />
                        <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/60 peer-checked:after:bg-[#121212] after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-white" />
                      </label>
                    </div>

                    {field.type === 'Dropdown' && (
                      <div className="space-y-2 pr-7 mt-2">
                        {apiOptions && validationManaged && (
                          <div className="text-[10px] text-white/45">
                            Dropdown values are synced from {field.validationSource} and the API values are preserved exactly.
                          </div>
                        )}

                        {apiOptions ? (
                          <ApiServerOptionPicker
                            fieldId={field.id}
                            available={validationOptionCatalog[field.validationKey ?? ''] ?? options}
                            selected={options}
                            onChange={(next) => updateField(index, { options: next })}
                          />
                        ) : options.length > 0 && (
                          <div className="overflow-hidden rounded-lg border border-white/10">
                            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-white/40">
                              <span>Display Label</span><span>Value</span><span className="w-4" />
                            </div>
                            <div className="max-h-[190px] overflow-y-auto overscroll-contain">
                              {options.map((option, optionIndex) => (
                                <div key={`${option.label}-${option.value}-${optionIndex}`} className="grid grid-cols-[1fr_1fr_auto] min-h-[38px] items-center gap-2 border-t border-white/5 px-2.5 py-1.5 text-xs text-white/80">
                                  <span className="truncate">{option.label}</span>
                                  <span className="truncate font-mono text-white/60">{option.value}</span>
                                  <button type="button" onClick={() => updateField(index, { options: options.filter((_, itemIndex) => itemIndex !== optionIndex) })}
                                    className="text-white/35 hover:text-white cursor-pointer" aria-label={`Remove ${option.label}`}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input
                            type="text"
                            value={newOptionLabel[field.id] ?? ''}
                            onChange={(event) => setNewOptionLabel((current) => ({ ...current, [field.id]: event.target.value }))}
                            placeholder="Display label"
                            className={inputBaseClasses}
                          />
                          <input
                            type="text"
                            value={newOptionValue[field.id] ?? ''}
                            onChange={(event) => setNewOptionValue((current) => ({ ...current, [field.id]: event.target.value }))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addOption(index, field);
                              }
                            }}
                            placeholder={apiOptions ? 'Exact G2 value' : 'Order value'}
                            className={inputBaseClasses}
                          />
                          <button
                            type="button"
                            onClick={() => addOption(index, field)}
                            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Add Option"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {apiOptions && <p className="text-[10px] text-amber-200/70">Manual G2 values are not provider-verified. Use the exact G2 value.</p>}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
