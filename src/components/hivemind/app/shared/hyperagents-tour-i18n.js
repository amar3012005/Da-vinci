import i18n from '../../../../i18n';
import locales from './hyperagents-tour-locales.json';
// Register with the same i18next instance as the navbar. No second language state.
for (const [language, strings] of Object.entries(locales)) {
  const cards = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [index, { title: strings[index * 2], body: strings[index * 2 + 1] }]));
  i18n.addResourceBundle(language, 'hyperagentsTour', { cards, statuses: strings.slice(12), replay: strings[2] }, true, true);
}
export const englishTour = locales.en;
