// Mobile Profile — desktop Profile.jsx's core sections (account header,
// workspace access, organization/company context, profile facts editor,
// data & privacy) reusing the exact same api-client calls, laid out for a
// phone: bottom sheets for add/edit/delete instead of inline table rows,
// single-column cards instead of desktop's 4-column grids. Knowledge
// Breakdown / Recent Brain Activity feed are desktop-only for now (lower
// priority, informational-only sections).
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Brain, Building2, Check, ChevronDown, Cloud,
  Download, ExternalLink, Globe, Link as LinkIcon, LogOut, MapPin,
  Pencil, Plus, RefreshCw, Save, Server, Settings2, Shield, Sparkles,
  Target, Trash2, User,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useApiQuery } from '../../shared/hooks';
import { useAuth } from '../../auth/AuthProvider';
import WorkspaceAccessCard from '../../shared/WorkspaceAccessCard';
import CreditBalance from '../../shared/CreditBalance';
import MobileShell from '../MobileShell';

const CATEGORIES = ['static', 'dynamic', 'preference', 'goal'];
const CATEGORY_CONFIG = {
  static: { color: '#117dff', icon: User, label: 'Static' },
  dynamic: { color: '#64748b', icon: Sparkles, label: 'Dynamic' },
  preference: { color: '#d97706', icon: Settings2, label: 'Preference' },
  goal: { color: '#059669', icon: Target, label: 'Goal' },
};

function UserAvatar({ displayName, email }) {
  const initials = (displayName || email || '?')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <div className="w-14 h-14 rounded-[12px] bg-[#117dff] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-[17px] font-bold font-mono">{initials || '?'}</span>
    </div>
  );
}

function Sheet({ onClose, children }) {
  return (
    <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[86vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
      >
        {children}
      </motion.section>
    </motion.div>
  );
}

function AccountHeaderCard({ user, org, plan, stats, profileFacts, onSignOut }) {
  const nameFromFacts = profileFacts?.find((f) => f.key === 'name')?.value;
  const displayName = nameFromFacts || user?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '—';
  const { memory_count: rawMemCount, observation_count = 0, relationship_count = 0 } = stats || {};
  const memoryCount = rawMemCount || (observation_count > 0 ? observation_count : 0);
  const factCount = profileFacts?.length || 0;
  const sourceCount = (stats?.top_source_platforms || []).length;

  const stats4 = [
    { label: 'Memories', value: memoryCount, icon: Brain },
    { label: 'Connections', value: relationship_count, icon: LinkIcon },
    { label: 'Facts', value: factCount, icon: User },
    { label: 'Sources', value: sourceCount, icon: Globe },
  ];

  return (
    <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
      <div className="flex items-center gap-3">
        <UserAvatar displayName={displayName} email={email} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{displayName}</div>
          <div className="text-[11.5px] text-[#737373] font-mono truncate">{email}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {org && <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]">{org.name}</span>}
            {plan && <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20 capitalize">{plan}</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {stats4.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-1.5 py-2 flex flex-col items-center text-center">
            <Icon size={12} className="text-[#117dff]" />
            <div className="text-[14px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-none mt-1">{value}</div>
            <div className="text-[7px] uppercase tracking-tight text-[#a3a3a3] mt-1">{label}</div>
          </div>
        ))}
      </div>
      <button onClick={onSignOut} className="mt-4 w-full h-10 rounded-full border border-[#e3e0db] text-[#525252] text-[13px] font-medium flex items-center justify-center gap-2">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}

