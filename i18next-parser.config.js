/**
 * i18next-parser config — extracts t('key', 'English default') calls from the
 * HIVEMIND app pages into public/locales/en/dashboard.json.
 *
 *   • Scope: app pages + sidebar (all use useTranslation('dashboard')).
 *   • Nested keys via '.' separator (matches i18next runtime resolution).
 *   • Captures the 2nd-arg string as the English default value.
 *   • keepRemoved: never delete existing catalog entries (merge-only).
 *
 * Run: npx i18next-parser --config i18next-parser.config.js
 */
module.exports = {
  locales: ['en'],
  defaultNamespace: 'dashboard',
  keySeparator: '.',
  namespaceSeparator: ':',
  keepRemoved: true,
  sort: true,
  createOldCatalogs: false,
  useKeysAsDefaultValue: false,
  input: [
    'src/components/hivemind/app/pages/**/*.{js,jsx}',
    'src/components/hivemind/app/layout/**/*.{js,jsx}',
    'src/components/hivemind/app/shared/**/*.{js,jsx}',
  ],
  output: 'public/locales/$LOCALE/$NAMESPACE.json',
};
