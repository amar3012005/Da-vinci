const UNIFIED_PRODUCT_HOSTS = new Set([
  'singulancelabs.com',
  'next.singulancelabs.com',
  'next.preview.singulancelabs.com',
  'dev.next.singulancelabs.com',
]);

export function isUnifiedProductHost(hostname = '', configured = process.env.REACT_APP_PRODUCT_HOST) {
  return configured === 'true' || UNIFIED_PRODUCT_HOSTS.has(String(hostname).toLowerCase());
}
