import {
  clearInvitationContext,
  loadInvitationContext,
  saveInvitationContext,
} from '../invitation-session';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('retains an enterprise invitation through reload without changing its profile', () => {
  const target = storage();
  expect(saveInvitationContext({
    kind: 'enterprise', credential: 'secure-link-token',
    preview: { account_type: 'enterprise_managed', hosting_mode: 'managed', invitation_expires_at: '2026-08-22T00:00:00.000Z' },
  }, target)).toBe(true);
  expect(loadInvitationContext(target, Date.parse('2026-08-10T00:00:00.000Z'))).toMatchObject({
    kind: 'enterprise', credential: 'secure-link-token',
    preview: { account_type: 'enterprise_managed', hosting_mode: 'managed' },
  });
});

test('retains personal invitation links but drops expired credentials', () => {
  const target = storage();
  saveInvitationContext({ kind: 'personal', credential: 'personal-link-token', expires_at: '2026-08-12T00:00:00.000Z' }, target);
  expect(loadInvitationContext(target, Date.parse('2026-08-11T00:00:00.000Z'))).toMatchObject({ kind: 'personal' });
  expect(loadInvitationContext(target, Date.parse('2026-08-13T00:00:00.000Z'))).toBeNull();
});

test('retains a partner referral and its exact attributed offer', () => {
  const target = storage();
  saveInvitationContext({ kind: 'referral', credential: 'campaign.version.signature', preview: {
    referrer: { display_name: 'Wolfgang' }, offer: { account_type: 'personal', plan: 'pro', trial_days: 21, monthly_credits: 5000 },
  } }, target);
  expect(loadInvitationContext(target)).toMatchObject({ kind: 'referral', credential: 'campaign.version.signature', preview: {
    referrer: { display_name: 'Wolfgang' }, offer: { plan: 'pro', trial_days: 21, monthly_credits: 5000 },
  } });
});

test('clear removes invitation context after admission exchange', () => {
  const target = storage();
  saveInvitationContext({ kind: 'personal', credential: 'personal-link-token' }, target);
  clearInvitationContext(target);
  expect(loadInvitationContext(target)).toBeNull();
});
