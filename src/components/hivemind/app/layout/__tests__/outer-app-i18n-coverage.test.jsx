/**
 * The outer app surfaces that stayed English under Hindi on 30 Oct 2026 read their copy from the `dashboard` dictionary:
 * the sidebar credit meter and plan label, the Usage and AI Models pages of Account & Settings, the notifications panel,
 * the upload strip and the mobile apps sheet.
 *
 * Every key these components read exists in en, de, fr, es, hi, ja and ar with the same placeholders, plural keys carry the
 * plural forms of each language, counts use Intl.NumberFormat, and the components carry no English literals in JSX.
 * hi, ja and ar (and the de, fr and es entries of this pass) are machine translations that still need native review
 * (see public/locales/machine-translated.json).
 */
import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import CreditBalance from '../../shared/CreditBalance';
import { formatNumber, humanizePlanId, usePlanLabel } from '../sidebar-copy';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const APP = path.join(ROOT, 'src', 'components', 'hivemind', 'app');
const LOCALES = ['en', 'de', 'fr', 'es', 'hi', 'ja', 'ar'];
/** Every language carries all six plural categories so its key set matches English; Arabic and French/Spanish use them, the others repeat the general form. */
const PLURAL_FORMS = Object.fromEntries(['en', 'de', 'fr', 'es', 'hi', 'ja', 'ar'].map(locale => [locale, ['zero', 'one', 'two', 'few', 'many', 'other']]));

/** Component file → dictionary path read by its `tx(...)`, `cr(...)` and `plural(...)` calls. */
const COMPONENTS = {
  'shared/CreditBalance.jsx': 'sidebar.credits',
  'pages/Usage.jsx': 'outerApp.usage',
  'shared/CreditUsageBreakdown.jsx': 'outerApp.usage',
  'shared/WorkspaceAccessCard.jsx': 'outerApp.workspaceAccess',
  'pages/AIModels.jsx': 'outerApp.aiModels',
  'shared/ChatGPTSignInHelp.jsx': 'outerApp.chatgptHelp',
  'shared/ProviderConnectionFrame.jsx': 'outerApp.providerFrame',
  'shared/ProviderModelCatalog.jsx': 'outerApp.catalog',
  'shared/ModelConnectionCard.jsx': 'outerApp.chatgpt',
  'shared/OpenRouterConnectionCard.jsx': 'outerApp.openrouter',
  'shared/CustomModelProviders.jsx': 'outerApp.customProviders',
  'shared/custom-provider-draft.js': 'outerApp.customProviders',
  'layout/GlobalUploadStrip.jsx': 'outerApp.uploadStrip',
  'layout/WorkspaceNotifications.jsx': 'outerApp.notifications',
  'layout/NativeMobileAppsSheet.jsx': 'outerApp.mobileApps',
  'layout/NeedsYouPanel.jsx': 'needsYou',
  'hyperagents/TeamBoard.jsx': 'teamBoard',
  'mobile/LegacyChatSheets.jsx': 'outerApp.mobileApps',
  'shared/ChatModelConnection.jsx': 'chatModelConnection',
};
/** Components that are JSX and must carry no English text; the draft module only returns strings. */
const JSX_COMPONENTS = Object.keys(COMPONENTS).filter(file => file.endsWith('.jsx'));
const SAME_EVERYWHERE = new Set(['OpenRouter', 'ChatGPT', 'HIVEMIND', 'Runtime', 'TARA', 'Gmail']);

const load = locale => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'locales', locale, 'dashboard.json'), 'utf8'));
const flatten = (value, prefix = '') => Object.entries(value).reduce((out, [key, entry]) => (
  entry && typeof entry === 'object' ? { ...out, ...flatten(entry, `${prefix}${key}.`) } : { ...out, [`${prefix}${key}`]: entry }), {});
