import { createEmployeeAppearance, knownEmployeeAppearance } from './employee-appearance';
import {
  EMPLOYEE_APPEARANCE_CACHE_KEY, appearanceRevision, cachedEmployeeAppearance,
  rememberEmployeeAppearance, resetEmployeeAppearanceCacheForTests,
} from './employee-appearance-cache';

jest.mock('@humation/assets-humation-1', () => ({ humation1: { template: { id: 'humation-1', version: '1.0.1' }, crops: {} } }), { virtual: true });
jest.mock('@humation/core', () => ({
  getPartsForSlot: (_assets, slot) => [{ id: `${slot}-1`, name: 'plain' }],
  createAvatar: (_assets, options) => ({ toJSON: () => ({ template: 'humation-1', crop: 'avatar', background: 'transparent',
    selections: { head: 'head-1', body: 'body-1', bottom: 'bottom-1', item: 'item-1', glasses: 'glasses-1' },
    colors: { hair: '000000', skin: 'ffffff', bottom: '000000', stroke: '000000', clothes: '111111', ...options.colors } }) }),
}), { virtual: true });

const look = (seed, clothes) => createEmployeeAppearance(seed, { colors: { clothes } });
const employee = (id, appearance, revision) => ({ id, name: 'Momo', policyRules: { appearance, ...(revision === undefined ? {} : { native_lifecycle: { profile_revision: revision } }) } });

beforeEach(() => { window.localStorage.clear(); resetEmployeeAppearanceCacheForTests(); });

test('keeps the saved look and replaces it only with a newer profile revision', () => {
  const saved = look('momo', 'EC4899'); const edited = look('momo', '8755D8');
  expect(rememberEmployeeAppearance(employee('e1', saved, 3))).toBe(true);
  expect(rememberEmployeeAppearance(employee('e1', edited, 2))).toBe(false);
  expect(rememberEmployeeAppearance(employee('e1', edited))).toBe(false);
  expect(cachedEmployeeAppearance('e1').appearance).toEqual(saved);
  expect(rememberEmployeeAppearance(employee('e1', edited, 4))).toBe(true);
  expect(cachedEmployeeAppearance('e1')).toMatchObject({ appearance: edited, revision: 4 });
});

test('survives a reload through the boot cache namespace and drops entries that no longer validate', () => {
  const saved = look('momo', 'EC4899');
  rememberEmployeeAppearance(employee('e1', saved, 1));
  expect(EMPLOYEE_APPEARANCE_CACHE_KEY.startsWith('hivemind.boot.v1:')).toBe(true);
  const stored = JSON.parse(window.localStorage.getItem(EMPLOYEE_APPEARANCE_CACHE_KEY));
  stored.entries.push(['e2', { appearance: { version: 1, provider: 'other' }, revision: 1 }]);
  window.localStorage.setItem(EMPLOYEE_APPEARANCE_CACHE_KEY, JSON.stringify(stored));
  resetEmployeeAppearanceCacheForTests();
  expect(cachedEmployeeAppearance('e1').appearance).toEqual(saved);
  expect(cachedEmployeeAppearance('e2')).toBeUndefined();
});

test('a sparse or older profile never replaces the cached look, a newer or equal own profile does', () => {
  const cached = { appearance: look('momo', 'EC4899'), revision: 3 };
  expect(knownEmployeeAppearance({ id: 'e1', name: 'Momo' }, cached)).toEqual(cached.appearance);
  expect(knownEmployeeAppearance({ id: 'e1', name: 'Momo', policy_rules: {} }, cached)).toEqual(cached.appearance);
  const older = employee('e1', look('momo', '8755D8'), 2);
  expect(knownEmployeeAppearance(older, cached)).toEqual(cached.appearance);
  const newer = employee('e1', look('momo', '8755D8'), 4);
  expect(knownEmployeeAppearance(newer, cached)).toEqual(newer.policyRules.appearance);
  expect(knownEmployeeAppearance({ id: 'e1' }, undefined)).toBeNull();
  expect(appearanceRevision({ policy_rules: { native_lifecycle: { profile_revision: 7 } } })).toBe(7);
});

test('blocked storage is a cache miss, not an error', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    resetEmployeeAppearanceCacheForTests();
    expect(rememberEmployeeAppearance(employee('e1', look('momo', 'EC4899'), 1))).toBe(true);
    expect(cachedEmployeeAppearance('e1')).toBeDefined();
  } finally { Object.defineProperty(window, 'localStorage', original); }
});
