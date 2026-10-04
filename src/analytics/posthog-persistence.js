// Shared by the lightweight consent listener and the loaded analytics client.
export function clearLegacyPostHogPersistence() {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith('ph_')).forEach((key) => window.localStorage.removeItem(key));
    document.cookie.split(';').map((part) => part.trim().split('=')[0]).filter((name) => name.startsWith('ph_')).forEach((name) => {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    });
  } catch { /* storage controls can be unavailable in hardened browsers */ }
}
