// Developer presentation is selected only for the configured issuer's CLI route.
export function trustedDeveloperReturn(search, issuer) {
  try {
    const value = new URLSearchParams(search).get('cli_return_to');
    const u = new URL(value);
    return u.origin === new URL(issuer).origin && u.pathname === '/auth/developer/cli/start' ? u.toString() : null;
  } catch { return null; }
}

