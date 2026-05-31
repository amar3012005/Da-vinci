/**
 * Pre-translate public/locales/en/dashboard.json into target languages via the
 * live HIVEMIND /api/translate (Groq) endpoint. Merge-only: keeps any existing
 * translations, fills only missing keys. Preserves {{interpolation}} keys by
 * not re-translating values that are already present.
 *
 * Usage: node scripts/pretranslate-dashboard.mjs de fr es
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = join(__dirname, '..', 'public', 'locales');
const API = process.env.CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050';
const NS = 'dashboard';
const CHUNK = 80;

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('pass target langs, e.g. node pretranslate-dashboard.mjs de fr es');
  process.exit(1);
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function unflatten(flat) {
  const root = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = val;
  }
  return root;
}

async function translateBatch(texts, target) {
  const resp = await fetch(`${API}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.HM_API_KEY ? { Authorization: `Bearer ${process.env.HM_API_KEY}` } : {}),
    },
    body: JSON.stringify({ texts, target_lang: target }),
  });
  if (!resp.ok) throw new Error(`translate ${target} HTTP ${resp.status}`);
  const data = await resp.json();
  const out = Array.isArray(data.translations) ? data.translations : null;
  if (!out || out.length !== texts.length) throw new Error(`translate ${target} bad shape`);
  return out;
}

const enFlat = flatten(JSON.parse(readFileSync(join(LOCALES, 'en', `${NS}.json`), 'utf8')));
const enKeys = Object.keys(enFlat);
console.log(`en/${NS}.json: ${enKeys.length} keys`);

for (const lang of targets) {
  const outPath = join(LOCALES, lang, `${NS}.json`);
  const existing = existsSync(outPath)
    ? flatten(JSON.parse(readFileSync(outPath, 'utf8')))
    : {};
  const missing = enKeys.filter((k) => typeof existing[k] !== 'string' || !existing[k]);
  console.log(`[${lang}] existing=${Object.keys(existing).length} missing=${missing.length}`);
  const merged = { ...existing };
  for (let i = 0; i < missing.length; i += CHUNK) {
    const keys = missing.slice(i, i + CHUNK);
    const texts = keys.map((k) => String(enFlat[k]));
    let tr;
    try {
      // eslint-disable-next-line no-await-in-loop
      tr = await translateBatch(texts, lang);
    } catch (e) {
      console.error(`  chunk ${i}: ${e.message} — falling back to English for this chunk`);
      tr = texts;
    }
    keys.forEach((k, j) => { merged[k] = tr[j] || enFlat[k]; });
    process.stdout.write(`  [${lang}] ${Math.min(i + CHUNK, missing.length)}/${missing.length}\r`);
  }
  // Keep only keys that exist in en (drop stale), nest, write.
  const finalFlat = {};
  for (const k of enKeys) finalFlat[k] = merged[k] ?? enFlat[k];
  writeFileSync(outPath, JSON.stringify(unflatten(finalFlat), null, 2) + '\n', 'utf8');
  console.log(`\n[${lang}] wrote ${outPath} (${enKeys.length} keys)`);
}
console.log('done');
