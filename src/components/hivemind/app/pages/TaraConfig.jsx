import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  Save,
  Play,
  Clock,
  MessageSquare,
  Zap,
  Brain,
  CheckCircle,
  Loader2,
  Sliders,
  Plus,
  X,
  Trash2,
  Lock,
  Check,
  Shield,
  Briefcase,
  Headphones,
  Calendar,
  FolderOpen,
  Phone,
  PhoneOff,
  PhoneCall,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import AaasVoiceWidget from '../../AaasVoiceWidget';

// Same-core-host derivation as AaasVoiceWidget — residency-correct, no per-host bake.
const _CORE_HTTP = (process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050').replace(/\/$/, '');
const _AAAS_WS = process.env.REACT_APP_AAAS_WS || `${_CORE_HTTP.replace(/^http/, 'ws')}/aaas/voice`;
const AAAS_HTTP = _AAAS_WS.replace(/^wss?:\/\//, 'https://').replace(/\/voice$/, '');
// tara-deepgram engine (Deepgram Voice Agent + Telnyx) — routed under the same core host.
const DG_HTTP = (process.env.REACT_APP_TARA_DG_HTTP || `${_CORE_HTTP}/voice2`).replace(/\/$/, '');

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};


// ─── Main Page ──────────────────────────────────────────────────────────────

// ─── Skills Manager ───────────────────────────────────────────────────────
// Two sections (External / Internal). Each is a horizontal stack of selectable
// skill cards. Click a card → popup with its prompt(s) (external = primary +
// secondary; internal = single). "+" creates a skill. Checkbox selects one per
// section; "Save selection" finalises (copies the skill's prompts into config).

// Pick a lucide icon per skill (by kind + name heuristic).
function skillIcon(skill) {
  if (skill.kind === 'internal') return Brain;
  const n = (skill.name || '').toLowerCase();
  if (n.includes('sales')) return Briefcase;
  if (n.includes('support') || n.includes('customer')) return Headphones;
  if (n.includes('book') || n.includes('schedul')) return Calendar;
  return FolderOpen;
}

// Compact "file folder" card — wide + short, with a folder tab on top.
function SkillCard({ skill, selected, onOpen, onToggle }) {
  const isInternal = skill.kind === 'internal';
  const chars = (skill.primary_prompt || '').length + (skill.secondary_prompt || '').length;
  const accent = isInternal ? '#117dff' : '#117dff';
  const tabBg = isInternal ? '#f3ecff' : '#eef5ff';
  const Icon = skillIcon(skill);
  return (
    <div onClick={onOpen} className="relative shrink-0 w-[330px] cursor-pointer">
      {/* Folder tab */}
      <div
        className="absolute -top-[6px] left-5 h-[7px] w-16 rounded-t-[6px] border-x border-t border-[#e3e0db]"
        style={{ background: tabBg }}
      />
      {/* Folder body — single compact row */}
      <div className={`relative flex items-center gap-3 rounded-xl rounded-tl-[6px] border border-[#e3e0db] px-3.5 py-3 transition-all hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] ${
        selected ? 'bg-[#fbfcff]' : 'bg-white'}`}>
        {/* Glassmorphism icon tile */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md ring-1 ring-white/70 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.6)]"
          style={{ background: isInternal
            ? 'linear-gradient(135deg, rgba(243,236,255,0.9), rgba(221,214,254,0.55))'
            : 'linear-gradient(135deg, rgba(238,245,255,0.9), rgba(219,234,254,0.55))' }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[#0a0a0a] text-[14px] font-bold font-['Space_Grotesk'] leading-tight truncate">{skill.name}</p>
            {skill.builtin && <Lock size={10} className="text-[#a3a3a3] shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: accent }}>
              <Shield size={10} /> {isInternal ? 'Internal' : 'External'}
            </span>
            <span className="text-[#d4d0ca]">·</span>
            <span className="text-[#a3a3a3] tabular-nums">{chars.toLocaleString()} chars</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
            selected ? 'bg-[#117dff] border-[#117dff]' : 'border-[#d4d0ca] hover:border-[#117dff]'}`}
          aria-label="select skill"
        >
          {selected && <Check size={13} className="text-white" />}
        </button>
      </div>
    </div>
  );
}

function SkillSection({ title, hint, kind, skills, selectedId, onSelect, onOpen, onAdd }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-[#0a0a0a] text-[13px] font-bold font-['Space_Grotesk'] uppercase tracking-wide">{title}</h4>
        <span className="text-[11px] text-[#a3a3a3]">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-2 pb-1">
        {skills.map((s) => (
          <SkillCard key={s.id} skill={s} selected={selectedId === s.id}
            onOpen={() => onOpen(s)} onToggle={() => onSelect(s.id)} />
        ))}
        <button onClick={() => onAdd(kind)}
          className="shrink-0 w-[330px] rounded-xl border border-dashed border-[#d4d0ca] flex items-center justify-center gap-1.5 text-[#a3a3a3] hover:border-[#117dff] hover:text-[#117dff] hover:bg-[#fafbff] transition-colors self-stretch min-h-[66px]">
          <Plus size={16} /><span className="text-[12px] font-medium">New skill</span>
        </button>
      </div>
    </div>
  );
}

function SkillModal({ skill, kind, onClose, onCreated, onUpdated, onDeleted }) {
  const isCreate = !skill;
  const isInternal = (skill?.kind || kind) === 'internal';
  const readOnly = !!skill?.builtin;
  const [name, setName] = useState(skill?.name || '');
  const [primary, setPrimary] = useState(skill?.primary_prompt || '');
  const [secondary, setSecondary] = useState(skill?.secondary_prompt || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (isCreate) {
        await apiClient.createTaraSkill({ kind, name, primary_prompt: primary, secondary_prompt: isInternal ? null : secondary });
        onCreated();
      } else {
        await apiClient.updateTaraSkill(skill.id, { name, primary_prompt: primary, secondary_prompt: isInternal ? null : secondary });
        onUpdated();
      }
    } catch (e) { setErr(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    setBusy(true);
    try { await apiClient.deleteTaraSkill(skill.id); onDeleted(); }
    catch (e) { setErr(e?.response?.data?.message || e.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[#e3e0db] shadow-xl w-full max-w-[640px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f1ec] sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252]">{isInternal ? 'Internal' : 'External'}</span>
            <h3 className="text-[#0a0a0a] text-[15px] font-bold font-['Space_Grotesk']">{isCreate ? 'New skill' : skill.name}{readOnly && <Lock size={12} className="inline ml-1.5 text-[#a3a3a3]" />}</h3>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly}
              placeholder="e.g. Sales Agent"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[14px] focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] flex justify-between"><span>{isInternal ? 'Prompt (voice of HIVEMIND)' : 'Primary prompt (persona)'}</span><span className="tabular-nums">{primary.length.toLocaleString()} chars</span></label>
            <textarea value={primary} onChange={(e) => setPrimary(e.target.value)} disabled={readOnly} rows={8}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[13px] font-mono leading-relaxed focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
          </div>
          {!isInternal && (
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] flex justify-between"><span>Secondary prompt (clinical / reasoning)</span><span className="tabular-nums">{secondary.length.toLocaleString()} chars</span></label>
              <textarea value={secondary} onChange={(e) => setSecondary(e.target.value)} disabled={readOnly} rows={6}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[13px] font-mono leading-relaxed focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
            </div>
          )}
          {err && <p className="text-red-500 text-[12px]">{err}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#f3f1ec] sticky bottom-0 bg-white">
          {!isCreate && !readOnly
            ? <button onClick={del} disabled={busy} className="flex items-center gap-1.5 text-red-500 text-[13px] hover:text-red-600"><Trash2 size={14} /> Delete</button>
            : <span />}
          {!readOnly && (
            <button onClick={submit} disabled={busy || !name || !primary}
              className="flex items-center gap-1.5 bg-[#117dff] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0e6ae0] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isCreate ? 'Create' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillsManager() {
  const [data, setData] = useState({ skills: [], selected: { external_skill_id: null, internal_skill_id: null } });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { skill } | { create: kind }
  const [pending, setPending] = useState({ external: null, internal: null });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = () => {
    setLoading(true);
    return apiClient.listTaraSkills()
      .then((d) => {
        const sel = d?.selected || {};
        setData({ skills: d?.skills || [], selected: sel });
        setPending({ external: sel.external_skill_id || null, internal: sel.internal_skill_id || null });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const external = data.skills.filter((s) => s.kind === 'external');
  const internal = data.skills.filter((s) => s.kind === 'internal');
  const dirty = pending.external !== data.selected.external_skill_id || pending.internal !== data.selected.internal_skill_id;

  const saveSelection = async () => {
    setSaving(true);
    try {
      if (pending.external && pending.external !== data.selected.external_skill_id) await apiClient.selectTaraSkill(pending.external);
      if (pending.internal && pending.internal !== data.selected.internal_skill_id) await apiClient.selectTaraSkill(pending.internal);
      await load();
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500);
    } catch { /* surfaced by reload */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 size={20} className="text-[#117dff] animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Top bar — title + Save selection (top-right) */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[#0a0a0a] text-[15px] font-bold font-['Space_Grotesk']">Skills</h3>
          <p className="text-[#a3a3a3] text-[12px]">Pick the active persona per side, then save to finalise.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedFlash && <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold"><CheckCircle size={14} /> Saved</span>}
          {dirty && !savedFlash && <span className="text-[11px] text-[#a3a3a3]">Unsaved selection</span>}
          <button onClick={saveSelection} disabled={!dirty || saving}
            className="flex items-center gap-1.5 bg-[#117dff] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0e6ae0] disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save selection
          </button>
        </div>
      </div>

      <SkillSection title="External" hint="Customer-facing personas (primary + secondary prompt)"
        kind="external" skills={external} selectedId={pending.external}
        onSelect={(id) => setPending((p) => ({ ...p, external: p.external === id ? null : id }))}
        onOpen={(s) => setModal({ skill: s })} onAdd={(kind) => setModal({ create: kind })} />

      <SkillSection title="Internal" hint="Voice of HIVEMIND — full-recall, internal use"
        kind="internal" skills={internal} selectedId={pending.internal}
        onSelect={(id) => setPending((p) => ({ ...p, internal: p.internal === id ? null : id }))}
        onOpen={(s) => setModal({ skill: s })} onAdd={(kind) => setModal({ create: kind })} />

      {modal && (
        <SkillModal
          skill={modal.skill || null}
          kind={modal.create || modal.skill?.kind}
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); load(); }}
          onUpdated={() => { setModal(null); load(); }}
          onDeleted={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Outbound Call Panel ───────────────────────────────────────────────────
const STATE_COLOR = { dialing: '#d97706', connected: '#16a34a', ended: '#a3a3a3', error: '#dc2626' };

const OUTBOUND_LANGS = [
  ['en', 'English'], ['de', 'German'], ['es', 'Spanish'],
  ['fr', 'French'], ['it', 'Italian'], ['ja', 'Japanese'], ['nl', 'Dutch'],
];

function OutboundPanel({ identity, onSwitchTab, language = 'en' }) {
  const [phone, setPhone] = useState('');
  const [engine, setEngine] = useState('deepgram'); // 'deepgram' (Voice Agent) | 'classic' (aaas)
  const [callLang, setCallLang] = useState((language || 'en').split('-')[0]); // per-call language
  const [goal, setGoal] = useState('');
  const apiBase = engine === 'deepgram' ? DG_HTTP : AAAS_HTTP;
  const [callState, setCallState] = useState(null); // null|'dialing'|'connected'|'ended'|'error'
  const [callLegId, setCallLegId] = useState(null);
  const [err, setErr] = useState(null);
  const pollRef = useRef(null);

  const phoneValid = /^\+[1-9]\d{7,14}$/.test(phone.trim());

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => stopPoll, [stopPoll]);

  useEffect(() => {
    if (!callLegId || !callState || callState === 'ended' || callState === 'error') return;
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${apiBase}/calls/outbound/${callLegId}/status`);
        if (!r.ok) return;
        const d = await r.json();
        setCallState(d.status);
        if (d.status === 'ended' || d.status === 'error') stopPoll();
      } catch { /* network hiccup */ }
    }, 2000);
    return stopPoll;
  }, [callLegId, callState, stopPoll, apiBase]);

  const startCall = async () => {
    if (!phoneValid) return;
    setErr(null);
    setCallState('dialing');
    try {
      const r = await fetch(`${apiBase}/calls/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone.trim(),
          session_id: `out-${Date.now()}`,
          user_id: identity?.userId,
          org_id: identity?.orgId,
          company: identity?.orgName || undefined,
          language: callLang,
          goal: goal.trim() || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `HTTP ${r.status}`); }
      const d = await r.json();
      setCallLegId(d.call_leg_id);
    } catch (e) {
      setCallState('error');
      setErr(e.message);
    }
  };

  const hangup = async () => {
    if (!callLegId) return;
    try { await fetch(`${apiBase}/calls/outbound/${callLegId}/hangup`, { method: 'POST' }); } catch { /* ignore */ }
    setCallState('ended');
    stopPoll();
  };

  const reset = () => { stopPoll(); setCallState(null); setCallLegId(null); setErr(null); };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 flex items-start gap-2">
        <Shield size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[12px] text-amber-700">
          Requires <span className="font-mono">TARA_OUTBOUND_ENABLED=true</span> + Telnyx configured.
          Numbers must be in <span className="font-mono">TELNYX_ALLOWED_NUMBERS</span>. AI disclosure plays automatically at call open (EU AI Act Art 50).
        </p>
      </div>

      {!callState && (
        <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Voice engine</label>
            <div className="flex gap-2">
              {[['deepgram', 'Deepgram Agent'], ['classic', 'Classic (AaaS)']].map(([id, label]) => (
                <button key={id} onClick={() => setEngine(id)}
                  className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium border transition-colors ${
                    engine === id ? 'bg-[#117dff] text-white border-[#117dff]' : 'bg-white text-[#525252] border-[#e3e0db] hover:border-[#117dff]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Destination (E.164)</label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+49123456789"
                className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[14px] font-mono focus:outline-none focus:border-[#117dff] transition-colors"
              />
              {phone && !phoneValid && <p className="text-[11px] text-red-500 mt-1">Use E.164 format: +country_code + number</p>}
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Language</label>
              <select
                value={callLang} onChange={(e) => setCallLang(e.target.value)}
                className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-[#117dff] transition-colors"
              >
                {OUTBOUND_LANGS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Goal (optional)</label>
            <input
              type="text" value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. collect feedback on the Solvis portal"
              className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#117dff] transition-colors"
            />
          </div>
          <button
            onClick={startCall} disabled={!phoneValid}
            className="flex items-center gap-2 px-4 py-2 bg-[#117dff] text-white rounded-[6px] text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0e6de0] transition-colors"
          >
            <Phone size={14} /> Start Outbound Call
          </button>
        </div>
      )}

      {callState && (
        <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {callState === 'dialing' && <Loader2 size={15} className="text-amber-600 animate-spin" />}
              {callState === 'connected' && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {(callState === 'ended' || callState === 'error') && <span className="inline-block w-2 h-2 rounded-full bg-[#d4d0ca]" />}
              <span className="text-[13px] font-['Space_Grotesk'] font-semibold" style={{ color: STATE_COLOR[callState] }}>
                {callState === 'dialing' ? `Dialing ${phone}…` : callState === 'connected' ? `Connected · ${phone}` : callState === 'error' ? 'Call failed' : 'Call ended'}
              </span>
            </div>
            {callState === 'connected' && (
              <button onClick={hangup} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-[6px] text-[12px] font-medium hover:bg-red-100 transition-colors">
                <PhoneOff size={13} /> End Call
              </button>
            )}
          </div>
          {err && <p className="text-[12px] text-red-500">{err}</p>}
          {callLegId && <p className="text-[10px] font-mono text-[#c8c4be]">leg {callLegId}</p>}
          {(callState === 'ended' || callState === 'error') && (
            <div className="flex items-center gap-3 pt-0.5">
              <button onClick={reset} className="text-[12px] text-[#117dff] hover:underline">New call</button>
              {callState === 'ended' && (
                <button onClick={() => onSwitchTab('history')} className="text-[12px] text-[#a3a3a3] hover:text-[#525252]">
                  View transcript in Call History &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Campaign Panel — mass outbound via tara-deepgram engine ─────────────────
function CampaignPanel({ identity, language = 'en' }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [contactsRaw, setContactsRaw] = useState('');
  const [parallel, setParallel] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [detail, setDetail] = useState(null);
  const pollRef = useRef(null);

  // One contact per line: "+491701234567, Max Mustermann" (name optional)
  const contacts = contactsRaw.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [phone, ...rest] = l.split(',');
    return { phone: phone.trim(), name: rest.join(',').trim() || null, language };
  });
  const valid = name.trim() && contacts.length > 0 && contacts.every((c) => /^\+[1-9]\d{7,14}$/.test(c.phone));

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${DG_HTTP}/campaigns`);
      if (r.ok) setCampaigns((await r.json()).campaigns || []);
    } catch { /* service may be off */ }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 4000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const launch = async () => {
    if (!valid) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${DG_HTTP}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), goal: goal.trim() || null, contacts,
          parallel: Number(parallel) || 1, language,
          user_id: identity?.userId, org_id: identity?.orgId,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `HTTP ${r.status}`); }
      setName(''); setGoal(''); setContactsRaw('');
      refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const openDetail = async (id) => {
    try {
      const r = await fetch(`${DG_HTTP}/campaigns/${id}`);
      if (r.ok) setDetail(await r.json());
    } catch { /* ignore */ }
  };

  const stopCampaign = async (id) => {
    try { await fetch(`${DG_HTTP}/campaigns/${id}/stop`, { method: 'POST' }); refresh(); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 flex items-start gap-2">
        <Shield size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[12px] text-amber-700">
          Every dial passes the <span className="font-mono">TELNYX_ALLOWED_NUMBERS</span> allowlist — non-listed numbers are skipped, never called.
          AI disclosure plays at every call open. Parallelism capped server-side.
        </p>
      </div>

      <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Campaign name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Solvis feedback wave 1"
              className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#117dff]" />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Parallel calls</label>
            <input type="number" min="1" max="10" value={parallel} onChange={(e) => setParallel(e.target.value)}
              className="w-24 border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-[#117dff]" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">Goal (one line)</label>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Collect product feedback on the Solvis portal"
            className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#117dff]" />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5">
            Contacts — one per line: +E164, name (optional)
          </label>
          <textarea value={contactsRaw} onChange={(e) => setContactsRaw(e.target.value)} rows={5}
            placeholder={'+491701234567, Max Mustermann\n+491709876543'}
            className="w-full border border-[#e3e0db] rounded-[6px] px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-[#117dff]" />
          {contactsRaw && !valid && <p className="text-[11px] text-red-500 mt-1">Check campaign name + E.164 numbers</p>}
        </div>
        <button onClick={launch} disabled={!valid || busy}
          className="flex items-center gap-2 px-4 py-2 bg-[#117dff] text-white rounded-[6px] text-[13px] font-medium disabled:opacity-40 hover:bg-[#0e6de0] transition-colors">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />} Launch campaign
        </button>
        {err && <p className="text-[12px] text-red-500">{err}</p>}
      </div>

      {campaigns.length > 0 && (
        <div className="bg-white border border-[#e3e0db] rounded-[10px] divide-y divide-[#f0ede8]">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <button onClick={() => openDetail(c.id)} className="text-left">
                <p className="text-[13px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{c.name}</p>
                <p className="text-[11px] text-[#a3a3a3] font-mono">{c.done}/{c.total} done · {c.status}</p>
              </button>
              {c.status === 'running' && (
                <button onClick={() => stopCampaign(c.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-[6px] text-[12px] font-medium hover:bg-red-100">
                  Stop
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#e3e0db] shadow-xl w-full max-w-[560px] max-h-[80vh] overflow-y-auto p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold font-['Space_Grotesk']">{detail.name}</h3>
              <button onClick={() => setDetail(null)}><X size={16} className="text-[#a3a3a3]" /></button>
            </div>
            <div className="space-y-1.5">
              {(detail.contacts || []).map((ct, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] border border-[#f0ede8] rounded-[6px] px-3 py-2">
                  <span className="font-mono">{ct.phone}{ct.name ? ` · ${ct.name}` : ''}</span>
                  <span className="font-medium" style={{ color: STATE_COLOR[ct.state] || '#a3a3a3' }}>
                    {ct.state}{ct.skip_reason ? ` — ${ct.skip_reason.slice(0, 60)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function TaraConfig() {
  const { t, i18n } = useTranslation('dashboard');

  // Identity for the self-hosted AaaS voice widget (tenant = user_id).
  const [identity, setIdentity] = useState({ userId: null, orgId: null });
  const [activeTab, setActiveTab] = useState('skills');
  const [calls, setCalls] = useState([]);
  const [callDetail, setCallDetail] = useState(null); // { call, turns, insight }

  const refreshCalls = () => apiClient.listTaraCalls(30).then(setCalls).catch(() => {});
  useEffect(() => { refreshCalls(); }, []);

  const openCall = (id) => apiClient.getTaraCall(id).then(setCallDetail).catch(() => {});

  // Aggregates for stat cards + usage tab
  const now = Date.now();
  const _validTs = (d) => { const ts = new Date(d).getTime(); return Number.isNaN(ts) ? null : ts; };
  const weekCount = calls.filter((c) => { const ts = _validTs(c.startedAt); return ts !== null && now - ts < 7 * 864e5; }).length;
  const totalTurns = calls.reduce((a, c) => a + (c.turnCount || 0), 0);
  const totalTokens = calls.reduce((a, c) => a + (c.promptTokens || 0) + (c.completionTokens || 0), 0);
  const lastCall = (calls[0] && _validTs(calls[0].startedAt) !== null) ? new Date(calls[0].startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  useEffect(() => {
    apiClient.bootstrap()
      .then((d) => setIdentity({ userId: d?.user?.id || null, orgId: d?.organization?.id || null, orgName: d?.organization?.name || null }))
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="max-w-[1200px] mx-auto space-y-6"
    >
      {/* Header — eyebrow + big title + subtitle (Workspace-Admin style) */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[#a3a3a3] mb-1">
            <Mic size={12} className="text-[#117dff]" /> HIVEMIND
          </div>
          <h1 className="text-[#0a0a0a] text-3xl font-bold font-['Space_Grotesk'] leading-tight">TARA × HIVEMIND</h1>
          <p className="text-[#737373] text-[14px] mt-1">{t('taraconfig.subtitle', 'Voice agent conversational runtime — real-time STT, recall-grounded answers, TTS.')}</p>
        </div>
      </motion.div>

      {/* Talk to TARA — self-hosted AaaS (STT→tara_stream→TTS, one service).
          The ONE Start. Voice/lang config + current-turn chat live inside. */}
      <motion.div variants={fadeUp}>
        <AaasVoiceWidget userId={identity.userId} orgId={identity.orgId} language={(i18n.language || 'en').split('-')[0]} />
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Play, label: 'Total Calls', value: String(calls.length), color: '#117dff' },
          { icon: Clock, label: 'This Week', value: String(weekCount), color: '#117dff' },
          { icon: MessageSquare, label: 'Turns', value: String(totalTurns), color: '#16a34a' },
          { icon: Zap, label: 'Tokens', value: totalTokens.toLocaleString(), color: '#117dff' },
          { icon: Clock, label: 'Last Call', value: lastCall, color: '#a3a3a3' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <s.icon size={15} style={{ color: s.color }} />
            <p className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tabular-nums mt-2">{s.value}</p>
            <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-1 border-b border-[#e3e0db] mb-4">
          {[
            { id: 'skills', label: 'Skills', icon: Sliders },
            { id: 'history', label: 'Call History', icon: Clock },
            { id: 'insights', label: 'Insights', icon: Brain },
            { id: 'usage', label: 'Usage', icon: Zap },
            { id: 'outbound', label: 'Outbound', icon: PhoneCall },
            { id: 'campaigns', label: 'Campaigns', icon: Zap },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id ? 'border-[#117dff] text-[#0a0a0a]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'skills' && <SkillsManager />}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-end"><button onClick={refreshCalls} className="text-[11px] text-[#117dff] hover:underline">Refresh</button></div>
            {calls.length === 0 ? (
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center text-[13px] text-[#a3a3a3]">
                <Clock size={20} className="mx-auto mb-2 text-[#d4d0ca]" /> No calls yet.
              </div>
            ) : calls.map((c) => (
              <div key={c.id} className="bg-white border border-[#e3e0db] rounded-xl">
                <button onClick={() => (callDetail?.call?.id === c.id ? setCallDetail(null) : openCall(c.id))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#faf9f4] transition-colors text-left">
                  <div>
                    <span className="text-[13px] font-['Space_Grotesk'] font-semibold text-[#0a0a0a]">{_validTs(c.startedAt) === null ? '—' : new Date(c.startedAt).toLocaleString()}</span>
                    <span className="text-[11px] text-[#a3a3a3] ml-2">· {c.mode} · {c.turnCount} turns · {Math.round((c.durationMs||0)/1000)}s</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.status==='completed'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{c.status}</span>
                </button>
                {callDetail?.call?.id === c.id && (
                  <div className="border-t border-[#f3f1ec] px-4 py-3 space-y-2 max-h-[320px] overflow-y-auto">
                    {callDetail.insight?.summary && <p className="text-[12px] text-[#525252] italic mb-2">{callDetail.insight.summary}</p>}
                    {(callDetail.turns||[]).map((tn) => (
                      <div key={tn.id} className="text-[12px]">
                        {tn.userText && <div><span className="text-[#a3a3a3] font-mono text-[10px] uppercase">You </span>{tn.userText}</div>}
                        {tn.agentText && <div><span className="text-[#117dff] font-mono text-[10px] uppercase">TARA </span>{tn.agentText}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'insights' && (
          calls.find((c) => c.id) && callDetail?.insight ? (
            <div className="bg-white border border-[#e3e0db] rounded-xl p-5 space-y-3">
              <p className="text-[13px] text-[#0a0a0a]">{callDetail.insight.summary}</p>
              {(callDetail.insight.data?.action_items||[]).length>0 && (
                <div><p className="text-[10px] font-mono uppercase text-[#a3a3a3] mb-1">Action Items</p>
                  <ul className="list-disc pl-5 text-[12px] text-[#525252]">{callDetail.insight.data.action_items.map((a,i)=><li key={i}>{a.task}{a.owner?` · @${a.owner}`:''}</li>)}</ul></div>
              )}
              {(callDetail.insight.data?.topics||[]).length>0 && (
                <div className="flex flex-wrap gap-1.5">{callDetail.insight.data.topics.map((tp,i)=><span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252]">{tp}</span>)}</div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center text-[13px] text-[#a3a3a3]">
              <Brain size={20} className="mx-auto mb-2 text-[#d4d0ca]" /> Open a call in Call History to see its insights.
            </div>
          )
        )}
        {activeTab === 'usage' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Calls', value: String(calls.length) },
              { label: 'Total Turns', value: String(totalTurns) },
              { label: 'Total Tokens', value: totalTokens.toLocaleString() },
              { label: 'Avg Turns/Call', value: calls.length ? (totalTurns/calls.length).toFixed(1) : '0' },
            ].map((u) => (
              <div key={u.label} className="bg-white border border-[#e3e0db] rounded-xl p-4">
                <p className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tabular-nums">{u.value}</p>
                <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mt-0.5">{u.label}</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'outbound' && <OutboundPanel identity={identity} onSwitchTab={setActiveTab} language={(i18n.language || 'en').split('-')[0]} />}
        {activeTab === 'campaigns' && <CampaignPanel identity={identity} language={(i18n.language || 'en').split('-')[0]} />}
      </motion.div>
    </motion.div>
  );
}
