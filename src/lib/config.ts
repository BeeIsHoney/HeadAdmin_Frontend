// Set MAIN_BACKEND_URL in .env.local or in the hosting environment.
// Local development still works without an environment file.
function backendUrl(value: string | undefined, fallback: string, name: string) {
  const configured = value?.trim() || fallback;
  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash) throw new Error();
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`${name} must be a valid backend base URL without credentials, query parameters or a fragment.`);
  }
}
export const BACKEND_URL = backendUrl(process.env.MAIN_BACKEND_URL, 'http://127.0.0.1:8080', 'MAIN_BACKEND_URL');
export const PANEL = {head:true,role:'HEAD_ADMIN',title:'Head Admin',port:3000} as const;

// Optional explicit links for separately deployed shop panels. No demo URL is preconfigured.
export const SHOP_PANELS:Record<string,string>={};
