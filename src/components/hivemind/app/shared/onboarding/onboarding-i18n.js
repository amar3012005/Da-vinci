import i18n from '../../../../../i18n';
import locales from './onboarding-locales.json';

/**
 * Registers the walkthrough copy as the `onboarding` namespace on the shared i18next instance. The copy ships in the bundle,
 * so the first paint is already in the person's language (no runtime machine translation for these steps).
 */
for (const [language, strings] of Object.entries(locales)) i18n.addResourceBundle(language, 'onboarding', strings, true, true);

/** Languages with reviewed-or-first-pass walkthrough copy; others read English. */
export const ONBOARDING_LANGUAGES = Object.freeze(Object.keys(locales));
