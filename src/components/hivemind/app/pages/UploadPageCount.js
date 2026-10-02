export const TEXT_CHARACTERS_PER_PAGE = 3000;
export const TEXT_PAGE_FORMATS = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'html', 'htm']);

export function textPageEquivalents(text) {
  return Math.max(1, Math.ceil(Array.from(String(text).replace(/^\uFEFF/, '')).length / TEXT_CHARACTERS_PER_PAGE));
}

// Read only ZIP directory names: no inflation or new parser dependencies.
// Invalid/unknown containers fall back to the server-authoritative count.
export async function officePageCount(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) return null;
  const entries = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  let count = 0;
  const ext = file.name.split('.').pop().toLowerCase();
  const pattern = ext === 'pptx' ? /^ppt\/slides\/slide\d+\.xml$/i : /^xl\/worksheets\/sheet\d+\.xml$/i;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) return null;
    const length = view.getUint16(offset + 28, true);
    const next = offset + 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (next > end) return null;
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + length));
    if (pattern.test(name)) count++;
    offset = next;
  }
  return count > 0 ? count : null;
}
