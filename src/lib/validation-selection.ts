export type ValidationProvider = 'MLBB' | 'G2' | 'SMILEONE' | 'LG';

export function validationSelection(value: string) {
  const stored = value.trim();
  if (!stored || stored.length > 100) throw Error('Select a valid API validation category.');
  if (stored.toLowerCase() === 'mlbb') return {provider:'MLBB' as const,code:'mlbb',label:'MLBB',storedCode:'mlbb'};
  const separator = stored.indexOf(':');
  const prefix = separator < 0 ? 'G2' : stored.slice(0, separator).toUpperCase();
  const code = separator < 0 ? stored : stored.slice(separator + 1);
  if (!['G2','SMILEONE','LG'].includes(prefix) || !/^[A-Za-z0-9._~-]+$/.test(code) || code.toLowerCase().startsWith('admin-')) throw Error('Select a supported API validation category.');
  return {provider:prefix as Exclude<ValidationProvider,'MLBB'>,code,label:prefix==='SMILEONE'?'SmileOne':prefix,storedCode:separator<0?code:`${prefix}:${code}`};
}

export function normalizedValidationCode(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw Error('Select a valid API validation category.');
  return validationSelection(value).storedCode;
}
