#!/usr/bin/env node
/**
 * Bulk-translate /public/locales/en/<ns>.json → all supported langs via Groq.
 *
 *   GROQ_API_KEY=... node scripts/translate-locales.mjs           # all langs, all ns
 *   GROQ_API_KEY=... node scripts/translate-locales.mjs --lang=de # one lang
 *   GROQ_API_KEY=... node scripts/translate-locales.mjs --ns=common
 *
 * Keeps keys + interpolation tokens ({{x}}, <0>...</0>) intact. Skips files
 * that already exist unless --force.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOCALES_DIR = path.join(ROOT, 'public', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.HIVEMIND_TRANSLATE_MODEL || 'openai/gpt-oss-120b';

const LANGS = [
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português, European)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'hu', name: 'Hungarian (Magyar)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'no', name: 'Norwegian Bokmål (Norsk)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ar', name: 'Arabic (العربية, MSA)' },
  { code: 'he', name: 'Hebrew (עברית)' },
  { code: 'fa', name: 'Persian (فارسی)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'th', name: 'Thai (ไทย)' },
  { code: 'zh', name: 'Simplified Chinese (简体中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

const FORCE = !!args.force;
const ONLY_LANG = args.lang || null;
const ONLY_NS = args.ns || null;

function pickLangs() {
  if (!ONLY_LANG) return LANGS;
  return LANGS.filter((l) => l.code === ONLY_LANG);
}

async function listNamespaces() {
  const entries = await fs.readdir(EN_DIR);
  return entries.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}

async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY env var required');

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Groq ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '{}';
}

const SYS_PROMPT = (langName) => `You translate JSON UI-string dictionaries from English into ${langName}.

RULES — non-negotiable:
1. PRESERVE every key path. Only translate VALUES.
2. PRESERVE interpolation tokens like {{name}}, {{count}}, <0>…</0>, <strong>…</strong>. Do not translate inside double-brace or angle-bracket markers.
3. Output STRICT JSON only — no preamble, no code fence, no comments. Keys identical to input.
4. Keep brand names verbatim: HIVEMIND, HIVE, Talk to HIVE, ChatGPT, Claude, Gemini, Perplexity, Slack, Gmail, OAuth, MCP, TARA, Da'vinci.
5. Use ${langName} natural register a SaaS product would use — concise, slightly informal, no marketing fluff.
6. Match capitalization conventions of ${langName} (German nouns capitalised; Title-Case English where it sounds wrong becomes Sentence case in most other languages; etc.).
7. Keep ellipses (…) and punctuation style of the source.
8. Acronyms (API, URL, SSO, EU, RTL, MCP) stay verbatim.`;

async function translateFile(nsName, lang) {
  const inPath = path.join(EN_DIR, `${nsName}.json`);
  const outDir = path.join(LOCALES_DIR, lang.code);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${nsName}.json`);

  if (!FORCE) {
    try {
      const stat = await fs.stat(outPath);
      if (stat.size > 0) {
        console.log(`· skip ${lang.code}/${nsName}.json (exists — use --force to overwrite)`);
        return;
      }
    } catch {}
  }

  const source = await fs.readFile(inPath, 'utf-8');
  process.stdout.write(`→ ${lang.code}/${nsName}.json … `);

  const raw = await callGroq([
    { role: 'system', content: SYS_PROMPT(lang.name) },
    { role: 'user', content: source },
  ]);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.log(`FAIL (invalid JSON, ${raw.slice(0, 80)}…)`);
    return;
  }
  await fs.writeFile(outPath, JSON.stringify(parsed, null, 2) + '\n');
  console.log('OK');
}

async function main() {
  const namespaces = ONLY_NS ? [ONLY_NS] : await listNamespaces();
  const langs = pickLangs();
  console.log(`Translating ${namespaces.join(', ')} → ${langs.map((l) => l.code).join(', ')}`);
  for (const lang of langs) {
    for (const ns of namespaces) {
      try {
        await translateFile(ns, lang);
      } catch (e) {
        console.error(`✗ ${lang.code}/${ns}: ${e.message}`);
      }
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
