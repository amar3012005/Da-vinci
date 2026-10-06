import { createAvatar, getPartsForSlot } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';

export const APPEARANCE_SLOTS = ['head', 'body', 'bottom', 'item', 'glasses'];
export const APPEARANCE_COLORS = ['hair', 'clothes', 'bottom', 'skin', 'stroke'];
export const appearanceParts = slot => getPartsForSlot(humation1, slot);

export function createEmployeeAppearance(seed, options = {}) {
  const resolved = createAvatar(humation1, { seed, background: 'transparent', ...options }).toJSON();
  return { version: 1, provider: 'humation', template: resolved.template, asset_version: humation1.template.version,
    seed, selections: resolved.selections, colors: resolved.colors, background: resolved.background, crop: resolved.crop };
}

export function employeeAppearance(agent) {
  const appearance = agent?.policyRules?.appearance || agent?.policy_rules?.appearance;
  if (!appearance || appearance.version !== 1 || appearance.provider !== 'humation'
    || appearance.template !== humation1.template.id || appearance.asset_version !== humation1.template.version
    || appearance.crop !== 'avatar' || typeof appearance.seed !== 'string'
    || !APPEARANCE_SLOTS.every(slot => appearanceParts(slot).some(part => part.id === appearance.selections?.[slot]))
    || !APPEARANCE_COLORS.every(slot => /^[0-9a-f]{6}$/i.test(appearance.colors?.[slot] || ''))
    || !(appearance.background === 'transparent' || /^[0-9a-f]{6}$/i.test(appearance.background))) return null;
  return appearance;
}
