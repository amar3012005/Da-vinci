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
const FORM_SUFFIX = /_(zero|one|two|few|many|other)$/;
const ARABIC_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
/** English strings whose `{{plural}}`/`{{suffix}}` appends an English "s"; Arabic spells its own plural forms and has no suffix to fill. */
const ENGLISH_SUFFIX_KEYS = new Set(['knowledgebase.uploadingWarning', 'memories.searchResultCount']);
const arabicSuffixException = (locale, key) => locale === 'ar' && ENGLISH_SUFFIX_KEYS.has(key.replace(FORM_SUFFIX, ''));

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
    const mismatched = flatten(read(locale, namespace)).filter(([key, text]) => english.has(key) && typeof text === 'string' && placeholders(text) !== placeholders(english.get(key)) && !arabicSuffixException(locale, key)).map(([key]) => key);
    expect(mismatched).toEqual([]);
  });
});

test.each(['hi', 'ja', 'ar'])('%s dashboard has no keys that English lacks', (locale) => {
  const english = new Set(flatten(read('en', 'dashboard')).map(([key]) => key));
  // Arabic has six plural categories; English has one and other, so the other four are Arabic-only keys of a counted English string.
  const arabicOnly = (key) => locale === 'ar' && FORM_SUFFIX.test(key) && english.has(`${key.replace(FORM_SUFFIX, '')}_one`);
  expect(flatten(read(locale, 'dashboard')).map(([key]) => key).filter((key) => !english.has(key) && !arabicOnly(key))).toEqual([]);
});

const FOLDERS = fs.readdirSync(LOCALES_DIR).filter((name) => fs.statSync(path.join(LOCALES_DIR, name)).isDirectory());
const RECORD = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'machine-translated.json'), 'utf8'));

test('machine-translated locales are listed for native review', () => {
  // Every language folder except en has no native review sign-off, so each is listed; a language leaves this file only with that sign-off.
  expect(Object.keys(RECORD.locales).sort()).toEqual(FOLDERS.filter((name) => name !== 'en').sort());
  for (const locale of ['hi', 'ja', 'ar']) expect(RECORD.locales[locale].dashboard.machineTranslatedKeys).toBeGreaterThan(1000);
});

