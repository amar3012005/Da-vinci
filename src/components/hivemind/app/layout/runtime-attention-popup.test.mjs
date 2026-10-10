import assert from 'node:assert/strict';
import test from 'node:test';
import { isRuntimeAttention, nextAttentionPopup, runtimeAttentionCopy } from './runtime-attention-popup.mjs';

const notice = { id: 'signal-one', type: 'runtime.attention', title: 'Slack update', data: { inboxPersisted: true, action: 'notify' } };
test('only persisted Runtime admission receipts can open the popup', () => {
  assert.equal(isRuntimeAttention(notice), true);
  assert.equal(isRuntimeAttention({ ...notice, data: { inboxPersisted: false } }), false);
  assert.equal(isRuntimeAttention({ ...notice, type: 'other' }), false);
});
test('notify and wake describe admission without claiming processing or email', () => {
  assert.equal(runtimeAttentionCopy(notice).description, 'Queued for Runtime’s next turn.');
  assert.equal(runtimeAttentionCopy({ ...notice, data: { wakeRequested: true } }).description, 'Waiting for Runtime to assess this update.');
  assert.doesNotMatch(runtimeAttentionCopy(notice).description, /email|processing|sent|delivered/i);
});
test('seen/read admissions do not reopen; another queued receipt remains eligible', () => {
  const next = { ...notice, id: 'signal-two' };
  assert.equal(nextAttentionPopup([notice, next], item => item.id === notice.id), next);
  assert.equal(nextAttentionPopup([{ ...notice, read_at: 'today' }], () => false), undefined);
  assert.equal(nextAttentionPopup([{ ...notice, data: {} }], () => false), undefined);
});
