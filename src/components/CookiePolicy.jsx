import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from './Seo';
import { openCookiePreferences } from '../privacy/consent';

const rows = [
  ['singulance_cookie_consent_v1', 'SINGULANCE', 'Necessary', 'Stores the consent-policy version and your category choices.', '1 year'],
  ['Authentication session cookies', 'SINGULANCE / authentication provider', 'Necessary', 'Keeps signed-in sessions secure. Only created when you sign in.', 'Session or configured expiry'],
  ['singulance-field', 'SINGULANCE', 'Preferences', 'Remembers the industry experience you explicitly select.', 'Until removed'],
  ['PostHog analytics identifiers', 'PostHog EU Cloud', 'Analytics', 'Measures aggregate product use after consent. Session replay is disabled.', 'Up to 1 year'],
];

export default function CookiePolicy() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-[#fbfbf8] text-[#0a0a0a]">
    <Seo title="Cookie Policy — SINGULANCE" description="The cookies and browser storage used by SINGULANCE, their purpose, provider, category, and duration." canonical="https://singulancelabs.com/cookies" />
    <header className="flex items-center justify-between border-b border-[#e3e0db] px-5 py-4 md:px-10"><button onClick={() => navigate('/')} className="font-['Space_Grotesk'] text-[15px] font-semibold">SINGULANCE</button><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#737373]">HIVEMIND · Operating System</span></header>
    <main className="mx-auto max-w-5xl px-5 py-14 md:px-10 md:py-20">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#117dff]">Legal · Cookie policy</div>
      <h1 className="mt-4 max-w-3xl font-['Space_Grotesk'] text-4xl font-semibold tracking-tight md:text-6xl">Technology should wait for your choice.</h1>
      <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[#525252]">Last updated: August 27, 2026. This policy explains cookies and similar browser storage used on singulancelabs.com and the HIVEMIND web application. Non-essential categories remain disabled until you opt in.</p>
      <button type="button" onClick={openCookiePreferences} className="mt-7 bg-[#117dff] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#0066e0]">Change cookie preferences</button>

      <section className="mt-16"><h2 className="font-['Space_Grotesk'] text-2xl font-semibold">Categories</h2><div className="mt-5 grid gap-px border border-[#e3e0db] bg-[#e3e0db] md:grid-cols-2">{[
        ['Strictly necessary', 'Security, authentication, consent storage, and services you explicitly request. These cannot be disabled.'],
        ['Preferences', 'Optional storage that remembers choices and customizes your experience.'],
        ['Analytics', 'EU-hosted aggregate product measurement. Disabled until accepted; session replay remains disabled.'],
        ['Marketing', 'Advertising and campaign attribution. No marketing tracker is currently installed.'],
      ].map(([title, body]) => <div key={title} className="bg-white p-5"><h3 className="text-[14px] font-semibold">{title}</h3><p className="mt-2 text-[13px] leading-5 text-[#525252]">{body}</p></div>)}</div></section>

      <section className="mt-16"><h2 className="font-['Space_Grotesk'] text-2xl font-semibold">Technology register</h2><div className="mt-5 overflow-x-auto border border-[#e3e0db] bg-white"><table className="w-full min-w-[850px] border-collapse text-left text-[12px]"><thead className="bg-[#faf9f4] text-[10px] uppercase tracking-wider text-[#737373]"><tr>{['Technology', 'Provider', 'Category', 'Purpose', 'Duration'].map((h) => <th key={h} className="border-b border-[#e3e0db] px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-b border-[#eae7e1] last:border-0">{row.map((cell, index) => <td key={cell} className={`px-4 py-4 align-top leading-5 ${index === 0 ? 'font-mono text-[11px]' : 'text-[#525252]'}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>

      <section className="mt-16 grid gap-8 border-t border-[#e3e0db] pt-10 md:grid-cols-2"><div><h2 className="font-['Space_Grotesk'] text-xl font-semibold">Withdrawal and browser controls</h2><p className="mt-3 text-[13px] leading-6 text-[#525252]">Use “Change cookie preferences” at any time. Rejecting analytics stops future capture and clears PostHog persistence available to the browser. You may also delete cookies and local storage in your browser settings.</p></div><div><h2 className="font-['Space_Grotesk'] text-xl font-semibold">Questions</h2><p className="mt-3 text-[13px] leading-6 text-[#525252]">Contact <a className="text-[#117dff]" href="mailto:privacy@singulancelabs.com">privacy@singulancelabs.com</a>. See the <a className="text-[#117dff]" href="/privacy">Privacy Policy</a> for personal-data processing and rights.</p></div></section>
    </main>
  </div>;
}