const dictionaries = Object.fromEntries(LOCALES.map(locale => [locale, flatten(load(locale))]));
const placeholders = text => [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]).sort().join(',');
const read = file => fs.readFileSync(path.join(APP, file), 'utf8');
/** LegacyChatSheets also holds the composer's add sheet, which this pass does not cover; only the apps sheet is scanned. */
const scanned = file => (file === 'mobile/LegacyChatSheets.jsx' ? read(file).slice(read(file).indexOf('export function LegacyMobileAppsSheet')) : read(file));

const QUOTED = '(\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*")';
const unquote = quoted => quoted.slice(1, -1).replace(/\\(.)/g, '$1');
/** Reads `fn('key', 'English'[, 'English other'])` calls; plural calls carry two English forms. */
function usedKeys(source, prefix) {
  const single = new Map();
  const plural = new Map();
  const pattern = new RegExp(`\\b(tx|cr|plural)\\(\\s*'([\\w.]+)'\\s*,\\s*${QUOTED}(?:\\s*,\\s*${QUOTED})?`, 'g');
  for (const [, fn, key, first, second] of source.matchAll(pattern)) {
    if (fn === 'plural') { if (second) plural.set(`${prefix}.${key}`, [unquote(first), unquote(second)]); } else single.set(`${prefix}.${key}`, unquote(first));
  }
  return { single, plural };
}
const collected = Object.entries(COMPONENTS).map(([file, prefix]) => [file, usedKeys(read(file), prefix)]);

/** Keys built at run time from server data; each value lists the suffixes the components can request. */
const DYNAMIC = {
  'outerApp.usage': [...['tokens', 'memories', 'searches', 'graphQueries', 'kbPages', 'deepResearch', 'webIntel', 'taraSeconds', 'hyperAgentRuns', 'connectors', 'users'].flatMap(key => [`metric.${key}.label`, `metric.${key}.sub`]),
    ...['chat_turn', 'composio_tool_call', 'knowledge_page_evidence', 'knowledge_page_both', 'meeting_minute', 'hyperagent_turn'].flatMap(key => [`service.${key}`, `unit.${key}`])],
  'outerApp.workspaceAccess': ['accountType.personal', 'accountType.team', 'accountType.enterprise', 'accountType.enterprise_managed', 'storageMode.hybrid', 'storageMode.managed', 'storageMode.local', 'storageMode.cloud', 'storageMode.self_hosted', 'status.active', 'status.trialing', 'status.past_due', 'status.canceled', 'status.expired', 'status.pending', 'status.paused'],
  'outerApp.customProviders': ['endpoint.endpoint_blocked', 'endpoint.endpoint_redirect', 'endpoint.endpoint_unreachable', 'endpoint.endpoint_status', 'endpoint.endpoint_response_invalid', 'endpoint.endpoint_too_large', 'err.provider_name_taken', 'err.provider_limit_reached', 'err.provider_not_found', 'err.base_url_invalid', 'err.api_key_required', 'err.key_unreadable', 'err.rate_limited', 'err.invalid_request', 'err.request_too_large'],
  'sidebar': ['planLabelGeneric', 'planLabel.enterprise_onboarding'],
};

