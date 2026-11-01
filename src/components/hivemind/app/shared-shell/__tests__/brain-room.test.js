import { brainRoomStorageKey, cachedBrainRoomId, brainRoomUrl } from '../brain-room';
import { brainChatUrl, BRAIN_CHAT } from '../../shared/runtime-workspace';
import { rememberTenant } from '../../shared/boot-cache';

const scope = { tenant: 'org_1', user: 'user_1' };
const store = values => ({ getItem: key => values[key] ?? null });

test('the key is scoped by company and user and refuses parts that could alias another scope', () => {
  expect(brainRoomStorageKey(scope)).toBe('hm:org_1:user_1:brain-room:dot_company_brain');
  expect(brainRoomStorageKey({ tenant: 'a:b', user: 'u' })).toBeNull();
  expect(brainRoomStorageKey({ tenant: 'o' })).toBeNull();
});
test('only a well-formed cached conversation of the same scope is used', () => {
  const key = brainRoomStorageKey(scope);
  expect(cachedBrainRoomId(scope, store({ [key]: 'conv_abc-1_2' }))).toBe('conv_abc-1_2');
  expect(cachedBrainRoomId(scope, store({ [key]: 'dot_company_brain' }))).toBeNull();
  expect(cachedBrainRoomId(scope, store({ [key]: 'conv_<script>' }))).toBeNull();
  expect(cachedBrainRoomId({ tenant: 'org_1', user: 'user_2' }, store({ [key]: 'conv_abc' }))).toBeNull();
  expect(cachedBrainRoomId(scope, null)).toBeNull();
  expect(cachedBrainRoomId(scope, { getItem() { throw new Error('blocked'); } })).toBeNull();
});
test('the room address carries the conversation as ?c= and keeps other query fields', () => {
  expect(brainRoomUrl('conv_x')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_x');
  expect(brainRoomUrl(null, '?hm_locale=de')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?hm_locale=de');
  expect(brainRoomUrl('conv_x', 'c=conv_old&embed=hivemind')).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?embed=hivemind&c=conv_x');
});
test('Brain chat links append the cached conversation when this origin knows it', () => {
  window.localStorage.clear();
  expect(brainChatUrl()).toBe(BRAIN_CHAT);
  rememberTenant('org_1', 'user_1');
  window.localStorage.setItem('hm:org_1:user_1:brain-room:dot_company_brain', 'conv_known');
  expect(brainChatUrl()).toBe('https://brain-runner.singulancelabs.com/dots/dot_company_brain?c=conv_known');
});
