export const PRODUCT_SECTIONS = Object.freeze({
  BRAIN: 'hivemind',
  OPERATING_SYSTEM: 'hyperagents',
  VOICE: 'tara',
});

const PLAN_ACCESS = Object.freeze({
  // Free is the evaluation tier: all products remain usable under the
  // existing usage ceilings. Paid tiers purchase a specific product ladder.
  free:       { brain: true, operatingSystem: true,  voice: true },
  plus:       { brain: true, operatingSystem: false, voice: false },
  pro:        { brain: true, operatingSystem: true,  voice: false },
  scale:      { brain: true, operatingSystem: true,  voice: true },
  enterprise: { brain: true, operatingSystem: true,  voice: true },
  // Legacy paid plan ids remain usable while old subscriptions are migrated.
  team:       { brain: true, operatingSystem: true,  voice: false },
  business:   { brain: true, operatingSystem: true,  voice: false },
});

export function normalizePlanId(planId) {
  return String(planId || 'free').trim().toLowerCase();
}

export function productAccessForPlan(planId) {
  return PLAN_ACCESS[normalizePlanId(planId)] || PLAN_ACCESS.free;
}

export function productForPath(pathname = '') {
  if (pathname.startsWith('/hivemind/app/employees')) return 'operatingSystem';
  if (pathname.startsWith('/hivemind/app/tara')) return 'voice';
  return 'brain';
}

export function isCompanyOverviewPath(pathname = '') {
  return /^\/hivemind\/app\/employees(?:\/mycompany)?\/?$/.test(pathname);
}

export function accessDecision(pathname, planId) {
  const product = productForPath(pathname);
  const access = productAccessForPlan(planId);
  if (product === 'brain' || access[product] || isCompanyOverviewPath(pathname)) {
    return { allowed: true, product, requiredPlan: null, fallback: null };
  }
  return product === 'voice'
    ? { allowed: false, product, requiredPlan: 'scale', fallback: '/hivemind/app/overview' }
    : { allowed: false, product, requiredPlan: 'pro', fallback: '/hivemind/app/employees/mycompany' };
}

export function actionAccessDecision(pathname, planId) {
  return accessDecision(pathname, planId);
}

export function productActionDecision({ method = 'get', pathname = '', planId = 'free' } = {}) {
  if (['get', 'head', 'options'].includes(String(method).toLowerCase())) {
    return { allowed: true, product: productForPath(pathname), requiredPlan: null };
  }
  return actionAccessDecision(pathname, planId);
}
