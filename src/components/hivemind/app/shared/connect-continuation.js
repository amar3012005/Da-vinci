/** Pure helpers for chat Connect-pause UI. No React. */

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

export function connectBanner(request = {}, logos = {}) {
  const toolkit = connectToolkitOf(request);
  const logo = request.logo_url
    || logos[toolkit]
    || (toolkit ? `https://logos.composio.dev/api/${encodeURIComponent(toolkit)}` : null);
  const name = request.app_label
    || (toolkit ? toolkit.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'this app');
  return { toolkit, logo, name };
}
