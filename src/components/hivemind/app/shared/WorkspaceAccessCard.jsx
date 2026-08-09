import React from 'react';
import { Building2, CalendarDays, Cloud, Database, Infinity as InfinityIcon, Server, ShieldCheck } from 'lucide-react';

const label = (value, fallback = 'Not specified') => value
  ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : fallback;

const date = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  : 'No fixed expiry';

export default function WorkspaceAccessCard({ billing, compact = false }) {
  if (!billing) return null;
  const entitlement = billing.entitlement;
  const organization = billing.organization || {};
  const plan = billing.plan || {};
  const invitationOnboarding = entitlement?.source === 'enterprise_invitation' && entitlement?.phase === 'onboarding';
  const accountType = entitlement?.account_type || organization.account_type || 'personal';
  const hostingMode = entitlement?.hosting_mode || organization.hosting_mode || 'managed';
  const storageMode = entitlement?.storage_mode || organization.memory_storage_mode;
  const limits = Object.values(plan.limits || {});
  const unlimitedPilot = invitationOnboarding && limits.length > 0 && limits.every((limit) => Number(limit) === -1);
  const title = invitationOnboarding ? 'Enterprise invitation onboarding' : 'Current workspace access';

  const facts = [
    { icon: Building2, name: 'Account', value: label(accountType) },
    { icon: hostingMode === 'self_host' ? Server : Cloud, name: 'Infrastructure', value: hostingMode === 'self_host' ? 'Self-hosted' : 'Managed' },
    { icon: Database, name: 'Memory storage', value: label(storageMode) },
    { icon: CalendarDays, name: invitationOnboarding ? 'Onboarding ends' : 'Access period', value: date(entitlement?.effective_until) },
  ];

  return (
    <section className={`border border-[#bcd5ff] bg-[#f5f9ff] ${compact ? 'p-4' : 'p-5'}`} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#9fc1f8] bg-white text-[#117dff]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#117dff]">
              {invitationOnboarding ? 'Invitation active' : `${label(plan.name || plan.id || 'Plan')} plan`}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[#0a0a0a]">{title}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#525252]">
              {invitationOnboarding
                ? 'Your organization is operating under its invitation configuration. Usage is measured normally, while the pilot allowance remains unlimited until onboarding ends.'
                : 'This is the server-authoritative account, infrastructure, storage, and entitlement currently applied to your organization.'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-[#9fc1f8] bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#117dff]">
          {unlimitedPilot && <InfinityIcon size={12} />}{unlimitedPilot ? 'Unlimited pilot' : label(entitlement?.status || 'Active')}
        </span>
      </div>
      <div className={`mt-4 grid gap-px overflow-hidden border border-[#d8e5fb] bg-[#d8e5fb] ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {facts.map(({ icon: Icon, name, value }) => (
          <div key={name} className="bg-white px-3 py-3">
            <p className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a8a8a]"><Icon size={12} />{name}</p>
            <p className="mt-1 text-sm font-semibold text-[#202020]">{value}</p>
          </div>
        ))}
      </div>
      {invitationOnboarding && (
        <p className="mt-3 text-[11px] leading-5 text-[#525252]">
          When onboarding ends, existing company data remains available. New premium work follows the organization’s configured runway or manual-review state.
        </p>
      )}
    </section>
  );
}
