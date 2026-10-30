import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';

/** Owner and admin roles may change company-wide settings. */
const canManage = user => user?.role === 'admin' || user?.role === 'owner';

/** Languages Control accepts as a company default, each in its own name so an admin can find theirs in any interface language. */
const NATIVE_NAMES = { en: 'English', de: 'Deutsch', hi: 'हिन्दी', ja: '日本語', ar: 'العربية' };
const FALLBACK = Object.keys(NATIVE_NAMES);

/**
 * The company's default language (owners and admins): the language of team-wide messages such as digests and emails to
 * administrators for a person who has not chosen their own. It reads and writes Control's `default_locale`; each person's own
 * interface language is not changed here.
 */
export default function OrgLanguageSettings() {
  const { t } = useTranslation('dashboard');
  const { user, org } = useAuth();
  const admin = canManage(user);
  const [value, setValue] = useState('');
  const [supported, setSupported] = useState(FALLBACK);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  useEffect(() => {
    if (!admin || !org?.id) return undefined;
    let active = true;
    apiClient.getLanguageSetting(org.id).then(data => {
      if (!active) return;
      setValue(typeof data?.default_locale === 'string' ? data.default_locale : '');
      if (Array.isArray(data?.supported) && data.supported.length) setSupported(data.supported.filter(tag => NATIVE_NAMES[tag]));
    }).catch(() => { /* The control stays at "not set"; saving reports its own failure. */ });
    return () => { active = false; };
  }, [admin, org?.id]);

  const change = useCallback(async event => {
    const wanted = event.target.value;
    if (saving || !org?.id) return;
    const previous = value;
    setValue(wanted); setSaving(true); setMessage({ kind: '', text: '' });
    try {
      const saved = await apiClient.setLanguageSetting(org.id, wanted || null);
      setValue(typeof saved?.default_locale === 'string' ? saved.default_locale : '');
      setMessage({ kind: 'status', text: t('orgLanguage.saved', 'Saved') });
    } catch {
      setValue(previous);
      setMessage({ kind: 'alert', text: t('orgLanguage.saveFailed', 'The language could not be saved. Try again.') });
    } finally { setSaving(false); }
  }, [saving, org?.id, value, t]);

  if (!admin) return null;
  return <section aria-labelledby="org-language-title" data-org-language-settings>
    <h3 id="org-language-title" className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk']">{t('orgLanguage.title', 'Team default language')}</h3>
    <p id="org-language-help" className="text-[#525252] text-sm mt-0.5">{t('orgLanguage.help', 'Used for team-wide messages such as digests and emails to administrators when a person has not chosen their own language. Everyone can still choose a personal language.')}</p>
    <select aria-labelledby="org-language-title" aria-describedby="org-language-help" value={value} disabled={saving} onChange={change}
      className="mt-3 h-10 w-full max-w-xs rounded-lg border border-[#e3e0db] bg-white px-3 text-sm disabled:opacity-60">
      <option value="">{t('orgLanguage.none', 'Not set (English)')}</option>
      {supported.map(tag => <option key={tag} value={tag} lang={tag}>{NATIVE_NAMES[tag]}</option>)}
    </select>
    {message.kind === 'alert' && <p role="alert" className="mt-2 text-sm text-[#c2410c]">{message.text}</p>}
    {message.kind === 'status' && <p role="status" className="mt-2 text-sm text-[#525252]">{message.text}</p>}
  </section>;
}
