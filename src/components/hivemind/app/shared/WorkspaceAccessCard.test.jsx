import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkspaceAccessCard from './WorkspaceAccessCard';

const invitationBilling = {
  plan: { id: 'enterprise', name: 'Enterprise', limits: { tokens: -1, searches: -1 } },
  organization: { account_type: 'enterprise_managed', hosting_mode: 'managed', memory_storage_mode: 'hybrid' },
  entitlement: {
    source: 'enterprise_invitation', phase: 'onboarding', status: 'active',
    effective_until: '2026-08-21T00:00:00.000Z', account_type: 'enterprise_managed',
    hosting_mode: 'managed', storage_mode: 'hybrid',
  },
};

test('shows the invitation phase without exposing invitation secrets', () => {
  const html = renderToStaticMarkup(<WorkspaceAccessCard billing={invitationBilling} />);
  expect(html).toContain('Enterprise invitation onboarding');
  expect(html).toContain('Unlimited pilot');
  expect(html).toContain('Enterprise Managed');
  expect(html).not.toMatch(/recovery code/i);
});

test('stops using invitation language after runway becomes authoritative', () => {
  const html = renderToStaticMarkup(<WorkspaceAccessCard billing={{
    ...invitationBilling,
    plan: { id: 'enterprise', name: 'Enterprise', limits: { tokens: 10_000_000 } },
    entitlement: { ...invitationBilling.entitlement, source: 'stripe', phase: 'runway', effective_until: null },
  }} />);
  expect(html).toContain('Current workspace access');
  expect(html).not.toContain('Unlimited pilot');
});
