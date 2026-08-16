import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Target, Users, FileText, Globe, ArrowUpRight,
  Sparkles, LayoutGrid, MessageSquare, RefreshCw, Search,
  MapPin, Mail, Phone, Pencil, X, Power, Check, ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import HyperOnboarding from './HyperOnboarding';
import WebsitePreview from './WebsitePreview';

/**
 * CompanyDashboard — the HyperAgents HERO page (Polsia-style operating view).
 *
 * Three-column dashboard fed by GET /v1/hyper/company (the state the
 * onboarding orchestrator persisted on the HQ room):
 *   col 1 — Company: name, tagline, mission, positioning, website, team
 *   col 2 — Tasks: the planned to-dos; CLICKING a task opens (or creates)
 *           its workroom via POST /v1/hyper/tasks/open → parent drops into
 *           the room thread (chat)
 *   col 3 — Documents (memories filed) + research highlights + agents
 */

// Same class of drift found and fixed in the sibling HqRuntimeConsole.jsx:
// two catch blocks each hand-copied this extraction with subtly different
// optional-chaining. One helper, one behavior.
export const extractErrorMessage = (err, fallback) => err?.response?.data?.error
  || err?.message || fallback;

// The same spinner markup (only size/color literals differ) was copy-pasted
// at two call sites in this file. NOT extracted app-wide (this exact markup
// repeats in 12+ other files too) — that's a real, larger follow-up, out of
// scope for this file's cleanup pass.
export const Spinner = ({ size = 'w-4 h-4', colorClass = 'border-[#117dff]' }) => (
  <span className={`block ${size} border-2 ${colorClass} border-t-transparent rounded-full animate-spin`} />
);

const TAG_STYLES = {
  RESEARCH: 'bg-[#117dff]/10 text-[#117dff]',
  FEATURE: 'bg-orange-500/10 text-orange-600',
  MARKETING: 'bg-violet-500/10 text-violet-700',
  OUTREACH: 'bg-emerald-500/10 text-emerald-700',
  STRATEGY: 'bg-[#0a0a0a]/8 text-[#3f3d39]',
};

const SOCIAL_BRANDS = {
  linkedin: { label: 'LinkedIn', icon: 'logos:linkedin-icon' },
  instagram: { label: 'Instagram', icon: 'skill-icons:instagram' },
  x: { label: 'X', icon: 'fa6-brands:x-twitter' },
  twitter: { label: 'X', icon: 'fa6-brands:x-twitter' },
  facebook: { label: 'Facebook', icon: 'logos:facebook' },
  youtube: { label: 'YouTube', icon: 'logos:youtube-icon' },
  tiktok: { label: 'TikTok', icon: 'logos:tiktok-icon' },
  github: { label: 'GitHub', icon: 'logos:github-icon' },
  threads: { label: 'Threads', icon: 'fa6-brands:threads' },
};

function socialBrand(platform) {
  const key = String(platform || '').trim().toLowerCase();
  return SOCIAL_BRANDS[key] || {
    label: platform || 'Social profile',
    icon: 'material-symbols:public',
  };
}

function socialUsername(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const value = parts.at(-1) || '';
    return value ? `@${value.replace(/^@/, '')}` : '';
  } catch { return ''; }
}

function SectionTitle({ children }) {
  return (
    <div className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] border-b border-[#0a0a0a] pb-1.5 mb-3">
      {children}
    </div>
  );
}

const RUNTIME_FOCUSES = [
  { id: 'seo', label: 'SEO', detail: 'Grow qualified search visibility.' },
  { id: 'social_campaigns', label: 'Social media campaigns', detail: 'Plan, publish, and learn from connected channels.' },
  { id: 'marketing', label: 'Marketing', detail: 'Improve positioning, offers, and demand.' },
  { id: 'outreach', label: 'Outreach', detail: 'Build and operate accountable outreach.' },
  { id: 'clients_revenue', label: 'Getting clients & making money', detail: 'Prioritize pipeline and measurable revenue work.' },
  { id: 'legal_finance', label: 'Legal & finance', detail: 'Track material obligations, risk, and financial work.' },
  { id: 'fundraising', label: 'Fundraising', detail: 'Prepare evidence, narrative, and investor work.' },
];

