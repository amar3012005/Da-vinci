export function mobileAuthReturn(search) {
  const params = new URLSearchParams(search);
  const value = params.get('mobile_return_to') || params.get('cli_return_to');
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== 'https://api.singulancelabs.com' || url.pathname !== '/auth/mobile/authorize' || url.username || url.password || url.hash) return null;
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(url.searchParams.get('intent') || '')) return null;
    return url.href;
  } catch { return null; }
}
