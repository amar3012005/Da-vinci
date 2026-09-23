import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferConnectContinuation } from './connect-continuation.js';

describe('inferConnectContinuation', () => {
  it('builds Slack connect_account from assistant copy', () => {
    const c = inferConnectContinuation({
      text: 'I need your input to continue. Connect Slack to continue, then return here.',
    });
    assert.equal(c.requests[0].kind, 'connect_account');
    assert.equal(c.requests[0].toolkit, 'slack');
    assert.equal(c.requests[0].options[0].label, 'Connect Slack');
    assert.equal(c.requests[0].options[1].id, 'connected');
  });

  it('reads need_connect from a tool result', () => {
    const c = inferConnectContinuation({
      tools: [{ name: 'hivemind_composio_execute', result: '{"error":"no grant","need_connect":true,"toolkit":"gmail"}' }],
    });
    assert.equal(c.requests[0].toolkit, 'gmail');
  });
});
