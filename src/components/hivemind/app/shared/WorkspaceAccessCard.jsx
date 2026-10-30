import React from 'react';
import { Building2, CalendarDays, Cloud, Database, Infinity as InfinityIcon, Server, ShieldCheck } from 'lucide-react';
import { useCopy, useLocaleFormat, usePlanLabel } from '../layout/sidebar-copy';

const label = (value, fallback = 'Not specified') => value
  ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : fallback;

export default function WorkspaceAccessCard({ billing, compact = false }) {
  const tx = useCopy('outerApp.workspaceAccess');
  const format = useLocaleFormat();
  const planLabelFor = usePlanLabel();
  /** A known value reads its dictionary entry; any other value reads as readable English words. */
  const word = (group, value, fallback) => (value ? tx(`${group}.${String(value).toLowerCase()}`, label(value)) : fallback);
  const date = (value) => value
    ? format.date(value, { day: 'numeric', month: 'long', year: 'numeric' })
    : tx('noExpiry', 'No fixed expiry');
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
  const title = invitationOnboarding ? tx('titleInvitation', 'Enterprise invitation onboarding') : tx('title', 'Current workspace access');

  const facts = [
    { icon: Building2, name: tx('account', 'Account'), value: word('accountType', accountType, tx('notSpecified', 'Not specified')) },
    { icon: hostingMode === 'self_host' ? Server : Cloud, name: tx('infrastructure', 'Infrastructure'), value: hostingMode === 'self_host' ? tx('selfHosted', 'Self-hosted') : tx('managed', 'Managed') },
    { icon: Database, name: tx('memoryStorage', 'Memory storage'), value: word('storageMode', storageMode, tx('notSpecified', 'Not specified')) },
    { icon: CalendarDays, name: invitationOnboarding ? tx('onboardingEnds', 'Onboarding ends') : tx('accessPeriod', 'Access period'), value: date(entitlement?.effective_until) },
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
              {invitationOnboarding ? tx('invitationActive', 'Invitation active') : planLabelFor(plan.id || plan.name || 'free')}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[#0a0a0a]">{title}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#525252]">
              {invitationOnboarding
                ? tx('invitationBody', 'Your organization is operating under its invitation configuration. Usage is measured normally, while the pilot allowance remains unlimited until onboarding ends.')
                : tx('body', 'This is the server-authoritative account, infrastructure, storage, and entitlement currently applied to your organization.')}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-[#9fc1f8] bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#117dff]">
          {unlimitedPilot && <InfinityIcon size={12} />}{unlimitedPilot ? tx('unlimitedPilot', 'Unlimited pilot') : word('status', entitlement?.status || 'Active')}
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
          {tx('onboardingEndsNote', 'When onboarding ends, existing company data remains available. New premium work follows the organization’s configured runway or manual-review state.')}
        </p>
      )}
    </section>
  );
}
