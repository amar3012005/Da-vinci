/**
 * Escaping and URL filtering shared by the dependency-free Markdown renderers
 * (`DeepResearch.jsx` `renderMarkdown`, `WebStudio.jsx` `mdToHtml`). Their
 * output reaches `dangerouslySetInnerHTML` and `document.write`, so every
 * value they interpolate must pass through these helpers.
 */

const HTML_ESCAPES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Escapes text for an HTML text node or a quoted attribute value.
 * @param {unknown} value Text to escape; nullish becomes the empty string.
 * @returns {string} Text with `&`, `<`, `>`, `"` and `'` replaced by entities.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Reverses `escapeHtml` for a value captured from already-escaped Markdown.
 * @param {string} value Escaped text.
 * @returns {string} The original text.
 */
export function unescapeHtml(value) {
  return String(value ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"})[name]);
}

/**
 * Returns an attribute-safe absolute URL when its scheme is `http:`, `https:`
 * or `mailto:`, and `null` for every other scheme, relative URL or parse error.
 * @param {string} raw Unescaped URL text.
 * @returns {string | null} The escaped, normalized URL, or `null` when it must be dropped.
 */
export function safeUrl(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    // Relative or malformed URLs have no allowed scheme; the caller drops them.
    return null;
  }
  return SAFE_URL_PROTOCOLS.has(parsed.protocol) ? escapeHtml(parsed.href) : null;
}

/**
 * Renders a link whose label and URL were captured from escaped Markdown.
 * A URL with a disallowed scheme renders as its plain label.
 * @param {string} escapedLabel Label text that is already HTML-escaped.
 * @param {string} escapedUrl URL text that is already HTML-escaped.
 * @param {string} attributes Fixed, trusted attribute text appended to the anchor.
 * @returns {string} An anchor element, or the label alone.
 */
export function renderSafeLink(escapedLabel, escapedUrl, attributes = '') {
  const href = safeUrl(unescapeHtml(escapedUrl));
  if (!href) return escapedLabel;
  return `<a href="${href}"${attributes ? ` ${attributes}` : ''}>${escapedLabel}</a>`;
}
