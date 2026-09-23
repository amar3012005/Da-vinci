/** Pure helpers for chat Connect-pause UI. No React. */

export const COMPOSIO_CONNECT_EVENT = 'hivemind:composio-connected';
export const COMPOSIO_CONNECT_CHANNEL = 'hivemind-composio-connect';

export function composioCallbackUrl(origin, toolkit) {
  const url = new URL('/hivemind/app/connect/composio/callback', String(origin || 'https://localhost'));
  if (toolkit) url.searchParams.set('composio_toolkit', toolkit);
  return url.toString();
}

export function parseComposioCallbackSearch(searchParams) {
  const get = (key) => {
    if (searchParams && typeof searchParams.get === 'function') return searchParams.get(key);
    if (searchParams && typeof searchParams === 'object') return searchParams[key] ?? null;
    return null;
  };
  const connectedAccountId = get('connectedAccountId') || get('connected_account_id') || '';
  const status = get('status') || (connectedAccountId ? 'success' : '');
  return {
    type: COMPOSIO_CONNECT_EVENT,
    toolkit: get('composio_toolkit') || get('toolkit') || get('appName') || get('app_name') || '',
    status,
    connectedAccountId,
  };
}

export function isComposioConnectSuccess(payload, toolkit) {
  if (!payload || payload.type !== COMPOSIO_CONNECT_EVENT) return false;
  const got = String(payload.toolkit || '').toLowerCase();
  if (toolkit && got && got !== String(toolkit).toLowerCase()) return false;
  const status = String(payload.status || '').toLowerCase();
  return status === 'success' || status === 'connected' || Boolean(payload.connectedAccountId);
}


export function connectToolkitOf(request = {}, option = {}) {
  return String(request.toolkit || request.provider || option.toolkit || '')
    .trim()
    .toLowerCase();
}

export function isConnectOpenOption(option) {
  if (!option) return false;
  if (option.id === 'connected' || option.id === 'field-input') return false;
  return option.id === 'connect' || option.open_url === true || Boolean(option.href);
}

export function httpConnectUrl(value) {
  const url = String(value || '').trim();
  if (!/^https:\/\//i.test(url)) return null;
  return url;
}

const APP_ALIASES = {
  slack: 'slack',
  gmail: 'gmail',
  github: 'github',
  notion: 'notion',
  linear: 'linear',
  hubspot: 'hubspot',
  sheets: 'googlesheets',
  'google sheets': 'googlesheets',
  googlesheets: 'googlesheets',
};

export function inferConnectContinuation({ text = '', tools = [] } = {}) {
  const toolBlob = (tools || []).map((t) => `${t.name || ''} ${t.result || ''}`).join('\n');
  const blob = `${text}\n${toolBlob}`;
  let toolkit = '';
  try {
    const jsonHit = blob.match(/\{[^{}]*need_connect[^{}]*\}/);
    if (jsonHit) {
      const parsed = JSON.parse(jsonHit[0]);
      if (parsed.need_connect) toolkit = String(parsed.toolkit || parsed.provider || '').toLowerCase();
    }
  } catch { /* not json */ }
  if (!toolkit) {
    const named = blob.match(/connect(?:ed)?\s+(slack|gmail|github|notion|hubspot|linear|google\s*sheets|sheets)/i)
      || blob.match(/\b(slack|gmail|github|notion)\b[^\n]{0,40}(not connected|no grant|authorize|connect)/i);
    if (named) toolkit = String(named[1] || named[0]).toLowerCase();
  }
  toolkit = APP_ALIASES[toolkit.replace(/\s+/g, ' ').trim()] || toolkit.replace(/\s+/g, '');
  if (!toolkit) return null;
  const name = toolkit.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    requests: [{
      kind: 'connect_account',
      toolkit,
      app_label: name,
      prompt: `Connect ${name} to continue, then return here.`,
      options: [
        { id: 'connect', label: `Connect ${name}`, open_url: true },
        { id: 'connected', label: `I've connected ${name} — continue` },
      ],
    }],
  };
}

export function connectBanner(request = {}, logos = {}) {
  const toolkit = connectToolkitOf(request);
  const logo = request.logo_url
    || logos[toolkit]
    || (toolkit ? `https://logos.composio.dev/api/${encodeURIComponent(toolkit)}` : null);
  const name = request.app_label
    || (toolkit ? toolkit.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'this app');
  return { toolkit, logo, name };
}
