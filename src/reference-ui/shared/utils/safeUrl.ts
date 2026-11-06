const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001F\u007F]/;

/**
 * Returns a navigation-safe href for admin-configured links.
 * Allows same-origin relative paths and explicit HTTP(S) URLs only.
 */
export const getSafeNavigationHref = (value: string | undefined | null): string | null => {
  const candidate = value?.trim();
  if (!candidate || CONTROL_OR_BACKSLASH.test(candidate)) return null;

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
};
