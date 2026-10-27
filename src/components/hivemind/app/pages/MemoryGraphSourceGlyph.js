// Maps a graph node to the file-type or app glyph drawn on its chip in the
// radial atlas. Pure data: the chip texture itself is drawn in MemoryGraph3D.

const FILE_TYPES = {
  pdf: { label: 'PDF', color: '#d9382f' },
  doc: { label: 'DOC', color: '#2b6cd4', exts: ['doc', 'docx', 'rtf', 'odt', 'pages'] },
  sheet: { label: 'XLS', color: '#1f9d62', exts: ['xls', 'xlsx', 'csv', 'tsv', 'numbers', 'ods'] },
  slide: { label: 'PPT', color: '#e0762a', exts: ['ppt', 'pptx', 'key', 'odp'] },
  image: { label: 'IMG', color: '#8957d8', exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'heic', 'svg'] },
  audio: { label: 'AUD', color: '#d4558f', exts: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'mp4', 'mov'] },
  text: { label: 'TXT', color: '#6b7a8c', exts: ['txt', 'md', 'markdown', 'json', 'log'] },
  web: { label: 'WEB', color: '#2878d4', exts: ['html', 'htm'] },
};

const APPS = {
  gmail: { label: 'M', color: '#d9382f' },
  slack: { label: '#', color: '#7a3fa8' },
  drive: { label: 'DR', color: '#1f9d62' },
  notion: { label: 'N', color: '#2b2b2b' },
  github: { label: 'GH', color: '#2b2b2b' },
  calendar: { label: 'CAL', color: '#2878d4' },
  hubspot: { label: 'HS', color: '#e0762a' },
  salesforce: { label: 'SF', color: '#1f8fd6' },
  linear: { label: 'LN', color: '#5b5bd6' },
  mcp: { label: 'MCP', color: '#4a62c8' },
};

const EXT_TO_FILE = Object.entries(FILE_TYPES).reduce((acc, [key, def]) => {
  (def.exts || []).forEach((ext) => { acc[ext] = key; });
  return acc;
}, { pdf: 'pdf' });

function tagValue(tags, prefix) {
  const hit = (tags || []).find((t) => typeof t === 'string' && t.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function extensionOf(name) {
  const match = /\.([a-z0-9]{2,5})$/i.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
}

/**
 * Glyph for a node's chip, or null when the node has no recognizable source
 * (it then stays a plain dot).
 * @param {object} node Graph node (tags, metadata, kind, source platform).
 * @returns {{key: string, kind: 'file'|'app', label: string, color: string, isDocument: boolean}|null}
 */
export function getNodeSourceGlyph(node) {
  if (!node || node.kind === 'entity') return null;
  const tags = Array.isArray(node.tags) ? node.tags : [];
  const meta = node.metadata || node.source_metadata || {};
  const isDocument = node.kind === 'document';

  const filename = tagValue(tags, 'filename:') || meta.filename || node.filename
    || (isDocument ? node.title || node.label : '');
  const fileKey = EXT_TO_FILE[extensionOf(filename)]
    || (/pdf/i.test(String(meta.mime || meta.mimeType || '')) ? 'pdf' : '');
  if (fileKey) {
    const def = FILE_TYPES[fileKey];
    return { key: fileKey, kind: 'file', label: def.label, color: def.color, isDocument };
  }

  const platform = String(
    node.sourcePlatform || node.source_platform || meta.platform || meta.source
    || tagValue(tags, 'platform:') || tagValue(tags, 'source:') || '',
  ).toLowerCase();
  const appKey = Object.keys(APPS).find((key) => platform.includes(key)
    || (key === 'drive' && platform.includes('google-drive')));
  if (appKey) {
    return { key: appKey, kind: 'app', label: APPS[appKey].label, color: APPS[appKey].color, isDocument };
  }

  if (isDocument || platform.includes('knowledge') || platform.includes('document')) {
    return { key: 'file', kind: 'file', label: 'DOC', color: FILE_TYPES.doc.color, isDocument };
  }
  return null;
}

/**
 * Chip opacity for a camera distance. Document hubs stay readable at overview
 * zoom; memory chips fade in as the camera nears the shells.
 * @param {number} distance Camera-to-node distance in graph units.
 * @param {boolean} isDocument Whether the node is a document hub.
 * @returns {number} Opacity in [0, 1].
 */
export function getSourceChipOpacity(distance, isDocument) {
  if (!Number.isFinite(distance)) return 0;
  const [far, near] = isDocument ? [2400, 1400] : [900, 520];
  if (distance >= far) return isDocument ? 0.72 : 0;
  if (distance <= near) return 1;
  const t = (far - distance) / (far - near);
  return isDocument ? 0.72 + 0.28 * t : t;
}

/**
 * Number of memories that belong to each document hub: nodes linked to it by an
 * edge, plus memories whose `filename:` tag names the document.
 * @param {object[]} nodes Graph nodes.
 * @param {object[]} links Graph links; ends may be ids or node objects.
 * @returns {Map<string, number>} Document id to member count (hubs with at least one member).
 */
export function getDocumentMemberCounts(nodes = [], links = []) {
  const docs = new Map();
  const docByFilename = new Map();
  nodes.forEach((node) => {
    if (node?.kind !== 'document') return;
    docs.set(node.id, new Set());
    const name = String(node.title || node.label || '').toLowerCase();
    if (name) docByFilename.set(name, node.id);
  });
  if (!docs.size) return new Map();
  const endId = (end) => (end && typeof end === 'object' ? end.id : end);
  links.forEach((link) => {
    const a = endId(link.source);
    const b = endId(link.target);
    if (docs.has(a) && b !== a) docs.get(a).add(b);
    if (docs.has(b) && a !== b) docs.get(b).add(a);
  });
  nodes.forEach((node) => {
    if (node?.kind === 'document') return;
    const tag = tagValue(node?.tags, 'filename:').toLowerCase();
    const docId = tag ? docByFilename.get(tag) : null;
    if (docId) docs.get(docId).add(node.id);
  });
  const counts = new Map();
  docs.forEach((members, id) => { if (members.size) counts.set(id, members.size); });
  return counts;
}
