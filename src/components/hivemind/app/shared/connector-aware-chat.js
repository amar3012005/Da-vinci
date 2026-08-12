export const PENDING_CONNECTOR_PROMPT_KEY = 'hm:chat:pending-connector-prompt:v1';

const normalize = (value) => String(value || '').trim().toLocaleLowerCase();

export function toolkitAliases(toolkit) {
  const values = [toolkit?.name, toolkit?.slug, String(toolkit?.slug || '').replace(/[-_]+/g, ' ')];
  return [...new Set(values.map(normalize).filter((value) => value.length >= 2))]
    .sort((a, b) => b.length - a.length);
}

export function findMentionedToolkits(text, toolkits) {
  const haystack = normalize(text);
  if (!haystack) return [];
  return (toolkits || []).filter((toolkit) => toolkitAliases(toolkit).some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(haystack);
  }));
}

export function removeToolkitMentions(text, toolkits) {
  let result = String(text || '');
  (toolkits || []).flatMap(toolkitAliases).sort((a, b) => b.length - a.length).forEach((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'giu'), '$1');
  });
  return result.replace(/\s{2,}/g, ' ').trimStart();
}

export function composeToolkitPrompt(text, toolkits) {
  if (!toolkits?.length) return String(text || '').trim();
  return `Use ${toolkits.map((toolkit) => toolkit.name).join(' and ')}. ${String(text || '').trim()}`.trim();
}

export function buildToolkitSuggestions(toolkits, limit = 4) {
  const connected = (toolkits || []).filter((toolkit) => toolkit.connected);
  const source = connected.length ? connected : (toolkits || []).filter((toolkit) => toolkit.toolsCount > 0);
  return source.slice(0, limit).map((toolkit) => ({
    toolkit,
    prompt: `Use ${toolkit.name} to help me with my latest work`,
    label: toolkit.connected ? `Work with ${toolkit.name}` : `Try ${toolkit.name}`,
  }));
}

export function savePendingConnectorPrompt(value) {
  try { window.sessionStorage.setItem(PENDING_CONNECTOR_PROMPT_KEY, JSON.stringify(value)); } catch { /* private mode */ }
}

export function takePendingConnectorPrompt() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CONNECTOR_PROMPT_KEY);
    window.sessionStorage.removeItem(PENDING_CONNECTOR_PROMPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
