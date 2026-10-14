import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceParts, defaultEmployeeAppearance, employeeAppearance } from '../src/components/hivemind/app/shared/employee-appearance.js';
test('human defaults are stable, varied and valid native appearance records', () => {
  const avatars = ['Luna', 'Sia', 'Clip', 'Kepler', 'Leo', 'Milo'].map(defaultEmployeeAppearance);
  assert.ok(new Set(avatars.map(a => a.colors.clothes)).size > 2);
  assert.deepEqual(defaultEmployeeAppearance('Luna'), avatars[0]);
  for (const appearance of avatars) {
    assert.deepEqual(employeeAppearance({ policyRules: { appearance } }), appearance);
    assert.equal(appearance.selections.item, appearanceParts('item').find(p => p.name === 'none').id);
    assert.notEqual(appearance.selections.glasses, appearanceParts('glasses').find(p => p.name === 'tiny').id);
  }
});

test('starter avatars have fixed parts and matching canonical native appearance records', async () => {
  const { starterEmployeeAppearance } = await import('../src/components/hivemind/app/shared/employee-appearance.js');
  const expected = [['Faraday','hm1-p-000053','FFF0CC'],['Feynmann','hm1-p-000041','FBE3EC'],['Turing','hm1-p-000048','EAE7FA']];
  for (const [name,item,background] of expected) {
    const appearance = starterEmployeeAppearance(name);
    assert.equal(appearance.selections.item,item);
    assert.equal(appearance.background,background);
    assert.deepEqual(employeeAppearance({policyRules:{appearance}}),appearance);
  }
  assert.equal(starterEmployeeAppearance('Someone'),null);
});
