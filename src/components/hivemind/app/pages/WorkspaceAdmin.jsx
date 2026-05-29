import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, FolderKanban, UserCog, Send, ScrollText, KeyRound,
  LayoutDashboard, Activity, ArrowUpRight, Building2, RefreshCw, Loader2,
  Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import ShareInviteModal from '../components/ShareInviteModal';
import { PageWalkthrough, WORKSPACE_ADMIN_STEPS } from '../shared/Walkthrough';

// Sub-pages — lazy so the tab strip is fast even when admin pages bloat.
const AdminUsers       = React.lazy(() => import('./AdminUsers'));
const TeamMembers      = React.lazy(() => import('./TeamMembers'));
const TeamProjects     = React.lazy(() => import('./TeamProjects'));
const AuditLog         = React.lazy(() => import('./AuditLog'));
const AdminSso         = React.lazy(() => import('./AdminSso'));

// Tab registry. `id` is the ?tab=… URL param; `icon` + `label` render in the strip.
// Digital Employees now lives at /hivemind/app/employees as its own
// 'Hyper Agents' sidebar entry — no longer a tab here.
const TABS = [
  { id: 'overview',  label: 'Overview',     icon: LayoutDashboard },
  { id: 'members',   label: 'Org Members',  icon: UserCog,  Component: AdminUsers },
  { id: 'teams',     label: 'Team Members', icon: Users,    Component: TeamMembers },
  { id: 'projects',  label: 'Projects',     icon: FolderKanban, Component: TeamProjects },
  { id: 'invites',   label: 'Invites',      icon: Send },
  { id: 'audit',     label: 'Audit Log',    icon: ScrollText, Component: AuditLog },
  { id: 'sso',       label: 'SSO Config',   icon: KeyRound, Component: AdminSso },
];

export default function WorkspaceAdmin() {
  const { org } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setTab = useCallback((id) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const Tab = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageWalkthrough pageKey="workspace-admin" steps={WORKSPACE_ADMIN_STEPS} />
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1">
          <Building2 size={11} />
          {org?.slug || org?.id?.slice(0, 8) || 'workspace'}
        </div>
        <h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
          Workspace Admin
        </h1>
        <p className="text-[12px] text-[#737373] mt-1">
          {org?.name || 'Your organization'} · members, teams, projects, invitations, security and compliance — all in one place.
        </p>
      </header>

      {/* Metrics strip — always visible */}
      <MetricsStrip orgId={org?.id} />

      {/* Tab nav */}
      <nav className="mt-5 mb-4 border-b border-[#e3e0db] flex items-center gap-0.5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-[#0a0a0a] text-[#0a0a0a]'
                  : 'border-transparent text-[#737373] hover:text-[#0a0a0a] hover:bg-[#faf9f4]'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Tab body */}
      <section className="pb-12">
        {Tab.id === 'overview' && <OverviewTab orgId={org?.id} setTab={setTab} />}
        {Tab.id === 'invites'  && <InvitesTab orgId={org?.id} orgName={org?.name} />}
        {Tab.Component && (
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin text-[#a3a3a3]" />
              </div>
            }
          >
            <Tab.Component />
          </React.Suspense>
        )}
      </section>
    </div>
  );
}

/* ─── Metrics ───────────────────────────────────────────────────────────── */

