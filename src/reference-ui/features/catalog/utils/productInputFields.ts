import type { ProductInputField, ProductInputOption, ValidationSourceLabel } from '../types/game.types';

const FIELD_ALIASES: Record<string, string> = {
  id: 'playerId',
  uid: 'playerId',
  userid: 'playerId',
  user_id: 'playerId',
  playerid: 'playerId',
  player_id: 'playerId',
  server: 'serverId',
  serverid: 'serverId',
  server_id: 'serverId',
  zone: 'serverId',
  zoneid: 'serverId',
  zone_id: 'serverId',
  charactername: 'charname',
  character_name: 'charname',
  char_name: 'charname',
  charname: 'charname',
  region: 'region',
  regionselect: 'region',
};

const normalizeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');

export const canonicalInputFieldId = (value: string): string => {
  const token = normalizeToken(value);
  const compact = token.replace(/_/g, '');
  return FIELD_ALIASES[token] ?? FIELD_ALIASES[compact] ?? token;
};

const PROVIDER_KEYS: Record<string, string> = {
  playerId: 'player_id', serverId: 'server_id', charname: 'charname', region: 'region',
};

export const inferProductProviderKey = (field: Pick<ProductInputField, 'id' | 'label' | 'providerKey'>): string | undefined => {
  if (field.providerKey?.trim()) return field.providerKey.trim();
  return PROVIDER_KEYS[canonicalInputFieldId(field.id)]
    ?? PROVIDER_KEYS[canonicalInputFieldId(field.label)];
};

export const createCustomInputFieldId = (): string =>
  `custom_${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`).replaceAll('-', '')}`;

export const createDefaultPlayerField = (): ProductInputField => ({
  id: 'playerId',
  providerKey: 'player_id',
  label: 'Player ID',
  type: 'Text Input',
  placeholder: 'Enter Player ID',
  required: true,
});

const normalizeValidationSource = (value?: string): ValidationSourceLabel | undefined => {
  if (value?.toLowerCase() === 'mlbb') return 'MLBB';
  if (value?.toLowerCase() === 'g2') return 'G2';
  if (value?.toLowerCase() === 'smileone') return 'SmileOne';
  if (value?.toLowerCase() === 'lg') return 'LG';
  return undefined;
};

export const normalizeProductInputFields = (
  fields: ProductInputField[],
  includeProviderKey = true,
): ProductInputField[] => {
  const seen = new Set<string>();

  return fields.flatMap((field) => {
    const label = field.label.trim();
    if (!label) return [];

    const providerKey = inferProductProviderKey(field);
    const originalId = field.id.trim();
    const canonical = canonicalInputFieldId(originalId);
    const id = PROVIDER_KEYS[canonical] ? canonical
      : originalId || canonicalInputFieldId(providerKey || label) || createCustomInputFieldId();
    if (seen.has(id)) return [];
    seen.add(id);

    const options: ProductInputOption[] = [];
    const seenOptions = new Set<string>();
    for (const rawOption of field.options ?? []) {
      const option = typeof rawOption === 'string'
        ? { label: rawOption.trim(), value: rawOption.trim() }
        : {
          label: String(rawOption?.label ?? '').trim(),
          value: String(rawOption?.value ?? '').trim(),
        };
      if (!option.label || !option.value) continue;
      const key = `${option.label}\u0000${option.value}`;
      if (seenOptions.has(key)) continue;
      seenOptions.add(key);
      options.push(option);
    }

    const validationKey = includeProviderKey ? field.validationKey?.trim() || undefined : undefined;
    const validationSource = validationKey ? normalizeValidationSource(field.validationSource) : undefined;

    return [{
      id,
      label,
      type: field.type === 'Dropdown' ? 'Dropdown' as const : 'Text Input' as const,
      options: field.type === 'Dropdown' ? options : undefined,
      placeholder: field.placeholder?.trim() || `Enter ${label}`,
      required: field.required !== false,
      providerKey: includeProviderKey ? providerKey : undefined,
      validationKey,
      validationSource,
      optionSource: includeProviderKey && (field.optionSource === 'validation_api' || (field as { optionSource?: string }).optionSource === 'g2_servers')
        ? 'validation_api'
        : 'manual',
    }];
  });
};

export const mergeProductInputFields = (
  current: ProductInputField[],
  incoming: ProductInputField[],
): ProductInputField[] => {
  const normalizedCurrent = normalizeProductInputFields(current);
  const mappingKey = (field: ProductInputField) => canonicalInputFieldId(field.providerKey || field.id);
  const byId = new Map(normalizedCurrent.map((field) => [mappingKey(field), field]));

  normalizeProductInputFields(incoming).forEach((field) => {
    const key = mappingKey(field);
    const existing = byId.get(key);
    byId.set(key, existing ? { ...existing, ...field, id: existing.id } : field);
  });

  return [...byId.values()];
};
