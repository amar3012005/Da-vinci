import AdminUserErasureDialog from './AdminUserErasureDialog';
import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';
import { activeUserOrganizations, creditAllowancePatch, userUsageFromAccount } from './all-users-data.mjs';

const number = value => value == null ? 'Unavailable' : Number(value).toLocaleString();
const credits = value => value === -1 ? 'Unlimited' : number(value);
const date = value => value ? new Date(value).toLocaleString() : '—';
const message = error => error.response?.data?.error || error.message;
const PAGE_SIZE = 25;

function CreditEditor({ user, organization, onClose, onSaved }) {
  const [settings, setSettings] = useState(null), [allowance, setAllowance] = useState(''), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);setSettings(null);setError('');
    apiClient.getPlatformOrganizationSettings(organization.id).then(result => {
      if (!active) return;
      setSettings(result.settings);setAllowance(result.settings.overrides.limits.monthlyCredits ?? '');setReason('');
    }).catch(failure => { if (active) setError(message(failure)); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [organization.id, reload]);
  const save = async event => {
    event.preventDefault();if (busy) return;
    setError('');setNotice('');
    try {
      const patch = creditAllowancePatch(settings, organization.id, allowance, reason);
      setBusy(true);
      const result = await apiClient.updatePlatformOrganizationSettings(organization.id, patch);
      if (result.settings?.organization?.id !== organization.id) throw new Error('Save returned an unexpected organization. Reload to verify.');
      setSettings(result.settings);setAllowance(result.settings.overrides.limits.monthlyCredits ?? '');setReason('');
      setNotice('Credit allowance saved. Used and reserved credits were preserved.');onSaved(organization.id, result.settings);
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    const listener = event => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', listener);return () => window.removeEventListener('keydown', listener);
  }, [busy, onClose]);
  const balance = settings?.usage?.credits;
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="all-users-credit-title">
    <section className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4"><div><h3 id="all-users-credit-title" className="text-xl font-semibold">Edit credits</h3><p className="mt-1 text-sm text-[#737373]">Selected user: {user.email}</p></div><button type="button" autoFocus disabled={busy} onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button></div>
      <p className="mt-4 rounded-lg bg-[#faf9f4] p-3 text-sm"><strong>{organization.name}</strong> · Shared organization pool. This affects every member, including {user.displayName || user.email}.</p>
      {busy && !settings && <p role="status" className="mt-4">Loading current credit balance…</p>}
      {error && <div role="alert" className="mt-4 text-sm text-red-700">{error}<button type="button" disabled={busy} className="ml-3 underline" onClick={() => setReload(value => value + 1)}>Reload current settings</button></div>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}
      {settings && <form onSubmit={save} className="mt-4 space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Included',balance?.included],['Used',balance?.used],['Reserved',balance?.reserved],['Remaining',balance?.remaining]].map(([label,value]) => <div key={label} className="rounded-lg border p-3"><dt className="text-xs text-[#737373]">{label}</dt><dd className="mt-1 font-semibold">{credits(value)}</dd></div>)}</dl>
        <p className="text-xs text-[#737373]">Pool: {balance?.credit_pool === 'grant_lifetime' ? 'Lifetime grant' : balance?.credit_pool === 'monthly' ? 'Monthly' : 'Unavailable'}. {balance?.reset_at ? `Resets ${date(balance.reset_at)}.` : 'No reset reported.'}</p>
        {settings.effective?.overridesActive === false && <p className="text-sm text-amber-700">Saved overrides do not reactivate expired or suspended access.</p>}
        <label className="block text-sm font-medium">Included credit allowance<input type="number" min="-1" step="1" value={allowance} disabled={busy} onChange={event => setAllowance(event.target.value)} className="mt-1 block w-full rounded-lg border p-2"/><span className="mt-1 block text-xs font-normal text-[#737373]">Use -1 for unlimited. Leave blank to restore the plan allowance. This changes the allowance; it does not erase consumption.</span></label>
        <label className="block text-sm font-medium">Reason for adjustment<input required minLength={3} maxLength={500} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 block w-full rounded-lg border p-2"/></label>
        <button disabled={busy || reason.trim().length < 3} className="rounded-lg bg-[#117dff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save credit allowance'}</button>
        <p className="text-xs text-[#737373]">Audited settings revision {settings.revision}. Other organization settings remain unchanged.</p>
      </form>}
    </section>
  </div>;
}

function UserUsage({ user, organization }) {
  const [detail, setDetail] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiClient.getPlatformAiCostDetail(organization.id, { period: 'month' }).then(value => { if (active) setDetail(value); }).catch(failure => { if (active) setError(message(failure)); });
    return () => { active = false; };
  }, [organization.id]);
  const usage = userUsageFromAccount(detail, user.id);
  if (error) return <p role="alert" className="text-sm text-red-700">Usage unavailable: {error}</p>;
  if (!detail) return <p role="status" className="text-sm text-[#737373]">Loading attributed usage…</p>;
  return <div><p className="mb-2 text-sm font-medium">{user.email} · {organization.name} · This month</p><dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Model calls',usage?.calls],['Input tokens',usage?.prompt_tokens],['Output tokens',usage?.completion_tokens],['Provider cost (USD)',usage?.total_cost_micros == null ? null : (Number(usage.total_cost_micros) / 1000000).toFixed(4)]].map(([label,value]) => <div key={label}><dt className="text-xs text-[#737373]">{label}</dt><dd className="mt-1 font-medium">{label.includes('USD') ? value ?? 'Unavailable' : number(value)}</dd></div>)}</dl><p className="mt-3 text-xs text-[#737373]">Only usage attributed to this user is shown. Shared pool consumption and unattributed system activity are separate.</p></div>;
}

