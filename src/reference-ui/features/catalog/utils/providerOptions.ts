export const PACKAGE_PROVIDER_OPTIONS = [
  'Manual', 'G2B:GCV', 'FZC:GCV', 'LG:GCV',
  'G2B', 'FZC', 'GXL', 'TPN', 'LTB', 'B2', 'SMILEONE', 'LG',
] as const;

export const isApiPackageProvider = (provider: string): boolean =>
  provider !== 'Manual' && (PACKAGE_PROVIDER_OPTIONS as readonly string[]).includes(provider);
