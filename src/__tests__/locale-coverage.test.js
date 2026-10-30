/**
 * Dictionary coverage floor for the wave A-C locales. A new key in English must arrive in these locales in the same change, so the
 * runtime machine-translate fallback never shows English first in them. Machine-translated locales are listed in
 * public/locales/machine-translated.json until a native speaker has reviewed them.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../../public/locales');
const NAMESPACES = ['common', 'dashboard', 'landing'];
/** Share of English keys each locale must carry, per namespace. */
const FLOOR = { de: 0.99, fr: 0.98, es: 0.98, hi: 1, ja: 1, ar: 1 };

const read = (locale, namespace) => JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, `${namespace}.json`), 'utf8'));
const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => (item && typeof item === 'object' ? flatten(item, `${prefix}${key}.`) : [[`${prefix}${key}`, item]]));
const placeholders = (text) => (String(text).match(/\{\{[^}]+\}\}|<\/?\d+>|<\/?[a-z]+>/gi) || []).sort().join('|');

describe.each(Object.keys(FLOOR))('locale %s', (locale) => {
  test.each(NAMESPACES)('%s covers its floor of English keys', (namespace) => {
    const english = new Map(flatten(read('en', namespace)));
    const have = new Map(flatten(read(locale, namespace)));
    const missing = [...english.keys()].filter((key) => !have.has(key));
    const share = 1 - missing.length / english.size;
    expect({ share: Number(share.toFixed(4)), missing: missing.slice(0, 5) }).toEqual({ share: expect.any(Number), missing: expect.any(Array) });
    expect(share).toBeGreaterThanOrEqual(FLOOR[locale]);
  });

  test.each(NAMESPACES)('%s keeps the placeholders and tags of the English text', (namespace) => {
    const english = new Map(flatten(read('en', namespace)));
    const mismatched = flatten(read(locale, namespace)).filter(([key, text]) => english.has(key) && typeof text === 'string' && placeholders(text) !== placeholders(english.get(key))).map(([key]) => key);
    expect(mismatched).toEqual([]);
  });
});

test.each(['hi', 'ja', 'ar'])('%s dashboard has no keys that English lacks', (locale) => {
  const english = new Set(flatten(read('en', 'dashboard')).map(([key]) => key));
  expect(flatten(read(locale, 'dashboard')).map(([key]) => key).filter((key) => !english.has(key))).toEqual([]);
});

test('machine-translated locales are listed for native review', () => {
  const record = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'machine-translated.json'), 'utf8'));
  expect(Object.keys(record.locales).sort()).toEqual(['ar', 'hi', 'ja']);
  for (const locale of Object.keys(record.locales)) expect(record.locales[locale].dashboard.machineTranslatedKeys).toBeGreaterThan(1000);
});

test('right-to-left languages are marked so the document direction follows the language', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../i18n.js'), 'utf8');
  for (const code of ['ar', 'he', 'fa']) expect(source).toMatch(new RegExp(`code: '${code}'[^\\n]*rtl: true`));
  expect(source).toMatch(/setAttribute\('dir', dir\)/);
});