export default function CompanyDashboard({ onOpenRoom, onShowRoster, onOpenRuntime }) {
  const { t } = useTranslation('dashboard');
  const [state, setState] = useState(null); // {company, employees, hq_room_id}
  const [loading, setLoading] = useState(true);
  const [openingTask, setOpeningTask] = useState(null);
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingContacts, setEditingContacts] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);
  const [contactDraft, setContactDraft] = useState(null);
  const [runtimeInvite, setRuntimeInvite] = useState(null);
  const [runtimeFocuses, setRuntimeFocuses] = useState([]);
  const [runtimeLaunching, setRuntimeLaunching] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const runtimeCompanyReady = Boolean(state?.onboarded && state?.company?.company);
  const runtimeInviteStorageKey = `hm_runtime_invite:${state?.hq_room_id || state?.company?.company || 'company'}`;

  const doRerun = async () => {
    if (resetting) return;
    setResetting(true);
    setRuntimeError('');
    try {
      await apiClient.resetHyperOnboarding();
      try {
        window.localStorage.removeItem('hm_hyper_onboarded');
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('hm_runtime_invite:') || key.startsWith('hm-room-intro-') || key.startsWith('hm-room-setup-'))
          .forEach((key) => window.localStorage.removeItem(key));
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith('hm_hq_runtime_stream:'))
          .forEach((key) => window.sessionStorage.removeItem(key));
      } catch { /* storage can be unavailable */ }
      window.location.href = '/hivemind/app/employees?onboard=1';
    } catch (error) {
      setRuntimeError(extractErrorMessage(error, 'Company reset did not complete. Nothing new was started.'));
      setResetting(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const d = await apiClient.hyperCompany();
      setState(d);
    } catch { setState(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!runtimeCompanyReady) return undefined;
    try { if (window.localStorage.getItem(runtimeInviteStorageKey) === 'seen') return undefined; } catch { /* continue */ }
    const timer = window.setTimeout(() => setRuntimeInvite('intro'), 5000);
    return () => window.clearTimeout(timer);
  }, [runtimeCompanyReady, runtimeInviteStorageKey]);
  useEffect(() => {
    if (!state?.company?.screenshot_pending) return undefined;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      load();
      if (attempts >= 24) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [state?.company?.screenshot_pending, load]);

  const openTask = async (task) => {
    if (openingTask) return;
    setOpeningTask(task.id);
    try {
      const d = await apiClient.openHyperTask(task.id);
      // The control plane creates and dispatches the first turn atomically.
      // Navigation cannot lose the kickoff if this component unmounts.
      if (d?.room?.id) onOpenRoom?.(d.room);
      load(); // refresh task→room links
    } catch { /* stays on dashboard */ }
    finally { setOpeningTask(null); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[12px] text-[#a3a3a3] font-mono">
        {t('hyperDash.loading', 'Loading company…')}
      </div>
    );
  }
  if (!state?.onboarded || !state?.company) {
    // No company state (fresh org, or the HQ room carrying it was deleted) →
    // "Your Company" IS the onboarding page. Render the full genesis flow
    // inline instead of a dead placeholder.
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-6 py-4">
        <div className="max-w-[1280px] mx-auto">
          <HyperOnboarding
            onComplete={(result) => {
              if (result?.room_id) onOpenRoom?.({ id: result.room_id, name: result.room_name });
              load();
            }}
            onSkip={() => load()}
          />
        </div>
      </div>
    );
  }

  const c = state.company;
  const p = c.profile || {};
  const employees = state.employees || [];
  const openContactEditor = () => {
    setContactDraft({
      emails: (p.contact_details?.emails || []).join('\n'),
      phones: (p.contact_details?.phones || []).join('\n'),
      social_profiles: (p.social_profiles || []).map((item) => ({ platform: item.platform || '', url: item.url || '' })),
    });
    setEditingContacts(true);
  };
  const saveContacts = async () => {
    if (!contactDraft || savingContacts) return;
    setSavingContacts(true);
    try {
      const response = await apiClient.updateHyperCompanyContacts({
        emails: contactDraft.emails.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
        phones: contactDraft.phones.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
        social_profiles: contactDraft.social_profiles.filter((item) => item.platform && item.url),
      });
      setState((current) => current ? { ...current, company: response.company } : current);
      setEditingContacts(false);
    } finally { setSavingContacts(false); }
  };
  const closeRuntimeInvite = () => {
    try { window.localStorage.setItem(runtimeInviteStorageKey, 'seen'); } catch { /* noop */ }
    setRuntimeInvite(null);
  };
  const toggleRuntimeFocus = (focus) => {
    setRuntimeFocuses((current) => current.includes(focus)
      ? current.filter((item) => item !== focus)
      : [...current, focus]);
    setRuntimeError('');
  };
  const wakeRuntime = async () => {
    if (!runtimeFocuses.length || runtimeLaunching) {
      if (!runtimeFocuses.length) setRuntimeError('Choose at least one operating focus.');
      return;
    }
    setRuntimeLaunching(true);
    setRuntimeError('');
    const labels = RUNTIME_FOCUSES.filter((item) => runtimeFocuses.includes(item.id)).map((item) => item.label);
    const instruction = `Run this company autonomously with primary focus on ${labels.join(', ')}. Read the current company context, location, baseline, active plans, and connected capabilities first. Build a durable prioritized todo list, execute bounded work through the right Company Rooms and tools, measure outcomes, and adapt without discarding valid prior decisions.`;
    try {
      const result = await apiClient.launchHqRuntime({
        instruction,
        focuses: runtimeFocuses,
        authority_policy: { internal_autonomy: true },
      });
      if (result?.runtime?.id && result?.activation_event?.sequence) {
        const epoch = result.runtime.epoch || result.runtime.activatedAt || result.runtime.createdAt || 'current';
        const key = `hm_hq_runtime_stream:${result.runtime.id}:${epoch}`;
        try {
          window.sessionStorage.setItem(key, JSON.stringify({
            cursor: String(result.activation_event.sequence),
            events: [result.activation_event],
          }));
        } catch { /* persisted SSE hydration remains the fallback */ }
      }
      try { window.localStorage.setItem(runtimeInviteStorageKey, 'seen'); } catch { /* noop */ }
      setRuntimeInvite(null);
      onOpenRuntime?.(result);
    } catch (error) {
      setRuntimeError(extractErrorMessage(error, 'Runtime could not be started.'));
    } finally { setRuntimeLaunching(false); }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
      {runtimeInvite ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#101828]/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Activate Runtime">
          <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex max-h-[calc(100vh-2rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-lg border border-[#cbd8ee] bg-white shadow-[0_28px_90px_rgba(12,38,84,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#dce6f5] bg-[#f5f8ff] px-6 py-5">
              <div className="flex min-w-0 gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#185bcc] text-white"><Power size={19} /></span><div><div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#185bcc]">New · Autonomous company runtime</div><h2 className="mt-1 text-[22px] font-semibold text-[#101828]">Try Runtime</h2><p className="mt-1 max-w-[560px] text-[12px] leading-5 text-[#52627a]">Run your company autonomously. Runtime reads company memory, chooses bounded work, calls skills and tools, delegates to Company Rooms, and wakes again when evidence changes.</p></div></div>
              <button type="button" onClick={closeRuntimeInvite} className="grid h-8 w-8 shrink-0 place-items-center text-[#667085] hover:text-[#101828]" title="Not now"><X size={17} /></button>
            </div>
            {runtimeInvite === 'intro' ? (
              <div className="flex items-center justify-between gap-4 px-6 py-5"><p className="text-[12px] text-[#52627a]">You remain in control. Runtime pauses when access or approval is required.</p><button type="button" onClick={() => setRuntimeInvite('focus')} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#101828] px-5 text-[12px] font-semibold text-white hover:bg-[#185bcc]">RUN <ArrowRight size={14} /></button></div>
            ) : (
              <div className="min-h-0 overflow-y-auto px-6 py-5"><div className="mb-4"><h3 className="text-[15px] font-semibold text-[#101828]">What do you want Runtime to operate?</h3><p className="mt-1 text-[11px] text-[#667085]">Choose one or more priorities. Runtime will order the work from current company evidence.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{RUNTIME_FOCUSES.map((item) => { const selected = runtimeFocuses.includes(item.id); return <button key={item.id} type="button" onClick={() => toggleRuntimeFocus(item.id)} className={`min-h-[92px] rounded-md border p-3 text-left transition-colors ${selected ? 'border-[#185bcc] bg-[#eef4ff]' : 'border-[#d9e1ec] bg-white hover:border-[#9db7df]'}`}><span className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#101828]">{item.label}{selected ? <Check size={14} className="text-[#185bcc]" /> : null}</span><span className="mt-2 block text-[10.5px] leading-4 text-[#667085]">{item.detail}</span></button>; })}</div>{runtimeError ? <p className="mt-3 text-[11px] text-[#c2410c]">{runtimeError}</p> : null}<div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-[#e7ecf3] bg-white pt-4"><button type="button" onClick={() => setRuntimeInvite('intro')} className="text-[11px] font-medium text-[#667085] hover:text-[#101828]">Back</button><button type="button" disabled={runtimeLaunching || !runtimeFocuses.length} onClick={wakeRuntime} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#185bcc] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Power size={14} />{runtimeLaunching ? 'WAKING…' : 'WAKE ME UP'}</button></div></div>
            )}
          </motion.div>
        </div>
      ) : null}
      {/* Header — Polsia's name bar */}
      <div className="px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-start justify-between bg-white z-10 shrink-0">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{c.company}</h1>
          <div className="flex items-center gap-2 mt-1 text-[11.5px] text-[#525252]">
            <span className="flex items-center gap-1 text-[#16a34a]"><span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" /> {t('hyperDash.shipped', 'Operating')}</span>
            {c.website ? (
              <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0a0a0a] font-mono">
                <Globe size={11} /> {c.website.replace(/^https?:\/\//, '')}
              </a>
            ) : null}
            {(p.social_profiles || []).map((social) => {
              const brand = socialBrand(social.platform);
              return (
                <a key={social.url} href={social.url} target="_blank" rel="noreferrer" title={brand.label} className="inline-flex items-center gap-1 hover:text-[#0a0a0a] font-mono">
                  <img src={`https://api.iconify.design/${brand.icon}.svg`} alt={brand.label} className="h-3.5 w-3.5 object-contain" />
                  <span>{socialUsername(social.url) || brand.label}</span>
                </a>
              );
            })}
            {(p.contact_details?.emails || []).slice(0, 1).map((email) => (
              <a key={email} href={`mailto:${email}`} className="hidden xl:inline-flex items-center gap-1 hover:text-[#0a0a0a] font-mono"><Mail size={11} /> {email}</a>
            ))}
            {(p.contact_details?.phones || []).slice(0, 1).map((phone) => (
              <a key={phone} href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:text-[#0a0a0a] font-mono"><Phone size={11} /> {phone}</a>
            ))}
            <button onClick={openContactEditor} title="Edit company contacts and social profiles" className="inline-flex h-5 w-5 items-center justify-center text-[#737373] hover:text-[#0a0a0a]"><Pencil size={12} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onShowRoster}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-white hover:bg-[#faf9f4] transition-colors">
            <LayoutGrid size={12} /> {t('hyperDash.agents', 'Agents')}
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-white hover:bg-[#faf9f4] transition-colors">
            <RefreshCw size={12} /> {t('hyperDash.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {editingContacts && contactDraft ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/25 p-4" role="dialog" aria-modal="true" aria-label="Edit company contacts">
          <div className="w-full max-w-[620px] rounded-lg border border-[#d9dee5] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ece9e3] px-5 py-4">
              <div><h2 className="text-[16px] font-semibold text-[#0a0a0a]">Company contact details</h2><p className="mt-1 text-[11.5px] text-[#737373]">These corrections become the context your rooms use.</p></div>
              <button onClick={() => setEditingContacts(false)} className="h-8 w-8 grid place-items-center text-[#737373] hover:text-[#0a0a0a]" title="Close"><X size={16} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-[11px] font-semibold text-[#525252]">Emails<textarea value={contactDraft.emails} onChange={(event) => setContactDraft({ ...contactDraft, emails: event.target.value })} className="mt-1.5 min-h-16 w-full resize-y rounded-md border border-[#d9dee5] p-2 text-[12px] font-mono text-[#0a0a0a] outline-none focus:border-[#117dff]" placeholder="hello@company.com" /></label>
              <label className="block text-[11px] font-semibold text-[#525252]">Phone numbers<textarea value={contactDraft.phones} onChange={(event) => setContactDraft({ ...contactDraft, phones: event.target.value })} className="mt-1.5 min-h-16 w-full resize-y rounded-md border border-[#d9dee5] p-2 text-[12px] font-mono text-[#0a0a0a] outline-none focus:border-[#117dff]" placeholder="+49 ..." /></label>
              <div><span className="text-[11px] font-semibold text-[#525252]">Social profiles</span><div className="mt-1.5 space-y-2">{contactDraft.social_profiles.map((social, index) => <div key={`${social.platform}-${index}`} className="grid grid-cols-[120px_1fr] gap-2"><input value={social.platform} onChange={(event) => { const next = [...contactDraft.social_profiles]; next[index] = { ...social, platform: event.target.value }; setContactDraft({ ...contactDraft, social_profiles: next }); }} className="rounded-md border border-[#d9dee5] px-2 py-1.5 text-[12px]" placeholder="platform" /><input value={social.url} onChange={(event) => { const next = [...contactDraft.social_profiles]; next[index] = { ...social, url: event.target.value }; setContactDraft({ ...contactDraft, social_profiles: next }); }} className="rounded-md border border-[#d9dee5] px-2 py-1.5 text-[12px] font-mono" placeholder="https://..." /></div>)}</div><button onClick={() => setContactDraft({ ...contactDraft, social_profiles: [...contactDraft.social_profiles, { platform: '', url: '' }] })} className="mt-2 text-[11px] font-semibold text-[#117dff]">Add social profile</button></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ece9e3] px-5 py-3"><button onClick={() => setEditingContacts(false)} className="px-3 py-2 text-[12px] font-semibold text-[#525252]">Cancel</button><button onClick={saveContacts} disabled={savingContacts} className="rounded-md bg-[#0a0a0a] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{savingContacts ? 'Saving...' : 'Save details'}</button></div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-6 py-4 grid grid-cols-1 lg:grid-cols-[minmax(250px,0.92fr)_minmax(340px,1.08fr)_minmax(280px,0.98fr)] gap-6">
        {/* Company context stays complete; the website remains anchored bottom-left. */}
        <section className="min-h-0 flex flex-col">
          <div className="min-h-0 overflow-y-auto pr-2 pb-4">
            <SectionTitle>{t('hyperDash.company', 'Company')}</SectionTitle>
            {p.tagline ? <p className="text-[13px] leading-5 text-[#0a0a0a] font-semibold">{p.tagline}</p> : null}
            {p.what_it_does ? <p className="text-[12.5px] text-[#525252] mt-2 leading-5">{p.what_it_does}</p> : null}

            <div className="mt-5 space-y-4">
              {p.location ? <div><span className="text-[#a3a3a3] font-mono text-[10px] uppercase inline-flex items-center gap-1"><MapPin size={10} /> Company location</span><p className="text-[12px] leading-5 text-[#3f3d39] mt-1">{p.location}</p></div> : null}
              {p.icp ? <div><span className="text-[#a3a3a3] font-mono text-[10px] uppercase">ICP</span><p className="text-[12px] leading-5 text-[#3f3d39] mt-1">{p.icp}</p></div> : null}
              {p.positioning ? <div><span className="text-[#a3a3a3] font-mono text-[10px] uppercase">Positioning</span><p className="text-[12px] leading-5 text-[#3f3d39] mt-1">{p.positioning}</p></div> : null}
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#a3a3a3] uppercase mb-2"><Target size={11} /> {t('hyperDash.mission', 'Mission')}</div>
              <p className="text-[12.5px] text-[#0a0a0a] leading-5">{c.mission}</p>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#a3a3a3] uppercase mb-2"><Users size={11} /> {t('hyperDash.team', 'Team')}</div>
              <div className="space-y-2">
                {employees.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center gap-2 text-[12px] min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">{(member.name || '?')[0]}</span>
                    <span className="text-[#0a0a0a] font-medium shrink-0">{member.name}</span>
                    {member.roleArchetype ? <span className="text-[#a3a3a3] text-[11px] truncate">{member.roleArchetype}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {c.website ? (
            <div className="shrink-0 pt-3 border-t border-[#ece9e3] bg-white">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#a3a3a3] uppercase mb-2"><Globe size={11} /> {t('hyperDash.website', 'Website')}</div>
              <WebsitePreview
                image={c.screenshot}
                source={c.website_visual_source}
                website={c.website}
                company={c.company}
                tagline={p.tagline}
                loading={Boolean(c.screenshot_pending)}
                compact
                className="h-[180px] 2xl:h-[250px]"
              />
            </div>
          ) : null}
        </section>

        {/* One substantive task per expertise room; cards route directly into that room. */}
        <section className="min-h-0 flex flex-col">
          <div className="shrink-0"><SectionTitle>{t('hyperDash.tasks', 'Tasks')}</SectionTitle></div>
          <div className="min-h-0 overflow-y-auto pr-2 space-y-2.5">
            {(c.tasks || []).map((task) => {
              const taskActive = task.status === 'active' || Boolean(task.room_id);
              const taskDone = task.status === 'done';
              return (
                <motion.button
                  key={task.id}
                  data-company-task="true"
                  title={`${task.title}${task.detail ? `\n\n${task.detail}` : ''}${task.deliverable ? `\n\nOutput: ${task.deliverable}` : ''}`}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => openTask(task)}
                  className={`w-full min-h-[118px] text-left border rounded-lg px-4 py-3 transition-colors group ${taskActive ? 'bg-[#faf9f4] border-[#d8d3cc]' : 'bg-white border-[#e3e0db] hover:border-[#0a0a0a]'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] leading-5 font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{task.title}</h3>
                      {task.detail ? <p className="mt-1 text-[11.5px] leading-[17px] text-[#625d57] line-clamp-2">{task.detail}</p> : null}
                      {task.deliverable ? <p className="mt-1.5 text-[10.5px] leading-4 text-[#77716a] truncate"><span className="font-semibold text-[#3f3d39]">Output:</span> {task.deliverable}</p> : null}
                    </div>
                    <span className="shrink-0 mt-0.5">
                      {openingTask === task.id
                        ? <Spinner />
                        : taskActive
                          ? <MessageSquare size={14} className="text-[#117dff]" />
                          : <ArrowUpRight size={14} className="text-[#a3a3a3] group-hover:text-[#0a0a0a]" />}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`text-[9px] font-mono uppercase px-2 py-1 rounded ${TAG_STYLES[task.tag] || TAG_STYLES.RESEARCH}`}>{task.room_name || task.room_tag || task.tag}</span>
                    {taskDone ? <span className="text-[9px] font-mono uppercase px-2 py-1 rounded bg-[#16a34a] text-white">Done</span> : null}
                    {!taskDone && taskActive ? <span className="text-[9px] font-mono uppercase px-2 py-1 rounded bg-[#117dff]/10 text-[#117dff]">In room</span> : null}
                  </div>
                </motion.button>
              );
            })}
            {(c.tasks || []).length === 0 ? (
              <p className="text-[11.5px] text-[#a3a3a3]">{t('hyperDash.noTasks', 'No planned tasks — re-run onboarding or create a room manually.')}</p>
            ) : null}
          </div>
        </section>

        {/* Durable company memory, completed room outputs, evidence, and HQ. */}
        <section className="min-h-0 flex flex-col pr-2">
          <div className="shrink-0">
            <SectionTitle>{t('hyperDash.documents', 'Documents')}</SectionTitle>
            <div className="space-y-2">
            {(c.documents || []).map((documentTitle) => (
              <div key={documentTitle} className="flex items-center gap-2 text-[12px] text-[#3f3d39]">
                <FileText size={12} className="text-[#a3a3a3] shrink-0" /> {documentTitle}
              </div>
            ))}
            </div>
            <p className="text-[10.5px] text-[#a3a3a3] mt-2 font-mono leading-4">{t('hyperDash.filedTo', 'Filed to HIVEMIND memory — agents recall these before acting.')}</p>
          </div>

          {(c.deliverables || []).length > 0 ? (
            <div className="mt-5 shrink-0">
              <SectionTitle>{t('hyperDash.deliverables', 'Deliverables')}</SectionTitle>
              <div className="space-y-2">
                {(c.deliverables || []).map((deliverable) => (
                  <button key={deliverable.room_id}
                    onClick={() => onOpenRoom?.({ id: deliverable.room_id, name: deliverable.title })}
                    className="w-full flex items-center gap-2 text-[12px] text-[#0a0a0a] hover:text-[#117dff] text-left group">
                    <MessageSquare size={12} className="text-[#16a34a] shrink-0" />
                    <span className="group-hover:underline min-w-0 flex-1">{deliverable.title}</span>
                    <span className="text-[9.5px] font-mono text-[#a3a3a3] shrink-0">{deliverable.sealed_at ? new Date(deliverable.sealed_at).toLocaleDateString() : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

            {(c.research || []).length > 0 ? (
            <div className="mt-5 min-h-0 flex-1 flex flex-col">
              <div className="shrink-0"><SectionTitle>{t('hyperDash.research', 'Market research')}</SectionTitle></div>
              <div className="min-h-0 overflow-y-auto pr-2 space-y-3">
                {(c.research || []).slice(0, 8).map((researchItem, index) => (
                  <a key={`${researchItem.url || 'research'}-${index}`} href={researchItem.url} target="_blank" rel="noreferrer" className="block group">
                    <div className="flex items-start gap-2">
                      <Search size={11} className="text-[#a3a3a3] mt-1 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[12px] text-[#0a0a0a] font-medium group-hover:underline leading-4">{researchItem.title || researchItem.url}</span>
                        {researchItem.snippet ? <p className="text-[11px] text-[#a3a3a3] leading-[17px] mt-0.5 line-clamp-3">{researchItem.snippet}</p> : null}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            ) : null}

          <div className="mt-5 shrink-0">
            <SectionTitle>{t('hyperDash.hq', 'HQ')}</SectionTitle>
            <button
              onClick={() => state.hq_room_id && onOpenRoom?.({ id: c.room_id || state.hq_room_id, name: c.room_name })}
              className="w-full flex items-center justify-between border border-[#e3e0db] hover:border-[#0a0a0a] rounded-lg px-4 py-3 bg-white transition-colors group"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
                <Sparkles size={13} className="text-violet-500" /> {c.room_name || `${c.company} — HQ`}
              </span>
              <ArrowUpRight size={13} className="text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
            </button>
          </div>

          <div className="mt-4 shrink-0 flex flex-col items-start gap-1 text-[10.5px] font-mono pb-2">
            <span className="inline-flex items-center gap-2 text-[#a3a3a3]"><Building2 size={11} /> {t('hyperDash.onboardedAt', 'Onboarded')} {c.onboarded_at ? new Date(c.onboarded_at).toLocaleDateString() : ''}</span>
            <button onClick={() => setConfirmRerun(true)} className="text-[#117dff] hover:underline">{t('hyperDash.rerun', 'Re-run onboarding')}</button>
          </div>
        </section>
      </div>

      {confirmRerun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !resetting && setConfirmRerun(false)}>
          <div className="bg-white border border-[#e3e0db] rounded-2xl max-w-[440px] w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('hyperDash.rerunTitle', 'Start fresh?')}</h3>
            <p className="text-[13px] text-[#525252] mt-2 leading-relaxed">
              {t('hyperDash.rerunBody', 'Re-running onboarding clears your current company profile, mission, tasks, research and homepage capture, and lets you set it up from scratch.')}
            </p>
            <p className="text-[12.5px] text-[#0a0a0a] mt-2 leading-relaxed">
              {t('hyperDash.rerunRooms', 'Your existing rooms stay — including any task rooms. Delete each one manually from the rooms rail if you want a clean slate.')}
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setConfirmRerun(false)} disabled={resetting}
                className="text-[12.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] px-3.5 py-2 rounded-lg">
                {t('hyperDash.cancel', 'Cancel')}
              </button>
              <button onClick={doRerun} disabled={resetting}
                className="flex items-center gap-2 text-[12.5px] font-semibold text-white bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 px-3.5 py-2 rounded-lg">
                {resetting ? <Spinner size="w-3.5 h-3.5" colorClass="border-white" /> : null}
                {t('hyperDash.rerunConfirm', 'Clear & start fresh')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