describe('completeness gates', () => {
  /** Keys a locale lacks and keys whose placeholders differ from English. */
  function parityProblems(englishEntries, candidateEntries, locale = 'xx') {
    const candidate = new Map(candidateEntries);
    const problems = [];
    for (const [key, text] of englishEntries) {
      const value = candidate.get(key);
      // An empty value is a real translation for an English plural-suffix slot such as "s", not for a sentence.
      if (typeof value !== 'string' || (!value.trim() && String(text).trim().length > 2)) problems.push(`${locale}: missing ${key}`);
      else if (placeholders(value) !== placeholders(text) && !arabicSuffixException(locale, key)) problems.push(`${locale}: placeholders differ in ${key}`);
    }
    return problems;
  }
  /** Counted strings of an Arabic dictionary that lack one of the six plural categories or change a placeholder. */
  function arabicPluralProblems(englishEntries, arabicEntries) {
    const english = new Map(englishEntries);
    const arabic = new Map(arabicEntries);
    const bases = new Set([...english.keys(), ...arabic.keys()].filter((key) => FORM_SUFFIX.test(key)).map((key) => key.replace(FORM_SUFFIX, '')));
    const problems = [];
    for (const base of bases) {
      for (const form of ARABIC_FORMS) {
        const value = arabic.get(`${base}_${form}`);
        const reference = english.get(`${base}_${form}`) ?? english.get(`${base}_other`);
        if (typeof value !== 'string' || !value.trim()) problems.push(`ar: ${base}_${form} missing`);
        else if (reference !== undefined && placeholders(value) !== placeholders(reference) && !ENGLISH_SUFFIX_KEYS.has(base)) problems.push(`ar: ${base}_${form} placeholders differ from en`);
      }
    }
    return problems;
  }

  test('a Reviewed locale (one not listed as machine-translated) lacks no key and changes no placeholder', () => {
    const reviewed = FOLDERS.filter((name) => name !== 'en' && !RECORD.locales[name]);
    const problems = reviewed.flatMap((locale) => NAMESPACES.flatMap((namespace) => parityProblems(flatten(read('en', namespace)), flatten(read(locale, namespace)), locale)));
    expect(problems).toEqual([]);
  });

  test('the parity check fails a locale that lacks a key or changes a placeholder', () => {
    const english = [['a.b', 'Hello {{name}}'], ['a.c', 'Bye']];
    expect(parityProblems(english, [['a.b', 'Hallo {{name}}'], ['a.c', 'Tschüss']], 'de')).toEqual([]);
    expect(parityProblems(english, [['a.b', 'Hallo {{who}}']], 'de')).toEqual(['de: placeholders differ in a.b', 'de: missing a.c']);
  });

  test('Arabic has zero, one, two, few, many and other for every counted string in every namespace', () => {
    expect(NAMESPACES.flatMap((namespace) => arabicPluralProblems(flatten(read('en', namespace)), flatten(read('ar', namespace))))).toEqual([]);
  });

  test('the plural check fails an Arabic group that mirrors English (one and other only) or drops a placeholder', () => {
    const english = [['x.count_one', '{{count}} item'], ['x.count_other', '{{count}} items']];
    const mirrored = [['x.count_one', '{{count}} عنصر'], ['x.count_other', '{{count}} عناصر']];
    expect(arabicPluralProblems(english, mirrored)).toEqual(['ar: x.count_zero missing', 'ar: x.count_two missing', 'ar: x.count_few missing', 'ar: x.count_many missing']);
    const complete = [...mirrored, ['x.count_zero', '{{count}} عنصر'], ['x.count_two', 'عنصران'], ['x.count_few', '{{count}} عناصر'], ['x.count_many', '{{count}} عنصرًا']];
    expect(arabicPluralProblems(english, complete)).toEqual(['ar: x.count_two placeholders differ from en']);
  });

  test('de, fr and es lose no more dashboard keys than they lack today', () => {
    const known = { de: 12, fr: 30, es: 30 };
    for (const [locale, limit] of Object.entries(known)) {
      const missing = parityProblems(flatten(read('en', 'dashboard')), flatten(read(locale, 'dashboard')), locale).filter((entry) => entry.includes('missing'));
      expect(missing.length).toBeLessThanOrEqual(limit);
    }
  });

  test('the Beta list the choosers read is exactly the languages listed in machine-translated.json', () => {
    const { MACHINE_TRANSLATED_LOCALES, isBetaLocale } = require('../locale-status');
    expect([...MACHINE_TRANSLATED_LOCALES].sort()).toEqual(Object.keys(RECORD.locales).sort());
    expect(isBetaLocale('ar')).toBe(true);
    expect(isBetaLocale('ar-SA')).toBe(true);
    expect(isBetaLocale('en')).toBe(false);
  });

  test('every language the choosers offer except English carries the Beta tag', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../i18n.js'), 'utf8');
    const { isBetaLocale } = require('../locale-status');
    const offered = [...source.matchAll(/\{ code: '([a-z]+)'/g)].map((match) => match[1]);
    expect(offered).toContain('ar');
    expect(offered.filter((code) => code !== 'en' && !isBetaLocale(code))).toEqual([]);
  });

  test('the Beta label and its hint exist in every fully shipped language and Arabic translates them', () => {
    const common = Object.fromEntries(['en', 'de', 'fr', 'es', 'hi', 'ja', 'ar'].map((locale) => [locale, read(locale, 'common')]));
    for (const entries of Object.values(common)) { expect(entries.beta).toBeTruthy(); expect(entries.betaHint).toBeTruthy(); }
    expect(common.ar.beta).not.toBe(common.en.beta);
  });
});

test('right-to-left languages are marked so the document direction follows the language', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../i18n.js'), 'utf8');
  for (const code of ['ar', 'he', 'fa']) expect(source).toMatch(new RegExp(`code: '${code}'[^\\n]*rtl: true`));
  expect(source).toMatch(/setAttribute\('dir', dir\)/);
});
