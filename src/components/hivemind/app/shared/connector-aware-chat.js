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

export function resolvePromptToolkits(text, selectedToolkits, catalog) {
  const bySlug = new Map();
  [...(selectedToolkits || []), ...findMentionedToolkits(text, catalog)].forEach((toolkit) => {
    if (toolkit?.slug) bySlug.set(toolkit.slug, toolkit);
  });
  return [...bySlug.values()];
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
  const promptBySlug = {
    gmail: 'Find the latest important email that needs my reply',
    slack: 'Summarize the latest important work from Slack',
    notion: 'Find the Notion page most relevant to my current work',
    googledrive: 'Find the latest relevant document in Google Drive',
    'google-drive': 'Find the latest relevant document in Google Drive',
    google_drive: 'Find the latest relevant document in Google Drive',
    googlecalendar: 'Summarize my upcoming calendar and preparation tasks',
    'google-calendar': 'Summarize my upcoming calendar and preparation tasks',
    google_calendar: 'Summarize my upcoming calendar and preparation tasks',
    github: 'Show the latest GitHub work that needs my attention',
    salesforce: 'Summarize the latest customer and pipeline updates',
    hubspot: 'Show the latest HubSpot leads that need follow-up',
  };
  const source = (toolkits || [])
    .filter((toolkit) => toolkit.toolsCount > 0 || toolkit.connected)
    .sort((left, right) => Number(Boolean(right.connected)) - Number(Boolean(left.connected)));
  return source.slice(0, limit).map((toolkit) => ({
    toolkit,
    prompt: promptBySlug[normalize(toolkit.slug)] || `Use ${toolkit.name} to help me with my latest work`,
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
