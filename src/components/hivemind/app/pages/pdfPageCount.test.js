/** @jest-environment node */
import zlib from 'zlib';
import { Blob as NodeBlob } from 'buffer';
import { DecompressionStream as NodeDecompressionStream } from 'stream/web';
import { countPdfPages, countPdfPagesFromBytes } from './pdfPageCount';

// Jest 27's node environment does not expose the browser globals the counter uses.
global.Blob = NodeBlob;
global.DecompressionStream = NodeDecompressionStream;

const enc = (s) => new Uint8Array(Buffer.from(s, 'latin1'));

function classicPdf(pages) {
  const kids = Array.from({ length: pages }, (_, i) => `${3 + i} 0 R`).join(' ');
  const leaves = Array.from({ length: pages }, (_, i) =>
    `${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`).join('');
  return enc(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`
    + `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages} >>\nendobj\n${leaves}trailer\n<< /Root 1 0 R >>\n%%EOF\n`);
}

// PDF 1.5 shape: page tree lives only inside a Flate-compressed /ObjStm.
function objStmPdf(pages, { corrupt = false } = {}) {
  const kids = Array.from({ length: pages }, (_, i) => `${4 + i} 0 R`).join(' ');
  const body = `<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`
    + Array.from({ length: pages }, () => ' << /Type /Page /Parent 3 0 R >>').join('');
  const header = '3 0';
  const data = zlib.deflateSync(Buffer.from(`${header} ${body}`, 'latin1'));
  const payload = corrupt ? Buffer.concat([data.subarray(0, 4), Buffer.alloc(8, 0xff)]) : data;
  const head = Buffer.from(`%PDF-1.5\n2 0 obj\n<< /Type /ObjStm /N 1 /First ${header.length + 1} /Filter /FlateDecode /Length ${payload.length} >>\nstream\n`, 'latin1');
  const tail = Buffer.from('\nendstream\nendobj\n1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n%%EOF\n', 'latin1');
  return new Uint8Array(Buffer.concat([head, payload, tail]));
}

describe('countPdfPages', () => {
  it('counts a classic uncompressed PDF', async () => {
    expect(await countPdfPagesFromBytes(classicPdf(7))).toBe(7);
  });

  it('counts pages hidden in a compressed object stream (PDF 1.5)', async () => {
    expect(await countPdfPagesFromBytes(objStmPdf(14))).toBe(14);
  });

  it('works on a Blob', async () => {
    expect(await countPdfPages(new Blob([objStmPdf(3)]))).toBe(3);
  });

  it('returns null (so upload is rejected) when the stream is unreadable', async () => {
    expect(await countPdfPagesFromBytes(objStmPdf(14, { corrupt: true }))).toBeNull();
  });

  it('returns null for non-PDF bytes', async () => {
    expect(await countPdfPagesFromBytes(enc('hello'))).toBeNull();
  });
});
