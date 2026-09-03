/** Pure helpers for chat Connect-pause UI. No React. */

export const COMPOSIO_CONNECT_EVENT = 'hivemind:composio-connected';
export const COMPOSIO_CONNECT_CHANNEL = 'hivemind-composio-connect';

export function composioCallbackUrl(origin, toolkit) {
  const url = new URL('/hivemind/app/connect/composio/callback', String(origin || 'https://localhost'));
  if (toolkit) url.searchParams.set('composio_toolkit', toolkit);
  return url.toString();
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

export function connectBanner(request = {}, logos = {}) {
  const toolkit = connectToolkitOf(request);
  const logo = request.logo_url
    || logos[toolkit]
    || (toolkit ? `https://logos.composio.dev/api/${encodeURIComponent(toolkit)}` : null);
  const name = request.app_label
    || (toolkit ? toolkit.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'this app');
  return { toolkit, logo, name };
}
