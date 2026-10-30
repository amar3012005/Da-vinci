/**
 * Every visible string in the sidebar, dock, account dialog and shell chrome comes from the `dashboard` dictionary in
 * all five interface languages (en, de, hi, ja, ar), and these components carry no English literals in JSX.
 *
 * hi, ja and ar entries are machine translations that still need native review (see public/locales/machine-translated.json).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const LOCALES = ['en', 'de', 'hi', 'ja', 'ar'];
const APP = path.join(ROOT, 'src', 'components', 'hivemind', 'app');
/** Components whose copy is owned by this dictionary. Calendar and OpenDot entry files follow separately. */
const COMPONENTS = [
  'layout/DesktopHyperAgentsNavigation.jsx', 'layout/DesktopBrainNavigation.jsx', 'layout/EmployeeMobileNavigation.jsx',
  'layout/AutonomyDial.jsx', 'layout/CreateEmployeeDialog.jsx', 'layout/OptimisticAppShell.jsx', 'layout/AgentRoomStatus.jsx',
  'layout/WorkspaceModeSwitcher.jsx', 'layout/TeamSwitcher.jsx', 'layout/HyperAgentActivation.jsx', 'layout/AnatomyModeToggle.jsx',
  'layout/TopBar.jsx', 'layout/Sidebar.jsx', 'layout/AppShell.jsx', 'layout/PhoneRoomFrame.jsx', 'shared/AccountSettingsDialog.jsx',
].map(file => path.join(APP, file));
/** Brand names and acronyms that read the same in every language. */
const SAME_EVERYWHERE = new Set(['Runtime', 'HIVEMIND', 'CRM', 'Singulance', 'HyperAgents', 'TARA', 'BRAIN', 'OS', 'VOICE']);

const load = locale => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'locales', locale, 'dashboard.json'), 'utf8'));
const flatten = (value, prefix = '') => Object.entries(value).reduce((out, [key, entry]) => (
  entry && typeof entry === 'object' ? { ...out, ...flatten(entry, `${prefix}${key}.`) } : { ...out, [`${prefix}${key}`]: entry }), {});
const dictionaries = Object.fromEntries(LOCALES.map(locale => [locale, flatten(load(locale))]));
const placeholders = text => [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]).sort().join(',');

/** Keys read by `s('key', 'English')`, `tt('key', 'English')`, `a(...)`, `c(...)` and `t('section.key', ...)` calls. */
function usedKeys(source) {
  const found = new Map();
  const pattern = /\b(tt|s|a|c|t)\(\s*'([\w.]+)'\s*,\s*(?:\{\s*defaultValue:\s*)?('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  for (const [, fn, key, quoted] of source.matchAll(pattern)) {
    const dictionaryKey = fn === 'tt' || fn === 's' ? `sidebar.${key}` : fn === 'a' ? `sidebar.autonomy.${key}` : fn === 'c' ? `sidebar.createEmployeeDialog.${key}` : key;
    if (fn === 't' && !/^(sidebar|topbar|chat|overview)\./.test(key)) continue;
    found.set(dictionaryKey, quoted.slice(1, -1).replace(/\\'/g, "'"));
  }
  return found;
}

describe('sidebar dictionary coverage', () => {
  test.each(LOCALES)('%s has every key the components read', locale => {
    const missing = [];
    for (const file of COMPONENTS) {
      for (const [key, english] of usedKeys(fs.readFileSync(file, 'utf8'))) {
        if (/\$\{/.test(key)) continue;
        if (typeof dictionaries[locale][key] !== 'string' || !dictionaries[locale][key].trim()) missing.push(`${path.basename(file)}: ${key}`);
        else if (locale === 'en' && dictionaries.en[key] !== english) missing.push(`${path.basename(file)}: ${key} default differs from en dictionary`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every English sidebar, topbar, chat and getStarted key exists in all five locales with the same placeholders', () => {
    const sections = /^(sidebar|topbar|chat|overview\.(morning|afternoon|evening))/;
    const problems = [];
    for (const [key, english] of Object.entries(dictionaries.en).filter(([key]) => sections.test(key) || key.startsWith('getStarted.'))) {
      for (const locale of LOCALES.filter(locale => locale !== 'en')) {
        const value = dictionaries[locale][key];
        if (typeof value !== 'string' || !value.trim()) problems.push(`${locale}: missing ${key}`);
        else if (placeholders(value) !== placeholders(english)) problems.push(`${locale}: placeholders differ in ${key}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('hi, ja and ar do not repeat the English text for sidebar copy', () => {
    const repeated = Object.entries(dictionaries.en)
      .filter(([key, english]) => key.startsWith('sidebar.') && /[a-z]{4}/.test(english) && !SAME_EVERYWHERE.has(english))
      .flatMap(([key, english]) => ['hi', 'ja', 'ar'].filter(locale => dictionaries[locale][key] === english).map(locale => `${locale}: ${key}`));
    expect(repeated.filter(entry => !/(subjectHyper|mcps|mcpServer|productOs|runtimeAria)/.test(entry))).toEqual([]);
  });
});

describe('sidebar components', () => {
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

  test.each(COMPONENTS.map(file => [path.relative(APP, file), file]))('%s has no hardcoded English in JSX', (name, file) => {
    expect(englishLiterals(fs.readFileSync(file, 'utf8'))).toEqual([]);
  });

  test('the English-literal scan finds a hardcoded label', () => {
    expect(englishLiterals('<button aria-label="Close panel">Create employee</button>').map(([, text]) => text).sort()).toEqual(['Close panel', 'Create employee']);
  });
});
