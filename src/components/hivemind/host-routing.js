// The public product now lives on Singulance domains. Keep the legacy
// davinciai host accepted during migration, but never make it the redirect
// destination for a public HIVE-MIND route.
const primaryHost = process.env.REACT_APP_HIVEMIND_SITE_HOST || 'next.singulancelabs.com';
const configuredHosts = process.env.REACT_APP_HIVEMIND_SITE_HOSTS || `${primaryHost},hivemind.davinciai.eu`;

export const HIVEMIND_PRIMARY_HOST = primaryHost.trim().toLowerCase();
export const HIVEMIND_SITE_HOSTS = new Set(
  configuredHosts
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

export function isHivemindHostName(hostname) {
  return HIVEMIND_SITE_HOSTS.has(String(hostname || '').trim().toLowerCase());
}
