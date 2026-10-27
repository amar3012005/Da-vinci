// Dependency-free PDF page count — no pdfjs, no worker, no bundle cost.
// Reads the page tree straight from the bytes: prefers the largest /Count
// (the /Pages root aggregates every kid), falls back to counting /Type /Page
// leaf objects. PDF 1.5+ writers (Chrome/Skia "Save as PDF", Word, Quartz)
// pack the page tree into Flate-compressed /ObjStm object streams, so those are
// inflated with the browser's built-in DecompressionStream and scanned too.
// Returns null when the count cannot be determined (unreadable streams, no
// DecompressionStream, encrypted or damaged files); upload admission rejects
// that PDF because the browser cannot enforce the page cap.

const SCAN_CAP = 12 * 1024 * 1024; // page tree/catalog is near the head+tail
const OBJSTM_INFLATE_CAP = 16 * 1024 * 1024; // bound a decompression bomb
const OBJSTM_TOTAL_CAP = 48 * 1024 * 1024;

function latin1(bytes) {
  // latin1 keeps byte values 1:1 so the raw PDF tokens match.
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return s;
}

async function inflate(bytes) {
  if (typeof DecompressionStream !== 'function') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    const reader = stream.getReader();
    const parts = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > OBJSTM_INFLATE_CAP) { await reader.cancel(); return null; }
      parts.push(value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  } catch {
    // Corrupt or truncated Flate data: this stream contributes nothing and the
    // caller falls back to whatever the rest of the file shows.
    return null;
  }
}

// Text of every Flate-compressed /ObjStm stream in the raw PDF text `s`.
async function objectStreamText(bytes, s) {
  const out = [];
  let budget = OBJSTM_TOTAL_CAP;
  const startRe = /stream\r?\n/g;
  let m;
  while (budget > 0 && (m = startRe.exec(s))) {
    if (m.index >= 3 && s.startsWith('end', m.index - 3)) continue; // "endstream"
    const dictStart = Math.max(s.lastIndexOf('obj', m.index), m.index - 2048);
    const dict = s.slice(dictStart, m.index);
    if (!/\/Type\s*\/ObjStm/.test(dict) || !/\/FlateDecode/.test(dict)) continue;
    const dataStart = m.index + m[0].length;
    let dataEnd = s.indexOf('endstream', dataStart);
    if (dataEnd < 0) continue;
    // Flate decoders reject bytes after the zlib trailer: honour a direct
    // /Length, otherwise drop the end-of-line the writer put before "endstream".
    const direct = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
    if (direct && dataStart + Number(direct[1]) <= dataEnd) dataEnd = dataStart + Number(direct[1]);
    else {
      if (s[dataEnd - 1] === '\n') dataEnd -= 1;
      if (s[dataEnd - 1] === '\r') dataEnd -= 1;
    }
    const inflated = await inflate(bytes.subarray(dataStart, dataEnd));
    if (!inflated) continue;
    budget -= inflated.length;
    out.push(latin1(inflated));
  }
  return out.join('\n');
}

/**
 * Page count of a PDF given as bytes.
 * @param {Uint8Array} all Raw PDF bytes.
 * @returns {Promise<number|null>} Page count, or null when it cannot be determined.
 */
export async function countPdfPagesFromBytes(all) {
  try {
    let bytes = all;
    if (all.length > SCAN_CAP) {
      const head = all.subarray(0, 8 * 1024 * 1024);
      const tail = all.subarray(all.length - 4 * 1024 * 1024);
      bytes = new Uint8Array(head.length + tail.length);
      bytes.set(head, 0); bytes.set(tail, head.length);
    }
    let s = latin1(bytes);
    const compressed = await objectStreamText(bytes, s);
    if (compressed) s += `\n${compressed}`;
    // The document total is the largest /Count (the root node aggregates all kids).
    let max = 0; let m;
    const countRe = /\/Count\s+(\d+)/g;
    while ((m = countRe.exec(s))) { const n = Number(m[1]); if (n > max) max = n; }
    if (max > 0) return max;
    // Fallback: count leaf page objects (/Type /Page NOT followed by 's').
    const leaves = (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
    return leaves > 0 ? leaves : null;
  } catch { return null; }
}

/**
 * Page count of a PDF File/Blob.
 * @param {Blob} file PDF file selected for upload.
 * @returns {Promise<number|null>} Page count, or null when it cannot be determined.
 */
export async function countPdfPages(file) {
  try {
    return await countPdfPagesFromBytes(new Uint8Array(await file.arrayBuffer()));
  } catch { return null; }
}
