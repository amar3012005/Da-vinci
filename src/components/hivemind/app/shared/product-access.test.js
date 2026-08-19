import { accessDecision, isCompanyOverviewPath, productAccessForPlan, productActionDecision } from './product-access';

describe('product subscription access', () => {
  test('free evaluates every product while paid tiers follow the product ladder', () => {
    expect(productAccessForPlan('free')).toEqual({ brain: true, operatingSystem: true, voice: true });
    expect(productAccessForPlan('plus')).toEqual({ brain: true, operatingSystem: false, voice: false });
    expect(productAccessForPlan('pro')).toEqual({ brain: true, operatingSystem: true, voice: false });
    expect(productAccessForPlan('scale')).toEqual({ brain: true, operatingSystem: true, voice: true });
  });

  test('Your Company remains available to every plan', () => {
    expect(isCompanyOverviewPath('/hivemind/app/employees/mycompany')).toBe(true);
    expect(accessDecision('/hivemind/app/employees/mycompany', 'free').allowed).toBe(true);
    expect(accessDecision('/hivemind/app/employees', 'plus').allowed).toBe(true);
  });

  test('restricted OS and VOICE actions resolve to the correct upgrade', () => {
    expect(accessDecision('/hivemind/app/employees/rooms/abc', 'free').allowed).toBe(true);
    expect(accessDecision('/hivemind/app/employees/rooms/abc', 'plus')).toMatchObject({ allowed: false, requiredPlan: 'pro' });
    expect(accessDecision('/hivemind/app/tara', 'pro')).toMatchObject({ allowed: false, requiredPlan: 'scale' });
    expect(accessDecision('/hivemind/app/tara', 'scale').allowed).toBe(true);
  });

  test('allows browsing and gates only restricted actions', () => {
    expect(productActionDecision({ method: 'get', pathname: '/hivemind/app/employees/rooms/abc', planId: 'plus' }).allowed).toBe(true);
    expect(productActionDecision({ method: 'post', pathname: '/hivemind/app/employees/rooms/abc', planId: 'plus' })).toMatchObject({ allowed: false, requiredPlan: 'pro' });
    expect(productActionDecision({ method: 'post', pathname: '/hivemind/app/employees/mycompany', planId: 'plus' }).allowed).toBe(true);
    expect(productActionDecision({ method: 'post', pathname: '/hivemind/app/tara', planId: 'free' }).allowed).toBe(true);
  });

});