describe('outer app dictionary coverage', () => {
  test('the components read a meaningful number of keys', () => {
    expect(collected.reduce((total, [, keys]) => total + keys.single.size + keys.plural.size, 0)).toBeGreaterThan(300);
  });

  test.each(LOCALES)('%s has every key the components read, and en matches the default text in the code', locale => {
    const problems = [];
    for (const [file, { single, plural }] of collected) {
      for (const [key, english] of single) {
        const value = dictionaries[locale][key];
        if (typeof value !== 'string' || !value.trim()) problems.push(`${file}: ${key}`);
        else if (locale === 'en' && value !== english) problems.push(`${file}: ${key} default differs from the en dictionary`);
        else if (placeholders(value) !== placeholders(dictionaries.en[key] ?? english)) problems.push(`${file}: ${key} placeholders differ from en`);
      }
      for (const [key, [one, other]] of plural) {
        for (const form of PLURAL_FORMS[locale]) {
          const value = dictionaries[locale][`${key}_${form}`];
          if (typeof value !== 'string' || !value.trim()) problems.push(`${file}: ${key}_${form}`);
          else if (locale === 'en' && value !== (form === 'one' ? one : other)) problems.push(`${file}: ${key}_${form} default differs from the en dictionary`);
          else if (placeholders(value) !== placeholders(one)) problems.push(`${file}: ${key}_${form} placeholders differ from en`);
        }
      }
    }
    for (const [prefix, suffixes] of Object.entries(DYNAMIC)) {
      for (const suffix of suffixes) {
        const value = dictionaries[locale][`${prefix}.${suffix}`];
        if (typeof value !== 'string' || !value.trim()) problems.push(`dynamic: ${prefix}.${suffix}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('hi, ja and ar do not repeat the English text of these surfaces', () => {
    const keys = collected.flatMap(([, { single }]) => [...single.keys()]);
    const repeated = keys
      .filter(key => /[a-z]{4}/.test(dictionaries.en[key]) && !SAME_EVERYWHERE.has(dictionaries.en[key]))
      .flatMap(key => ['hi', 'ja', 'ar'].filter(locale => dictionaries[locale][key] === dictionaries.en[key]).map(locale => `${locale}: ${key}`));
    // Product names, protocol words and URL-only strings read the same in every language.
    expect(repeated.filter(entry => !/(\.nineplus|\.httpStatus|\.unitsTimes|\.creditsPerUnit|\.perSecond|\.title$)/.test(entry))).toEqual([]);
  });

  test('every plural key and the plan labels exist in all seven languages', () => {
    const missing = [];
    for (const locale of LOCALES) {
      for (const key of ['sidebar.planLabelGeneric', 'sidebar.planLabel.enterprise_onboarding']) if (!dictionaries[locale][key]) missing.push(`${locale}: ${key}`);
    }
    expect(missing).toEqual([]);
    expect(dictionaries.hi['sidebar.planLabel.enterprise_onboarding']).toMatch(/प्लान/);
  });
});

describe('Brain empty state', () => {
  test('the Brain hero greeting and tagline exist in all seven languages with the name placeholder', () => {
    for (const locale of LOCALES) {
      for (const key of ['greeting', 'greetingAnon', 'tagline', 'taglineShort', 'composerPlaceholder']) expect(dictionaries[locale][`brainHero.${key}`]).toBeTruthy();
      expect(dictionaries[locale]['brainHero.greeting']).toContain('{{name}}');
    }
    for (const locale of LOCALES.filter(locale => locale !== 'en')) expect(dictionaries[locale]['brainHero.greeting']).not.toBe(dictionaries.en['brainHero.greeting']);
    expect(dictionaries.de['brainHero.composerPlaceholder']).toBe('Nachricht an Brain');
  });
});

describe('outer app components', () => {
  /** Finds JSX text between tags and visible attribute values that are English literals. */
  function englishLiterals(source) {
    const hits = [];
    source.split('\n').forEach((line, index) => {
      const trimmed = line.trim();
      if (/^(\/\/|\*|\/\*|import )/.test(trimmed)) return;
      for (const match of line.matchAll(/>\s*([A-Za-z][^<>{}=;&]*?[A-Za-z.!?…])\s*(?=<|\{)/g)) hits.push([index + 1, match[1]]);
      for (const match of line.matchAll(/\b(aria-label|title|placeholder|alt)="([^"{]*[A-Za-z][^"{]*)"/g)) hits.push([index + 1, match[2]]);
    });
    return hits.filter(([, text]) => !SAME_EVERYWHERE.has(text.trim()) && /\s|^[A-Z][a-z]/.test(text.trim()) && !/^[a-z]+(\.|\()/.test(text.trim()) && !/[()=>|?]/.test(text));
  }

  test.each(JSX_COMPONENTS)('%s has no hardcoded English in JSX', file => {
    expect(englishLiterals(scanned(file))).toEqual([]);
  });

  test('the English-literal scan finds a hardcoded label', () => {
    expect(englishLiterals('<span aria-label="View credit usage">Credits used</span>').map(([, text]) => text).sort()).toEqual(['Credits used', 'View credit usage']);
  });

  test('the credit meter formats numbers with Intl.NumberFormat instead of toLocaleString or string templates', () => {
    const source = read('shared/CreditBalance.jsx');
    expect(source).not.toMatch(/toLocaleString|\}% used|left`/);
    expect(source).toMatch(/useLocaleFormat/);
  });
});

describe('locale-aware numbers and plan labels', () => {
  test('counts use the digits and separators of the language', () => {
    expect(formatNumber('de', 19026)).toBe('19.026');
    expect(formatNumber('en', 19026)).toBe('19,026');
    expect(formatNumber('hi', 19026)).toBe('19,026');
    expect(formatNumber('ar', 19026)).toBe(new Intl.NumberFormat('ar').format(19026));
    expect(formatNumber('de', 0.05, { style: 'percent' })).toMatch(/^5\s?%$/);
    expect(formatNumber('en', 'oops')).toBe('0');
  });

  test('a plan id becomes readable words', () => {
    expect(humanizePlanId('enterprise_onboarding')).toBe('Enterprise Onboarding');
    expect(humanizePlanId('pro')).toBe('Pro');
    expect(humanizePlanId(null)).toBe('');
  });

  async function makeI18n(lng) {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng, fallbackLng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', interpolation: { escapeValue: false },
      resources: Object.fromEntries(LOCALES.map(locale => [locale, { dashboard: load(locale) }])),
    });
    return i18n;
  }

  function Plan({ id }) {
    const label = usePlanLabel();
    return <p data-testid="plan">{label(id)}</p>;
  }

  test('the plan label translates the word "Plan" and formats an unknown plan id', async () => {
    const i18n = await makeI18n('en');
    render(<I18nextProvider i18n={i18n}><Plan id="enterprise_onboarding" /></I18nextProvider>);
    expect(screen.getByTestId('plan').textContent).toBe('Enterprise Onboarding Plan');
    await act(async () => { await i18n.changeLanguage('hi'); });
    expect(screen.getByTestId('plan').textContent).toBe(dictionaries.hi['sidebar.planLabel.enterprise_onboarding']);
    expect(screen.getByTestId('plan').textContent).not.toMatch(/Plan|_/);
    render(<I18nextProvider i18n={i18n}><Plan id="partner_beta" /></I18nextProvider>);
    expect(screen.getAllByTestId('plan')[1].textContent).toBe('Partner Beta प्लान');
    await act(async () => { await i18n.changeLanguage('ar'); });
    expect(screen.getAllByTestId('plan')[1].textContent).toBe('خطة Partner Beta');
  });

  test('the sidebar credit meter and its link label read in Hindi, German and Arabic', async () => {
    const i18n = await makeI18n('hi');
    const credits = { included: 20000, remaining: 19026, percent_used: 5, percent_remaining: 95 };
    const { container } = render(<I18nextProvider i18n={i18n}><MemoryRouter><CreditBalance credits={credits} inline /></MemoryRouter></I18nextProvider>);
    const hindi = container.textContent;
    expect(hindi).not.toMatch(/used|left/i);
    expect(hindi).toContain('उपयोग हुआ');
    expect(container.querySelector('a').getAttribute('aria-label')).toMatch(/क्रेडिट उपयोग देखें/);
    expect(container.querySelector('a').getAttribute('aria-label')).not.toMatch(/View credit usage|remaining/);
    await act(async () => { await i18n.changeLanguage('de'); });
    expect(container.textContent).toContain('19.026/20.000 übrig');
    await act(async () => { await i18n.changeLanguage('ar'); });
    expect(container.textContent).not.toMatch(/used|left/i);
    expect(container.textContent).toContain(new Intl.NumberFormat('ar').format(19026));
  });
});