function MetricsStrip({ orgId }) {
  const [data, setData] = useState({ members: 0, teams: 0, projects: 0, pending: 0, accepted: 0, loading: true });

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setData(d => ({ ...d, loading: true }));
    try {
      const [membersResp, teamsResp, projectsResp, pendingResp, acceptedResp] = await Promise.all([
        apiClient.listOrgMembers?.(orgId).catch(() => ({})),
        apiClient.listTeams?.().catch(() => ({})),
        apiClient.listAccessibleProjects?.().catch(() => ({})),
        apiClient.listInvites?.(orgId, { status: 'pending' }).catch(() => ({})),
        apiClient.listInvites?.(orgId, { status: 'accepted' }).catch(() => ({})),
      ]);
      setData({
        members:  (membersResp?.members || membersResp || []).length || 0,
        teams:    (teamsResp?.teams    || teamsResp    || []).length || 0,
        projects: (projectsResp?.projects || projectsResp || []).length || 0,
        pending:  (pendingResp?.invites || []).length || 0,
        accepted: (acceptedResp?.invites || []).length || 0,
        loading: false,
      });
    } catch {
      setData(d => ({ ...d, loading: false }));
    }
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const cards = [
    { id: 'members',  label: 'Org members',     value: data.members,  Icon: UserCog,      color: '#117dff' },
    { id: 'teams',    label: 'Active teams',    value: data.teams,    Icon: Users,        color: '#0A66C2' },
    { id: 'projects', label: 'Live projects',   value: data.projects, Icon: FolderKanban, color: '#10b981' },
    { id: 'pending',  label: 'Pending invites', value: data.pending,  Icon: Clock,        color: '#f59e0b' },
    { id: 'accepted', label: 'Joined via invite', value: data.accepted, Icon: CheckCircle2, color: '#0a0a0a' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {cards.map(c => (
        <div
          key={c.id}
          className="bg-white border border-[#e3e0db] rounded-[10px] p-3 hover:border-[#d4d0ca] transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <c.Icon size={14} style={{ color: c.color }} />
            {data.loading && <Loader2 size={10} className="animate-spin text-[#a3a3a3]" />}
          </div>
          <div className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums leading-none">
            {data.loading ? '—' : c.value}
          </div>
          <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider mt-1">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Overview tab ──────────────────────────────────────────────────────── */

function OverviewTab({ orgId, setTab }) {
  const [recentInvites, setRecentInvites] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const inv = await apiClient.listInvites(orgId, { status: 'all' }).catch(() => ({}));
        if (!cancelled) setRecentInvites((inv?.invites || []).slice(0, 5));
      } catch { /* noop */ }
      try {
        const { data } = await apiClient.controlPlane.get('/v1/audit/logs?limit=8');
        if (!cancelled) setRecentAudit(data?.logs || data?.rows || []);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const quickActions = [
    { label: 'Invite a teammate', sub: 'Email + share link',         tab: 'invites',  Icon: Send,         color: '#117dff' },
    { label: 'Add a new project', sub: 'Spin up a scoped HIVEMIND',  tab: 'projects', Icon: FolderKanban, color: '#10b981' },
    { label: 'Configure SSO',     sub: 'Zitadel / SAML / OIDC',      tab: 'sso',      Icon: KeyRound,     color: '#0a0a0a' },
    { label: 'Review audit log',  sub: 'Last 24h of admin actions',  tab: 'audit',    Icon: ScrollText,   color: '#737373' },
  ];

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div>
        <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">Quick actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={() => setTab(a.tab)}
              className="text-left bg-white border border-[#e3e0db] rounded-[10px] p-4 hover:border-[#0a0a0a] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <a.Icon size={16} style={{ color: a.color }} />
                <ArrowUpRight size={13} className="text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
              </div>
              <div className="text-[13px] font-semibold text-[#0a0a0a]">{a.label}</div>
              <div className="text-[11px] text-[#737373] mt-0.5">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent invites */}
        <Card title="Recent invitations" actionLabel="View all" onAction={() => setTab('invites')}>
          {recentInvites.length === 0 ? (
            <Empty text="No invitations yet — click 'Invite a teammate' above." />
          ) : (
            <ul className="divide-y divide-[#eae7e1] text-[12px]">
              {recentInvites.map(inv => (
                <li key={inv.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[#0a0a0a] truncate">
                      {inv.email || <span className="text-[#a3a3a3]">link-only</span>}
                    </div>
                    <div className="text-[10px] text-[#a3a3a3]">{inv.role}</div>
                  </div>
                  <StatusPill status={inv.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Audit activity */}
        <Card title="Recent activity" actionLabel="Open audit log" onAction={() => setTab('audit')}>
          {recentAudit.length === 0 ? (
            <Empty text="No recent events." />
          ) : (
            <ul className="divide-y divide-[#eae7e1] text-[12px]">
              {recentAudit.slice(0, 6).map((e, i) => (
                <li key={e.id || i} className="py-2 flex items-center gap-2">
                  <Activity size={12} className="text-[#a3a3a3]" />
                  <span className="text-[#0a0a0a] truncate flex-1">
                    {e.eventType || e.event_type || e.action || 'event'}
                  </span>
                  <span className="text-[10px] text-[#a3a3a3] shrink-0">
                    {e.createdAt || e.created_at
                      ? new Date(e.createdAt || e.created_at).toLocaleString()
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Invites tab (full-page status list + share modal) ────────────────── */

function InvitesTab({ orgId, orgName }) {
  const [invites, setInvites] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const fetchList = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const resp = await apiClient.listInvites(orgId, { status });
      setInvites(resp.invites || []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const buckets = useMemo(() => {
    const acc = { pending: 0, accepted: 0, expired: 0, revoked: 0 };
    invites.forEach(i => { if (acc[i.status] !== undefined) acc[i.status]++; });
    return acc;
  }, [invites]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {['all', 'pending', 'accepted', 'expired', 'revoked'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-[11px] px-2.5 py-1 rounded-[6px] font-medium capitalize transition-colors ${
                status === s ? 'bg-[#0a0a0a] text-white' : 'text-[#525252] hover:bg-[#f3f1ec]'
              }`}
            >
              {s} {s !== 'all' && buckets[s] > 0 && <span className="opacity-60">·{buckets[s]}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchList} className="p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a]">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
          >
            <Send size={13} />
            New invite
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#e3e0db] rounded-[10px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[#faf9f4] border-b border-[#e3e0db] text-[10px] uppercase tracking-wider text-[#737373]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Recipient</th>
              <th className="text-left px-3 py-2 font-medium">Role</th>
              <th className="text-left px-3 py-2 font-medium">Scope</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Sent</th>
              <th className="text-left px-3 py-2 font-medium">Expires / Joined</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-8 text-[#a3a3a3] text-[11px]">No {status === 'all' ? '' : status} invitations.</td></tr>
            )}
            {invites.map(inv => (
              <tr key={inv.id} className="border-b border-[#eae7e1] hover:bg-[#faf9f4]">
                <td className="px-3 py-2">
                  <div className="font-medium text-[#0a0a0a]">{inv.email || <span className="text-[#a3a3a3]">link-only</span>}</div>
                  {inv.inviter?.email && (
                    <div className="text-[10px] text-[#a3a3a3]">by {inv.inviter.email}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-[#525252]">{inv.role}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(inv.projects || []).map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[9px] text-emerald-700">
                        <FolderKanban size={8} />{p.name}
                      </span>
                    ))}
                    {(inv.teams || []).map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[9px] text-blue-700">
                        <Users size={8} />{t.name}
                      </span>
                    ))}
                    {(!inv.projects?.length && !inv.teams?.length) && (
                      <span className="text-[10px] text-[#a3a3a3]">org-wide</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2"><StatusPill status={inv.status} /></td>
                <td className="px-3 py-2 text-[10px] text-[#a3a3a3] font-mono">
                  {inv.send_count > 1 ? `${inv.send_count}× ` : ''}
                  {(inv.last_sent_at || inv.created_at) && new Date(inv.last_sent_at || inv.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-[10px] text-[#a3a3a3] font-mono">
                  {inv.status === 'accepted' && inv.used_at && new Date(inv.used_at).toLocaleString()}
                  {inv.status === 'pending'  && inv.expires_at && new Date(inv.expires_at).toLocaleDateString()}
                  {inv.status === 'expired'  && inv.expires_at && new Date(inv.expires_at).toLocaleDateString()}
                  {inv.status === 'revoked'  && inv.revoked_at && new Date(inv.revoked_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShareInviteModal
        open={shareOpen}
        onClose={() => { setShareOpen(false); fetchList(); }}
        orgId={orgId}
        contextLabel={orgName || 'workspace'}
      />
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const BADGE = {
    pending:  { label: 'Pending',  cls: 'text-amber-700 bg-amber-50 border-amber-200',         Icon: Clock },
    accepted: { label: 'Joined',   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',    Icon: CheckCircle2 },
    expired:  { label: 'Expired',  cls: 'text-[#737373] bg-[#f3f1ec] border-[#e3e0db]',        Icon: Clock },
    revoked:  { label: 'Revoked',  cls: 'text-red-700 bg-red-50 border-red-200',               Icon: XCircle },
  };
  const b = BADGE[status] || BADGE.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${b.cls}`}>
      <b.Icon size={8} />{b.label}
    </span>
  );
}

function Card({ title, actionLabel, onAction, children }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-[#0a0a0a]">{title}</h3>
        {actionLabel && (
          <button onClick={onAction} className="text-[10px] text-[#737373] hover:text-[#117dff] flex items-center gap-1">
            {actionLabel} <ArrowUpRight size={10} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-center py-6 text-[11px] text-[#a3a3a3]">{text}</div>;
}
