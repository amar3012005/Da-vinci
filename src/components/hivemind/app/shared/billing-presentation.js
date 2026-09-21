const PERSONAL_PLAN_ORDER = ['free', 'plus', 'pro', 'scale'];

export function isEnterpriseBillingWorkspace({ billing, org, currentPlan }) {
  const entitlement = billing?.entitlement || {};
  const accountType = entitlement.account_type
    || billing?.organization?.account_type
    || org?.accountType
    || org?.account_type
    || '';
  const plan = String(currentPlan || '').toLowerCase();

  return billing?.billing_model === 'enterprise_contract'
    || plan === 'enterprise'
    || plan.startsWith('enterprise_')
    || entitlement.source === 'enterprise_invitation'
    || String(accountType).toLowerCase().startsWith('enterprise');
}

export function orderedPersonalPlans(plans) {
  const byId = new Map((plans || []).map((plan) => [plan.id, plan]));
  return PERSONAL_PLAN_ORDER.map((id) => byId.get(id)).filter(Boolean);
}
