import { createAvatar, getPartsForSlot } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';
import { useEffect, useSyncExternalStore } from 'react';
import { appearanceRevision, cachedEmployeeAppearance, rememberEmployeeAppearance, subscribeEmployeeAppearances } from './employee-appearance-cache';

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

// Stable, deliberately human defaults. Saved customization always wins.
export function defaultEmployeeAppearance(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const choose = (slot, name) => appearanceParts(slot).find(part => part.name === name).id;
  const clothes = ['5276BB', 'D3A13B', '598878', 'C87755', '408D94', '8470A8'];
  const heads = ['short', 'curly-short', 'wavy-medium', 'lob', 'bun', 'ponytail', 'messy-short', 'braids'];
  const bodies = ['shirt', 'hoodie', 'jacket', 'tee', 'polo'];
  return createEmployeeAppearance(String(seed), {
    selections: {
      head: choose('head', heads[hash % heads.length]),
      body: choose('body', bodies[(hash >>> 4) % bodies.length]),
      item: choose('item', 'none'),
      glasses: choose('glasses', hash % 3 === 0 ? 'round' : 'none'),
    },
    colors: { clothes: clothes[hash % clothes.length], bottom: '283345', hair: ['242124', '634630', '372C29'][(hash >>> 6) % 3],
      skin: ['FFFFFF', 'F5DECC', 'C28F69', '986C51'][(hash >>> 8) % 4], stroke: '171717' },
    background: 'transparent',
  });
}

export function starterEmployeeAppearance(name) {
  const starters = {
    Faraday: { head: 'hm1-p-000011', item: 'hm1-p-000053', clothes: 'E9A637', background: 'FFF0CC' },
    Feynmann: { head: 'hm1-p-000004', item: 'hm1-p-000041', clothes: 'E66A99', background: 'FBE3EC' },
    Turing: { head: 'hm1-p-000003', item: 'hm1-p-000048', clothes: 'E9A637', background: 'EAE7FA' },
  };
  const starter = starters[name];
  if (!starter) return null;
  return createEmployeeAppearance(`starter-${name.toLowerCase()}`, {
    selections: { head: starter.head, body: 'hm1-p-000030', bottom: 'hm1-p-000033', item: starter.item, glasses: 'hm1-p-000056' },
    colors: { stroke: '171717', hair: '171717', skin: 'FFFFFF', clothes: starter.clothes, bottom: '283345' },
    background: starter.background,
  });
}

/**
 * The saved appearance to draw: the profile's own, unless the cache holds a newer revision or the profile carries none.
 * @param {object} agent - employee or roster profile.
 * @param {{ appearance: object, revision: number | undefined } | undefined} cached - cache entry for the agent's id.
 * @returns {object | null} validated appearance, or null when no saved appearance is known.
 */
export function knownEmployeeAppearance(agent, cached) {
  const own = employeeAppearance(agent);
  const remembered = cached ? employeeAppearance({ policyRules: { appearance: cached.appearance } }) : null;
  if (!remembered) return own;
  if (!own) return remembered;
  const revision = appearanceRevision(agent);
  if (revision === undefined) return cached.revision === undefined ? own : remembered;
  return cached.revision !== undefined && cached.revision > revision ? remembered : own;
}

/**
 * Hook form of {@link knownEmployeeAppearance}; also records the profile's own appearance for later renders.
 * @param {object} agent - employee or roster profile.
 * @returns {object | null} appearance, or null when none is known yet.
 */
export function useKnownEmployeeAppearance(agent) {
  const id = agent?.id;
  const cached = useSyncExternalStore(subscribeEmployeeAppearances, () => cachedEmployeeAppearance(id), () => undefined);
  useEffect(() => { rememberEmployeeAppearance(agent); }, [agent]);
  return knownEmployeeAppearance(agent, cached);
}
