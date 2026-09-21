import { isEnterpriseBillingWorkspace, orderedPersonalPlans } from './billing-presentation';

describe('billing presentation', () => {
  test.each([
    [{ currentPlan: 'enterprise_onboarding' }],
    [{ currentPlan: 'enterprise' }],
    [{ currentPlan: 'free', billing: { billing_model: 'enterprise_contract' } }],
    [{ currentPlan: 'free', billing: { entitlement: { source: 'enterprise_invitation' } } }],
    [{ currentPlan: 'free', billing: { entitlement: { account_type: 'enterprise_managed' } } }],
  ])('classifies enterprise workspaces', (input) => {
    expect(isEnterpriseBillingWorkspace(input)).toBe(true);
  });

  test('keeps personal workspaces in self-serve billing', () => {
    expect(isEnterpriseBillingWorkspace({ currentPlan: 'plus', org: { account_type: 'personal' } })).toBe(false);
  });

  test('filters enterprise offers and orders personal plans consistently', () => {
    const plans = [
      { id: 'enterprise' },
      { id: 'scale' },
      { id: 'free' },
      { id: 'pro' },
      { id: 'plus' },
    ];
    expect(orderedPersonalPlans(plans).map((plan) => plan.id)).toEqual(['free', 'plus', 'pro', 'scale']);
  });
});
