import React from 'react';
import { render } from '@testing-library/react';
import AgentAvatar from '../AgentAvatar';
import { createEmployeeAppearance } from '../../shared/employee-appearance';
import { resetEmployeeAppearanceCacheForTests } from '../../shared/employee-appearance-cache';

jest.mock('@humation/assets-humation-1', () => ({ humation1: { template: { id: 'humation-1', version: '1.0.1' }, crops: {} } }), { virtual: true });
jest.mock('@humation/core', () => ({
  getPartsForSlot: (_assets, slot) => [{ id: `${slot}-1`, name: 'plain' }],
  createAvatar: (_assets, options) => ({ toJSON: () => ({ template: 'humation-1', crop: 'avatar', background: 'transparent',
    selections: { head: 'head-1', body: 'body-1', bottom: 'bottom-1', item: 'item-1', glasses: 'glasses-1' },
    colors: { hair: '000000', skin: 'ffffff', bottom: '000000', stroke: '000000', clothes: '111111', ...options.colors } }) }),
}), { virtual: true });
jest.mock('@humation/react', () => ({ Avatar: props => <svg data-testid="humation" data-seed={props.seed} data-clothes={props.colors?.clothes}/> }), { virtual: true });

const saved = createEmployeeAppearance('0fe43f0f', { colors: { clothes: 'EC4899' } });
const momo = { id: 'ebee6f09', name: 'Momo', policyRules: { appearance: saved, native_lifecycle: { profile_revision: 1 } } };
const sparse = { id: 'ebee6f09', name: 'Momo' };

beforeEach(() => { window.localStorage.clear(); resetEmployeeAppearanceCacheForTests(); });

test('a sparse roster entry draws the last saved look instead of a generated default', () => {
  const first = render(<AgentAvatar agent={momo} size={72}/>);
  expect(first.getByTestId('humation').dataset.clothes).toBe('EC4899');
  first.unmount();
  // A reload paints a roster cached without policy; the per-employee cache supplies the look.
  resetEmployeeAppearanceCacheForTests();
  const second = render(<AgentAvatar agent={sparse} size={72}/>);
  expect(second.getByTestId('humation').dataset).toMatchObject({ clothes: 'EC4899', seed: '0fe43f0f' });
});

test('an older snapshot does not swap the look, and a newer saved revision does', () => {
  const view = render(<AgentAvatar agent={momo} size={72}/>);
  const older = { ...momo, policyRules: { appearance: createEmployeeAppearance('0fe43f0f', { colors: { clothes: '112233' } }), native_lifecycle: { profile_revision: 0 } } };
  view.rerender(<AgentAvatar agent={older} size={72}/>);
  expect(view.getByTestId('humation').dataset.clothes).toBe('EC4899');
  const newer = { ...momo, policyRules: { appearance: createEmployeeAppearance('0fe43f0f', { colors: { clothes: '445566' } }), native_lifecycle: { profile_revision: 2 } } };
  view.rerender(<AgentAvatar agent={newer} size={72}/>);
  expect(view.getByTestId('humation').dataset.clothes).toBe('445566');
  view.rerender(<AgentAvatar agent={sparse} size={72}/>);
  expect(view.getByTestId('humation').dataset.clothes).toBe('445566');
});
