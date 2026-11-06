export const PROVIDER_COLOR_MAP: Readonly<Record<string, string>> = {
  'G2B:GCV': '#eab308',
  G2B: '#eab308',
  'FZC:GCV': '#a855f7',
  'LG:GCV': '#ec4899',
  LG: '#ec4899',
  FZC: '#a855f7',
  GXL: '#f97316',
  TPN: '#3b82f6',
  LTB: 'color-mix(in srgb, #eab308 40%, #6b7280 60%)',
  B2: '#22c55e',
  SMILEONE: '#ff0000',
};

const normalizeProviderName = (name: string): string =>
  name
    .replace(/\s+Balance$/i, '')
    .replace(/^Provider\s+/i, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

export const providerColor = (name: string, fallback = '#6b7280'): string => {
  const normalized = normalizeProviderName(name);

  if (['G2', 'G2B', 'G2BULK', 'G2:GCV', 'G2B:GCV'].includes(normalized)) {
    return PROVIDER_COLOR_MAP.G2B;
  }

  if (['FZC', 'FZR', 'FAZERCARDS', 'FZC:GCV'].includes(normalized)) {
    return PROVIDER_COLOR_MAP.FZC;
  }

  if (['LG', 'LG:GCV', 'LIOGAMES'].includes(normalized)) return PROVIDER_COLOR_MAP.LG;
  if (normalized === 'GXL') return PROVIDER_COLOR_MAP.GXL;
  if (normalized === 'TPN') return PROVIDER_COLOR_MAP.TPN;
  if (normalized === 'LTB') return PROVIDER_COLOR_MAP.LTB;
  if (normalized === 'B2') return PROVIDER_COLOR_MAP.B2;
  if (normalized === 'SMILEONE' || normalized === 'SMILE1') return PROVIDER_COLOR_MAP.SMILEONE;

  return fallback;
};