function OrganizationContextCard({ org, user }) {
  const [draft, setDraft] = useState({ website: '', industry: '', description: '', audience: '', mission: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const profileQuery = useApiQuery(
    () => (org?.id ? apiClient.getOrganizationProfile(org.id).catch(() => null) : Promise.resolve(null)),
    [org?.id],
  );
  const context = profileQuery.data?.organization;
  const canEdit = profileQuery.data?.can_edit === true;
  const company = context?.company_profile || org?.company_profile || {};
  const plan = context?.plan || org?.plan || 'free';
  const hostingMode = context?.hosting_mode || org?.hosting_mode || 'managed';

  useEffect(() => {
    setDraft({
      website: company.website || '', industry: company.industry || '', description: company.description || '',
      audience: company.audience || '', mission: company.mission || '',
    });
  }, [company.website, company.industry, company.description, company.audience, company.mission]);

  const save = async () => {
    if (!org?.id || !canEdit) return;
    setSaving(true); setSaved(false);
    try { await apiClient.updateOrganizationProfile(org.id, draft); await profileQuery.refetch(); setSaved(true); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
      <button onClick={() => setOpen((p) => !p)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[#117dff]" />
          <span className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Workspace identity</span>
        </div>
        <ChevronDown size={16} className={`text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[['Plan', plan], ['Hosting', hostingMode === 'self_host' ? 'Self-hosted' : 'Managed'], ['Role', user?.role || 'member']].map(([label, value]) => (
          <div key={label} className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-2">
            <div className="text-[8.5px] uppercase tracking-wide text-[#a3a3a3] font-mono">{label}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[#0a0a0a]">
              {label === 'Hosting' && (hostingMode === 'self_host' ? <Server size={11} className="text-[#117dff]" /> : <Cloud size={11} className="text-[#117dff]" />)}
              {value}
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 pt-4 border-t border-[#f3f1ec] space-y-3">
              <p className="text-[11px] text-[#737373]">Company overview — the canonical context available to your organization and AI workspace.{!canEdit ? ' Only an owner or admin can edit.' : ''}</p>
              {[
                ['website', 'Website', 'https://company.com'],
                ['industry', 'Industry', 'e.g. Climate technology'],
                ['audience', 'Audience', 'Who you serve'],
                ['mission', 'Mission', 'What the team is working toward'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[10.5px] font-medium text-[#525252]">{label}</span>
                  <input
                    value={draft[key]}
                    onChange={(e) => setDraft((c) => ({ ...c, [key]: e.target.value }))}
                    disabled={!canEdit}
                    placeholder={placeholder}
                    className="w-full h-10 rounded-[10px] border border-[#e3e0db] bg-white px-3 text-[13px] outline-none focus:border-[#117dff] disabled:bg-[#faf9f4]"
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-medium text-[#525252]">What the company does</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Describe the product, services, and operating context."
                  className="w-full rounded-[10px] border border-[#e3e0db] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#117dff] disabled:bg-[#faf9f4] resize-none"
                />
              </label>
              {canEdit && (
                <div className="flex items-center gap-3">
                  <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#117dff] text-white text-[12.5px] font-semibold disabled:opacity-50">
                    <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  {saved && <span className="text-[12px] font-medium text-emerald-700">Saved.</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileFactsCard({ facts, onRefresh }) {
  const [rebuilding, setRebuilding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newFact, setNewFact] = useState({ category: 'static', key: '', value: '' });
  const [editValue, setEditValue] = useState('');

  const handleRebuild = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    try { await apiClient.rebuildProfile(); await onRefresh?.(); }
    catch (err) { console.warn('[profile] rebuild failed:', err?.message || err); }
    finally { setRebuilding(false); }
  };

  const handleAdd = async () => {
    setError(null);
    if (!newFact.key.trim() || !newFact.value.trim()) { setError('Both key and value are required.'); return; }
    setSaving(true);
    try {
      await apiClient.controlPlane.post('/v1/proxy/profiles', { category: newFact.category, key: newFact.key.trim(), value: newFact.value.trim(), confidence: 1.0 });
      setAddOpen(false); setNewFact({ category: 'static', key: '', value: '' }); onRefresh();
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editValue.trim() || editValue === editing.value) { setEditing(null); return; }
    setSaving(true);
    try {
      await apiClient.controlPlane.post('/v1/proxy/profiles', { category: editing.category, key: editing.key, value: editValue.trim(), confidence: editing.confidence });
      setEditing(null); onRefresh();
    } catch (err) { setError(err.response?.data?.error || err.message || 'Failed to update fact'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await apiClient.controlPlane.delete(`/v1/proxy/profiles?id=${deleteTarget.id}`); setDeleteTarget(null); onRefresh(); }
    catch (err) { setError(err.response?.data?.error || err.message || 'Failed to delete fact'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Profile facts <span className="text-[#a3a3a3] font-normal text-[11px]">{facts.length}</span></span>
        <button onClick={handleRebuild} disabled={rebuilding} className="flex items-center gap-1 text-[#117dff] text-[11px] font-medium disabled:opacity-50">
          <RefreshCw size={12} className={rebuilding ? 'animate-spin' : ''} /> {rebuilding ? 'Rebuilding…' : 'Rebuild'}
        </button>
      </div>

      {facts.length === 0 ? (
        <div className="rounded-[12px] bg-[#faf9f4] border border-[#e3e0db] px-4 py-6 text-center">
          <User size={20} className="text-[#d4d0ca] mx-auto mb-2" />
          <p className="text-[12px] text-[#a3a3a3]">No profile facts yet. They build automatically as you use HIVEMIND.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {facts.map((fact) => {
            const cfg = CATEGORY_CONFIG[fact.category] || { color: '#737373', icon: User, label: fact.category };
            const Icon = cfg.icon;
            return (
              <div key={fact.id} className="flex items-center gap-2 rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-2">
                <span className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0" style={{ background: `${cfg.color}14` }}>
                  <Icon size={11} style={{ color: cfg.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold text-[#0a0a0a] truncate">{fact.key}</div>
                  <div className="text-[11px] text-[#525252] truncate">{fact.value}</div>
                </div>
                <button onClick={() => { setEditing(fact); setEditValue(fact.value); }} className="text-[#a3a3a3] p-1 flex-shrink-0"><Pencil size={13} /></button>
                <button onClick={() => setDeleteTarget(fact)} className="text-[#a3a3a3] p-1 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setAddOpen(true)} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#117dff]">
        <Plus size={14} /> Add fact
      </button>

      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
          <div className="text-[16px] font-bold mb-4">Add profile fact</div>
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setNewFact((p) => ({ ...p, category: cat }))}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium whitespace-nowrap border ${newFact.category === cat ? 'bg-[#1a1a17] text-white border-[#1a1a17]' : 'border-[#e3e0db] text-[#525252]'}`}>
                {CATEGORY_CONFIG[cat]?.label || cat}
              </button>
            ))}
          </div>
          <input value={newFact.key} onChange={(e) => setNewFact((p) => ({ ...p, key: e.target.value }))} placeholder="Key (e.g. favorite_color)"
            className="w-full h-11 px-4 rounded-full border border-[#dcd8d0] outline-none text-[14px] mb-2.5 focus:border-[#117dff]" />
          <input value={newFact.value} onChange={(e) => setNewFact((p) => ({ ...p, value: e.target.value }))} placeholder="Value (e.g. blue)"
            className="w-full h-11 px-4 rounded-full border border-[#dcd8d0] outline-none text-[14px] focus:border-[#117dff]" />
          {error && <p className="mt-2 text-[11.5px] text-red-600">{error}</p>}
          <button onClick={handleAdd} disabled={saving || !newFact.key.trim() || !newFact.value.trim()}
            className="mt-4 w-full h-12 rounded-full bg-[#117dff] text-white text-[14.5px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} Save fact
          </button>
        </Sheet>
      )}

      {editing && (
        <Sheet onClose={() => setEditing(null)}>
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
          <div className="text-[16px] font-bold mb-1">Edit fact</div>
          <div className="text-[12px] text-[#a3a3a3] mb-4">{editing.key}</div>
          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus
            className="w-full h-11 px-4 rounded-full border border-[#dcd8d0] outline-none text-[14px] focus:border-[#117dff]" />
          {error && <p className="mt-2 text-[11.5px] text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={() => setEditing(null)} className="flex-1 h-11 rounded-full border border-[#e3e0db] text-[13px] font-medium text-[#525252]">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="flex-1 h-11 rounded-full bg-[#117dff] text-white text-[13px] font-semibold disabled:opacity-50">Save</button>
          </div>
        </Sheet>
      )}

      {deleteTarget && (
        <Sheet onClose={() => setDeleteTarget(null)}>
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-[#dc2626] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[15px] font-bold">Delete profile fact</div>
              <p className="mt-1 text-[12.5px] text-[#525252]">Remove "{deleteTarget.key}: {deleteTarget.value}" from your profile? This fact may be re-learned from future conversations.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 rounded-full border border-[#e3e0db] text-[13px] font-medium text-[#525252]">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex-1 h-11 rounded-full bg-[#ef4444] text-white text-[13px] font-semibold disabled:opacity-50">Delete</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function DataPrivacyCard() {
  const { logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isSelfHost, setIsSelfHost] = useState(false);
  const [managedReconfirm, setManagedReconfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => { try { const s = await apiClient.selfHostStatus(); if (!cancelled) setIsSelfHost(!!(s && s.registered)); } catch { if (!cancelled) setIsSelfHost(false); } })();
    return () => { cancelled = true; };
  }, []);

  const handleExport = async () => {
    setExportLoading(true); setExportMsg(null);
    try { await apiClient.controlPlane.post('/v1/account/export'); setExportMsg({ type: 'success', text: 'Export request received. You will receive an email when ready.' }); }
    catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) setExportMsg({ type: 'info', text: 'Data export is coming soon.' });
      else setExportMsg({ type: 'error', text: err.response?.data?.error || err.message });
    } finally { setExportLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true); setDeleteMsg(null);
    try {
      await apiClient.deleteAccount('DELETE');
      apiClient.clearApiKey();
      setTimeout(async () => { setShowDelete(false); await logout(); }, 1200);
    } catch (err) {
      const serverErr = err.response?.data?.error;
      const blockingOrg = err.response?.data?.org;
      setDeleteMsg(blockingOrg && serverErr ? `${serverErr} (Org: ${blockingOrg.name})` : serverErr || err.message || 'Deletion failed');
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={15} className="text-[#525252]" />
        <span className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Data & Privacy</span>
      </div>
      <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-emerald-50 border border-emerald-100 mb-3">
        <MapPin size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[11.5px] font-semibold text-emerald-800">Your data is stored in Frankfurt, Germany</p>
          <p className="text-[10.5px] text-emerald-700 mt-0.5">GDPR compliant · No US data transfer · EU data residency</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-[12px] border border-[#e3e0db] bg-[#faf9f4] mb-2">
        <div className="min-w-0 pr-3">
          <p className="text-[12.5px] font-semibold text-[#0a0a0a]">Export my data</p>
          <p className="text-[10.5px] text-[#525252] mt-0.5">Download memories, observations, settings as JSON.</p>
          {exportMsg && <p className={`text-[10px] mt-1 ${exportMsg.type === 'error' ? 'text-red-600' : exportMsg.type === 'success' ? 'text-emerald-600' : 'text-[#a3a3a3]'}`}>{exportMsg.text}</p>}
        </div>
        <button onClick={handleExport} disabled={exportLoading} className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#e3e0db] bg-white text-[#525252] text-[11.5px] font-semibold flex-shrink-0 disabled:opacity-40">
          {exportLoading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Export
        </button>
      </div>

      <div className="flex items-center justify-between p-3 rounded-[12px] border border-red-100 bg-red-50">
        <div className="min-w-0 pr-3">
          <p className="text-[12.5px] font-semibold text-[#0a0a0a]">Delete my account</p>
          <p className="text-[10.5px] text-[#525252] mt-0.5">{isSelfHost ? 'Removes only your Singulance identity — memories stay on your own server.' : 'Permanently delete all your data. Cannot be undone.'}</p>
        </div>
        <button onClick={() => { setDeleteConfirm(''); setDeleteMsg(null); setManagedReconfirm(false); setShowDelete(true); }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-red-200 bg-white text-red-600 text-[11.5px] font-semibold flex-shrink-0">
          <Trash2 size={13} /> Delete
        </button>
      </div>

      <a href="https://singulancelabs.com/privacy" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-[#a3a3a3]">
        Privacy Policy <ExternalLink size={10} />
      </a>

      {showDelete && (
        <Sheet onClose={() => !deleteLoading && setShowDelete(false)}>
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-[#dc2626] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[16px] font-bold">Delete account</div>
              <p className="mt-1 text-[12.5px] text-[#525252] leading-relaxed">
                {managedReconfirm ? 'Are you absolutely sure? This is your final confirmation — data cannot be recovered.'
                  : isSelfHost ? 'Your memory data stays on your server. This removes only your Singulance identity, API keys, sessions, and the connection. Type DELETE to confirm.'
                  : 'This permanently deletes your account, connectors, API keys, and ALL your memory data on Singulance. This cannot be undone. Type DELETE to continue.'}
              </p>
            </div>
          </div>
          <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" autoFocus
            className="w-full h-11 px-4 rounded-[12px] border border-[#e3e0db] bg-[#faf9f4] text-[13px] font-mono outline-none focus:border-[#dc2626]" />
          {deleteMsg && <p className="mt-2 text-[11.5px] text-red-600">{deleteMsg}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowDelete(false)} disabled={deleteLoading} className="flex-1 h-11 rounded-full border border-[#e3e0db] text-[13px] font-medium text-[#525252] disabled:opacity-50">Cancel</button>
            <button
              onClick={() => { if (!isSelfHost && !managedReconfirm) { setManagedReconfirm(true); return; } handleDeleteConfirm(); }}
              disabled={deleteConfirm.trim().toUpperCase() !== 'DELETE' || deleteLoading}
              className="flex-1 h-11 rounded-full bg-[#dc2626] text-white text-[13px] font-semibold disabled:opacity-40"
            >
              {deleteLoading ? 'Processing…' : managedReconfirm ? 'Yes, delete everything' : 'Delete account'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export default function MobileProfile() {
  const { user, org, logout } = useAuth();
  const profilesQuery = useApiQuery(async () => { const { data } = await apiClient.controlPlane.get('/v1/proxy/profiles'); return data; });
  const { data: profilesData, refetch: refetchProfiles } = profilesQuery;
  const { data: statsRaw } = useApiQuery(() => apiClient.getProfile());
  const { data: billing } = useApiQuery(() => apiClient.getBillingPlan().catch(() => null), []);
  const statsData = statsRaw ? { ...statsRaw.profile, graph_summary: statsRaw.graph_summary } : null;
  const facts = profilesData?.facts || [];

  return (
    <MobileShell title="Profile">
      <div className="px-4 pt-2 pb-10 space-y-3">
        <AccountHeaderCard user={user} org={org} plan={statsData?.plan} stats={statsData} profileFacts={facts} onSignOut={logout} />
        <WorkspaceAccessCard billing={billing} compact />
        <CreditBalance credits={billing?.usage_summary?.credits} />
        <OrganizationContextCard org={org} user={user} />
        <ProfileFactsCard facts={facts} onRefresh={refetchProfiles} />
        <DataPrivacyCard />
      </div>
    </MobileShell>
  );
}