export default function AllUsersSection({ environment, onLifecycle }) {
  const [result, setResult] = useState(null), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [orgFilter, setOrgFilter] = useState(''), [page, setPage] = useState(0);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [revision, setRevision] = useState(0);
  const [balances, setBalances] = useState({}), [access, setAccess] = useState({}), [savingAccess, setSavingAccess] = useState(null);
  const [expanded, setExpanded] = useState(null), [editor, setEditor] = useState(null);
  const [erasingUser, setErasingUser] = useState(null);
  useEffect(() => {
    let active = true;setLoading(true);setError('');
    apiClient.listPlatformUsers({ q: search, limit: 500 }).then(value => { if (active) { setResult(value);setPage(0);setExpanded(null); } }).catch(failure => { if (active) setError(message(failure)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, revision]);
  const users = result?.users || [];
  const orgs = [...new Map(users.flatMap(activeUserOrganizations).map(org => [org.id, org])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const filtered = users.filter(user => !orgFilter || activeUserOrganizations(user).some(org => org.id === orgFilter));
  const visible = loading ? [] : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const visibleKey = visible.map(user => user.id).join(':');
  useEffect(() => {
    let active = true;
    const ids = [...new Set(visible.flatMap(activeUserOrganizations).map(org => org.id))].filter(id => !balances[id]);
    let cursor = 0;
    Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (active && cursor < ids.length) {
        const id = ids[cursor++];
        try { const value = await apiClient.getPlatformOrganizationSettings(id);if (active) setBalances(previous => ({ ...previous, [id]: value.settings })); }
        catch (failure) { if (active) setBalances(previous => ({ ...previous, [id]: { error: message(failure) } })); }
      }
    }));
    if (environment === 'production' && visible.length) apiClient.platformAccountModeAccess({ action: 'read', emails: visible.map(user => user.email) }).then(value => { if (active) setAccess(previous => ({ ...previous, ...value.access })); }).catch(failure => { if (active) setError(message(failure)); });
    return () => { active = false; };
  // Values are fetched only for the current page; balance updates must not restart requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, environment, revision]);
  const grant = async (user, enabled) => {
    setSavingAccess(user.id);setError('');
    try { const value = await apiClient.platformAccountModeAccess({ email: user.email, enabled });setAccess(previous => ({ ...previous, [user.email.toLowerCase()]: value.enabled }));if (value.enabled !== enabled) setError('Account preference was saved, but the Cloudflare rollout flag is off.'); }
    catch (failure) { setError(message(failure)); }
    finally { setSavingAccess(null); }
  };
  const refresh = () => { setLoading(true);setEditor(null);setExpanded(null);setBalances({});setRevision(value => value + 1); };
  return <section id="admin-users" className="scroll-mt-20" aria-labelledby="all-users-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 id="all-users-title" className="text-2xl font-semibold">All users</h1><p className="mt-1 text-sm text-[#737373]">Every account across your organizations, with usage, credits and workspace access in one place.</p></div><button type="button" onClick={refresh} disabled={loading} className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button></div>
    <form onSubmit={event => { event.preventDefault();setLoading(true);setResult(null);setEditor(null);setExpanded(null);setSearch(query.trim());setOrgFilter('');setPage(0);setRevision(value => value + 1); }} className="my-5 flex flex-wrap gap-2"><input aria-label="Search all users" placeholder="Search email or name" value={query} onChange={event => setQuery(event.target.value)} className="min-w-64 flex-1 rounded-lg border p-2 text-sm"/><button disabled={loading} className="rounded-lg bg-[#117dff] px-4 py-2 text-sm font-medium text-white">Search</button><select aria-label="Filter users by organization" value={orgFilter} onChange={event => { setOrgFilter(event.target.value);setPage(0); }} className="max-w-xs rounded-lg border p-2 text-sm"><option value="">All organizations</option>{orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></form>
    <p className="mb-4 text-xs text-[#737373]">{number(result?.total)} matching accounts · {filtered.length} in the current organization filter. Credits belong to organization pools; a shared pool is never added up once per member.</p>
    {result && result.total > users.length && <p role="status" className="mb-4 text-sm text-amber-700">Showing {users.length} of {result.total} matches. Search by name or email to reach any account beyond this result window.</p>}
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="mb-4 text-sm text-[#737373]">Loading users…</p>}
    <div className="overflow-x-auto rounded-xl border border-[#e3e0db] bg-white"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-[#faf9f4] text-xs text-[#737373]"><tr>{['User','Organizations · shared credits','Memories','Last active','HyperAgents / Voice','Actions'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(user => <React.Fragment key={user.id}><tr className="border-t align-top"><td className="p-3"><strong>{user.displayName || 'Unnamed'}</strong><p className="mt-1 text-xs text-[#737373]">{user.email}</p><p className="mt-2 text-xs capitalize">{user.user_type || user.tier} · {user.active ? 'Active' : 'Sleeping'}</p></td><td className="p-3">{activeUserOrganizations(user).length ? activeUserOrganizations(user).map(org => {
      const state = balances[org.id], balance = state?.usage?.credits;
      return <div key={org.id} className="mb-3 last:mb-0"><p className="font-medium">{org.name}</p><p className="my-1 text-xs text-[#737373]">{state?.error ? 'Balance unavailable' : !state ? 'Loading balance…' : `${credits(balance?.remaining)} remaining · ${credits(balance?.used)} used · ${credits(balance?.included)} included`}</p><div className="flex gap-3 text-xs"><button type="button" className="text-[#117dff] underline" onClick={() => setEditor({ user, organization: org })}>Edit credits</button><button type="button" className="text-[#117dff] underline" aria-expanded={expanded === `${user.id}:${org.id}`} onClick={() => setExpanded(value => value === `${user.id}:${org.id}` ? null : `${user.id}:${org.id}`)}>View user usage</button></div></div>;
    }) : <span className="text-xs text-[#737373]">No active organization</span>}</td><td className="p-3">{number(user.memory_count)}</td><td className="p-3 text-xs">{date(user.lastActiveAt)}</td><td className="p-3"><label className="flex items-center gap-2"><input type="checkbox" aria-label={`Enable HyperAgents and Voice for ${user.email}`} checked={access[user.email?.toLowerCase()] === true} disabled={environment !== 'production' || savingAccess === user.id || access[user.email?.toLowerCase()] === undefined} onChange={event => grant(user, event.target.checked)}/>{environment !== 'production' ? 'Production only' : savingAccess === user.id ? 'Saving…' : access[user.email?.toLowerCase()] === undefined ? 'Unavailable' : access[user.email?.toLowerCase()] ? 'Enabled' : 'Off'}</label></td><td className="p-3"><button type="button" onClick={() => onLifecycle(user)} className="rounded-lg border px-3 py-1.5 text-xs">Lifecycle</button><button type="button" onClick={() => setErasingUser(user)} className="mt-2 block rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700">Delete user</button></td></tr>{activeUserOrganizations(user).filter(org => expanded === `${user.id}:${org.id}`).map(org => <tr key={org.id} className="border-t bg-[#faf9f4]"><td colSpan={6} className="p-4"><UserUsage user={user} organization={org}/><details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Shared organization product usage · current period</summary><dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">{[['Searches','searchQueries'],['Knowledge pages','knowledgeBasePages'],['HyperAgent runs','hyperAgentRuns'],['Research jobs','deepResearchJobs'],['Web Intel jobs','webIntelJobs'],['Voice seconds','taraSeconds']].map(([label,key]) => <div key={key}><dt className="text-xs text-[#737373]">{label}</dt><dd className="mt-1 font-medium">{number(balances[org.id]?.usage?.monthly?.[key])}</dd></div>)}</dl><p className="mt-2 text-xs text-[#737373]">These totals are shared by all members of {org.name}.</p></details></td></tr>)}</React.Fragment>)}</tbody></table>{!loading && !visible.length && <p className="p-8 text-center text-sm text-[#737373]">No users match this search.</p>}</div>
    <div className="mt-4 flex items-center justify-between text-sm"><span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}</span><div className="flex gap-2"><button type="button" disabled={!page} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    {erasingUser && <AdminUserErasureDialog user={erasingUser} onClose={() => setErasingUser(null)} onCompleted={() => { setResult(current => current ? { ...current, users: current.users.filter(user => user.id !== erasingUser.id), total: Math.max(0, current.total - (current.users.some(user => user.id === erasingUser.id) ? 1 : 0)) } : current); }} />}
    {editor && <CreditEditor key={editor.organization.id} {...editor} onClose={() => setEditor(null)} onSaved={(id, settings) => setBalances(previous => ({ ...previous, [id]: settings }))}/>}
  </section>;
}
