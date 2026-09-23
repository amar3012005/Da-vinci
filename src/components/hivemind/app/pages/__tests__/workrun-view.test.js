import {
  applyAgentEvent,
  applyWorkRunEvent,
  emptyWorkRunView,
  hasRunningTools,
  normalizeTurnUsage,
  hydrateRegisteredArtifacts,
  transcriptText,
  isProductKind,
  productFailure,
  startUserTurn,
  toolLabel,
  upsertBlock,
} from '../hm-rooms-dsh/workrun-view';

describe('WorkRun identity-keyed block registry', () => {
  const runId = '11111111-1111-4111-8111-111111111111';

  it('keeps each company plan task as its own block', () => {
    let view = emptyWorkRunView(runId);
    for (let i = 0; i < 15; i += 1) {
      view = applyWorkRunEvent(view, {
        type: 'TOOL_CALL_START',
        tool_call_name: 'TaskCreate',
        tool_call_id: `t${i}`,
        execution_mode: 'operating_plan',
      });
    }
    const plans = view.blockOrder.map((id) => view.blocks[id]).filter((b) => b.kind === 'plan');
    expect(plans).toHaveLength(15);
    expect(new Set(plans.map((block) => block.block_id)).size).toBe(15);
  });

  it('keeps ordinary Task tools out of the company operating-plan checklist', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, { type: 'TOOL_CALL_START', tool_call_name: 'TaskCreate', tool_call_id: 'direct-task' });
    expect(view.tasks).toEqual([]);
    expect(view.activity[0]).toMatchObject({ kind: 'tool', name: 'TaskCreate', id: `tool:${runId}:direct-task` });
  });

  it('projects tool identity, input, and result for expandable call rows', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'TOOL_CALL_START', tool_call_name: 'Bash', tool_call_id: 'shell-1', input: { command: 'pwd' },
    });
    view = applyWorkRunEvent(view, {
      type: 'TOOL_RESULT_END', tool_call_id: 'shell-1', output: '/workspace/project',
    });
    expect(view.activity[0]).toMatchObject({
      id: `tool:${runId}:shell-1`, kind: 'tool', name: 'Bash', input: { command: 'pwd' }, result: '/workspace/project', status: 'complete',
    });
  });

  it('does not mark a tool complete when only its call arguments have ended', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, { type: 'TOOL_CALL_START', tool_call_name: 'Bash', tool_call_id: 'call-2', input: { command: 'echo hi' } });
    view = applyWorkRunEvent(view, { type: 'TOOL_CALL_END', tool_call_id: 'call-2' });
    expect(view.activity[0].status).toBe('streaming');
    expect(hasRunningTools(view)).toBe(true);
    view = applyWorkRunEvent(view, { type: 'TOOL_RESULT_END', tool_call_id: 'call-2', output: 'hi' });
    expect(view.activity[0]).toMatchObject({ status: 'complete', result: 'hi' });
  });

  it('seals in-flight tools as failed when the run fails, so the UI can return to idle', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, { type: 'tool.started', tool_name: 'web_search', tool_call_id: 'stuck' });
    view = applyWorkRunEvent(view, { t: 'workrun.failed', reason: 'provider unavailable' });
    expect(hasRunningTools(view)).toBe(false);
    expect(view.activity[0].status).toBe('failed');
    expect(view.status).toBe('failed');
  });

  it('hydrates registered artifacts as named preview cards', () => {
    const view = hydrateRegisteredArtifacts(emptyWorkRunView(runId), [{ id: 'a1', path: '/v1/hyper-artifacts/reports/Italy-prospects.csv', content_type: 'text/csv' }]);
    expect(view.artifacts[0].payload).toMatchObject({ artifact_id: 'a1', label: 'Italy-prospects.csv', content_type: 'text/csv' });
  });

  it('flattens object content without rendering raw objects', () => {
    expect(transcriptText({ type: 'text', text: 'Readable answer' })).toBe('Readable answer');
    expect(transcriptText({ unexpected: 'payload' })).toBe('');
  });

  it('projects a task checklist only from an explicit company operating-plan snapshot', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      t: 'plan.updated', execution_mode: 'operating_plan', tasks: [
        { id: 'a', subject: 'Research market', status: 'completed' },
        { id: 'b', subject: 'Build target set', status: 'pending', blocked_by: ['a'] },
      ],
    });
    expect(view.tasks).toEqual([
      expect.objectContaining({ id: 'a', label: 'Research market', status: 'complete' }),
      expect.objectContaining({ id: 'b', label: 'Build target set', status: 'pending', blocked_by: ['a'] }),
    ]);
  });

  it('normalizes reported cached-token usage without inventing missing values', () => {
    expect(normalizeTurnUsage({ input_tokens: 100, output_tokens: 20, cached_input_tokens: 25, provider: 'gateway' })).toMatchObject({
      inputTokens: 100, outputTokens: 20, cachedInputTokens: 25, uncachedInputTokens: 75, totalTokens: 120, cacheHitPercent: 25,
    });
    expect(normalizeTurnUsage({ input_tokens: 100 })).toMatchObject({ cachedInputTokens: null, cacheHitPercent: null });
  });

  it('upserts the same tool call_id instead of appending a second row', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'TOOL_CALL_START',
      tool_call_name: 'hivemind_recall',
      tool_call_id: 'c1',
    });
    view = applyWorkRunEvent(view, {
      type: 'TOOL_RESULT_END',
      tool_call_id: 'c1',
      text: 'Amar Sai',
    });
    const tools = Object.values(view.blocks).filter((b) => b.kind === 'tool');
    expect(tools).toHaveLength(1);
    expect(tools[0].block_id).toBe(`tool:${runId}:c1`);
    expect(tools[0].revision).toBeGreaterThanOrEqual(2);
    expect(tools[0].status).toBe('complete');
    expect(tools[0].payload.label).toBe('Checked company memory');
    expect(view.sources).toHaveLength(1);
  });

  it('maps recall to a human label, not raw args', () => {
    expect(toolLabel('hivemind_recall')).toBe('Checked company memory');
    expect(toolLabel('hivemind_company_context')).toBe('Read company context');
  });

  it('keeps working tools streaming after a status idle event', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'TOOL_CALL_START',
      tool_call_name: 'hivemind_web_search',
      tool_call_id: 'c2',
    });
    view = applyWorkRunEvent(view, { t: 'agent.status', status: 'idle' });
    expect(hasRunningTools(view)).toBe(true);
    expect(view.status).toBe('idle');
  });

  it('rejects unknown block kinds', () => {
    const view = upsertBlock(emptyWorkRunView(runId), {
      block_id: 'x',
      kind: 'react-component',
      payload: {},
    });
    expect(view.blockOrder).toHaveLength(0);
  });

  it('reuses the same reply_id after HITL instead of a second assistant row', () => {
    let msgs = startUserTurn([], 'go');
    msgs = applyAgentEvent(msgs, { type: 'REPLY_START', reply_id: 'r1' });
    msgs = applyAgentEvent(msgs, { type: 'TEXT_BLOCK_DELTA', delta: 'first' });
    msgs = applyAgentEvent(msgs, { type: 'REPLY_END' });
    msgs = applyAgentEvent(msgs, { type: 'REPLY_START', reply_id: 'r1' });
    msgs = applyAgentEvent(msgs, { type: 'TEXT_BLOCK_DELTA', delta: ' first continued' });
    const asst = msgs.filter((m) => m.role === 'assistant');
    expect(asst).toHaveLength(1);
    expect(asst[0].reply_id).toBe('r1');
    expect(asst[0].text).toContain('first');
  });

  it('sanitizes Gateway invalid_request into a product failure', () => {
    const fail = productFailure({
      t: 'workrun.failed',
      error: { type: 'invalid_request', message: 'The request to the model was rejected as invalid.' },
    });
    expect(fail.code).toBe('MODEL_INVALID_REQUEST');
    expect(fail.message).not.toMatch(/invalid_request/);
    expect(isProductKind('failed')).toBe(true);
    expect(isProductKind('react-component')).toBe(false);
  });

  it('keeps thinking and text streaming after a tool call', () => {
    let msgs = startUserTurn([], 'what do u know about me?');
    msgs = applyAgentEvent(msgs, { type: 'REPLY_START' });
    msgs = applyAgentEvent(msgs, { type: 'THINKING_BLOCK_DELTA', delta: 'I will look this up.' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_CALL_START', tool_call_name: 'hivemind_company_context', tool_call_id: 'c1' });
    msgs = applyAgentEvent(msgs, { type: 'REPLY_END' });
    msgs = applyAgentEvent(msgs, { type: 'TEXT_BLOCK_DELTA', delta: 'Here is what I know.' });
    const asst = msgs.filter((m) => m.role === 'assistant');
    expect(asst).toHaveLength(1);
    expect(asst[0].thinking).toContain('look this up');
    expect(asst[0].tools).toHaveLength(1);
    expect(asst[0].text).toContain('Here is what I know');
    expect(asst[0].streaming).toBe(true);
  });

  it('renders follow-up turns as separate assistant blocks and seals on completion', () => {
    let msgs = startUserTurn([], 'first question');
    msgs = applyAgentEvent(msgs, { type: 'TEXT_BLOCK_DELTA', delta: 'first answer' });
    msgs = applyAgentEvent(msgs, { type: 'REPLY_END' });
    msgs = startUserTurn(msgs, 'follow up');
    msgs = applyAgentEvent(msgs, { type: 'turn.started', turn_id: 'turn-2' });
    msgs = applyAgentEvent(msgs, { type: 'thinking.delta', delta: 'checking context' });
    msgs = applyAgentEvent(msgs, { type: 'text.delta', delta: 'second answer' });
    msgs = applyAgentEvent(msgs, { type: 'turn.completed', turn_id: 'turn-2' });
    const assistants = msgs.filter((message) => message.role === 'assistant');
    expect(assistants).toHaveLength(2);
    expect(assistants[0].text).toBe('first answer');
    expect(assistants[1].thinking).toContain('checking context');
    expect(assistants[1].text).toBe('second answer');
    expect(assistants[1].streaming).toBe(false);
  });
});
