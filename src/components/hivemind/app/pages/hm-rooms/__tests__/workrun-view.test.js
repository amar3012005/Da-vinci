import {
  applyAgentEvent,
  applyWorkRunEvent,
  emptyWorkRunView,
  hasRunningTools,
  hydrateRegisteredArtifacts,
  isProductKind,
  productFailure,
  resolveApproval,
  startUserTurn,
  toolLabel,
  upsertBlock,
} from '../hm-rooms-dsh/workrun-view';

describe('WorkRun identity-keyed block registry', () => {
  const runId = '11111111-1111-4111-8111-111111111111';

  it('upserts many TaskCreate events onto one plan block', () => {
    let view = emptyWorkRunView(runId);
    for (let i = 0; i < 15; i += 1) {
      view = applyWorkRunEvent(view, {
        type: 'TOOL_CALL_START',
        tool_call_name: 'TaskCreate',
        tool_call_id: `t${i}`,
      });
    }
    const plans = view.blockOrder.map((id) => view.blocks[id]).filter((b) => b.kind === 'plan');
    expect(plans).toHaveLength(1);
    expect(plans[0].revision).toBeGreaterThanOrEqual(15);
  });

  it('renders the compact AgentScope task snapshot without creating a second task store', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      t: 'plan.updated',
      family: 'task',
      tasks: [
        { id: 'task-1', subject: 'Gather context', state: 'completed' },
        { id: 'task-2', subject: 'Draft the report', state: 'in_progress', blocked_by: ['task-1'] },
      ],
    });
    expect(view.tasks).toEqual([
      expect.objectContaining({ id: 'task-1', label: 'Gather context', status: 'complete' }),
      expect.objectContaining({ id: 'task-2', label: 'Draft the report', status: 'streaming', blocked_by: ['task-1'] }),
    ]);
    expect(view.blocks[`plan:${runId}`].payload.tasks).toHaveLength(2);
  });

  it('upserts the native PlanNotebook task projection into that same plan block', () => {
    let view = applyWorkRunEvent(emptyWorkRunView(runId), {
      t: 'plan.updated',
      tasks: [{ id: 'old-task', subject: 'Old plan', state: 'todo' }],
    });
    view = applyWorkRunEvent(view, {
      t: 'task_plan',
      source: 'agentscope_plan_notebook',
      name: 'Germany research',
      description: 'Find and verify target accounts.',
      expected_outcome: 'A qualified account list.',
      subtasks: [
        { id: '0', title: 'Load company context', status: 'done' },
        { id: '1', title: 'Research accounts', status: 'in_progress' },
      ],
    });
    const plan = view.blocks[`plan:${runId}`];
    expect(plan.revision).toBeGreaterThanOrEqual(2);
    expect(plan.payload).toMatchObject({
      name: 'Germany research',
      label: 'Operating plan',
      description: 'Find and verify target accounts.',
      expected_outcome: 'A qualified account list.',
    });
    expect(view.tasks).toEqual([
      expect.objectContaining({ id: '0', label: 'Load company context', status: 'complete' }),
      expect.objectContaining({ id: '1', label: 'Research accounts', status: 'streaming' }),
    ]);
  });

  it('upserts the same tool call_id instead of appending a second row', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'TOOL_CALL_START',
      tool_call_name: 'hivemind_recall',
      tool_call_id: 'c1',
    });
    view = applyWorkRunEvent(view, {
      t: 'tool.completed',
      tool_call_id: 'c1',
      result: 'Amar Sai',
    });
    const tools = Object.values(view.blocks).filter((b) => b.kind === 'tool');
    expect(tools).toHaveLength(1);
    expect(tools[0].block_id).toBe(`tool:${runId}:c1`);
    expect(tools[0].revision).toBeGreaterThanOrEqual(2);
    expect(tools[0].status).toBe('complete');
    expect(tools[0].payload.label).toBe('Checked company memory');
    expect(tools[0].payload.result).toBe('Amar Sai');
    expect(view.sources).toHaveLength(1);
  });

  it('keeps tool input and output inspectable across streamed deltas', () => {
    let view = applyWorkRunEvent(emptyWorkRunView(runId), {
      type: 'TOOL_CALL_START', tool_call_name: 'hivemind_recall', tool_call_id: 'inspect-1',
    });
    view = applyWorkRunEvent(view, { t: 'tool.input.delta', call_id: 'inspect-1', delta: '{"query":"ICP"}' });
    view = applyWorkRunEvent(view, { t: 'tool.output.delta', call_id: 'inspect-1', delta: 'Matched 3 records.' });
    view = applyWorkRunEvent(view, { type: 'TOOL_CALL_END', tool_call_id: 'inspect-1' });
    expect(view.blocks[`tool:${runId}:inspect-1`].status).toBe('streaming');
    view = applyWorkRunEvent(view, { t: 'tool.completed', call_id: 'inspect-1' });
    const tool = view.blocks[`tool:${runId}:inspect-1`];
    expect(tool.status).toBe('complete');
    expect(tool.payload.input).toContain('ICP');
    expect(tool.payload.result).toBe('Matched 3 records.');
  });

  it('hydrates persisted artifact ids when a completed run is reopened', () => {
    const artifactId = 'f2a25f03-9dab-4772-a06d-2a599d5ea7c0';
    const view = hydrateRegisteredArtifacts(emptyWorkRunView(runId), [artifactId]);
    expect(view.artifacts).toHaveLength(1);
    expect(view.artifacts[0].payload.artifact_id).toBe(artifactId);
    expect(view.artifacts[0].payload.label).toBe('Registered artifact');
  });

  it('maps recall to a human label, not raw args', () => {
    expect(toolLabel('hivemind_recall')).toBe('Checked company memory');
    expect(toolLabel('hivemind_company_context')).toBe('Read company context');
  });

  it('retains the original tool identifier for the transcript', () => {
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'TOOL_CALL_START',
      tool_call_name: 'hivemind_company_context',
      tool_call_id: 'context-1',
    });
    expect(view.activity[0].name).toBe('hivemind_company_context');
    expect(view.activity[0].label).toBe('Read company context');
  });

  it('deduplicates raw and normalized confirmation events by parked reply', () => {
    const toolCall = { id: 'bash-1', name: 'Bash', input: { command: 'pwd' } };
    let view = emptyWorkRunView(runId);
    view = applyWorkRunEvent(view, {
      type: 'REQUIRE_USER_CONFIRM',
      reply_id: 'reply-1',
      tool_calls: [toolCall],
    });
    view = applyWorkRunEvent(view, {
      t: 'approval.requested',
      reply_id: 'reply-1',
      call_id: 'bash-1',
      tool: 'Bash',
      tool_calls: [toolCall],
    });
    expect(view.approvals).toHaveLength(1);
    expect(view.approvals[0].payload.reply_id).toBe('reply-1');
    expect(view.approvals[0].payload.tool_calls).toEqual([toolCall]);
    view = resolveApproval(view, view.approvals[0].block_id);
    expect(view.approvals).toHaveLength(0);
  });

  it('projects HIVE external approvals as a non-blocking policy receipt, not an AgentScope confirmation', () => {
    const event = {
      t: 'external_action.pending',
      tool: 'hivemind_composio_session_execute',
      approval: { id: 'approval-1', summary: 'Send the drafted email to Ada.' },
    };
    const view = applyWorkRunEvent(emptyWorkRunView(runId), event);
    expect(view.approvals).toHaveLength(0);
    expect(view.blocks['external-action:approval-1']).toMatchObject({
      kind: 'appAction',
      status: 'pending',
      payload: { detail: 'Send the drafted email to Ada.' },
    });
    const msgs = applyAgentEvent(startUserTurn([], 'send it'), event);
    const assistant = msgs.find((message) => message.role === 'assistant');
    expect(assistant.timeline).toContainEqual(expect.objectContaining({
      kind: 'externalAction', id: 'approval-1', detail: 'Send the drafted email to Ada.',
    }));
  });

  it('prefers a recoverable confirmation over a legacy card for the same tool', () => {
    const toolCall = { id: 'bash-1', name: 'Bash', input: { command: 'pwd' } };
    let view = applyWorkRunEvent(emptyWorkRunView(runId), {
      t: 'approval.requested',
      call_id: 'bash-1',
      tool: 'Bash',
    });
    view = applyWorkRunEvent(view, {
      type: 'REQUIRE_USER_CONFIRM',
      reply_id: 'reply-1',
      tool_calls: [toolCall],
    });
    expect(view.approvals).toHaveLength(1);
    expect(view.approvals[0].payload.reply_id).toBe('reply-1');
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

  it('acknowledges immediately, then retains tool input and result on one row', () => {
    let msgs = startUserTurn([], 'inspect status');
    let assistant = msgs.find((message) => message.role === 'assistant');
    expect(assistant.stage).toBe('acknowledging');
    msgs = applyAgentEvent(msgs, { type: 'REPLY_START', reply_id: 'r1' });
    msgs = applyAgentEvent(msgs, {
      type: 'TOOL_CALL_START',
      tool_call_name: 'hivemind_meta',
      tool_call_id: 'status-1',
      input: { operation: 'save_status' },
    });
    msgs = applyAgentEvent(msgs, {
      type: 'TOOL_RESULT_END',
      tool_call_name: 'hivemind_meta',
      tool_call_id: 'status-1',
      text: '{"status":"saved"}',
    });
    assistant = msgs.find((message) => message.role === 'assistant');
    expect(assistant.stage).toBe('working');
    expect(assistant.timeline[0]).toMatchObject({
      name: 'hivemind_meta',
      input: '{\n  "operation": "save_status"\n}',
      result: '{"status":"saved"}',
    });
  });

  it('seals a completed reply after its final tool result', () => {
    let msgs = startUserTurn([], 'check this');
    msgs = applyAgentEvent(msgs, { type: 'REPLY_START', reply_id: 'r1' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_CALL_START', tool_call_name: 'hivemind_recall', tool_call_id: 'c1' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_RESULT_END', tool_call_name: 'hivemind_recall', tool_call_id: 'c1', text: 'done' });
    msgs = applyAgentEvent(msgs, { type: 'TEXT_BLOCK_DELTA', delta: 'Verified.' });
    msgs = applyAgentEvent(msgs, { type: 'REPLY_END' });
    const assistant = msgs.find((message) => message.role === 'assistant');
    expect(assistant.streaming).toBe(false);
    expect(assistant.timeline[0].label).toBe('Checked company memory');
  });

  it('preserves thinking and tools in the exact AgentScope event order', () => {
    let msgs = startUserTurn([], 'research this');
    msgs = applyAgentEvent(msgs, { type: 'THINKING_BLOCK_DELTA', block_id: 'think-1', delta: 'First I will inspect.' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_CALL_START', tool_call_name: 'PlaybookList', tool_call_id: 'tool-1' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_RESULT_END', tool_call_name: 'PlaybookList', tool_call_id: 'tool-1', text: 'done' });
    msgs = applyAgentEvent(msgs, { type: 'THINKING_BLOCK_DELTA', block_id: 'think-2', delta: 'Now I will verify.' });
    msgs = applyAgentEvent(msgs, { type: 'TOOL_CALL_START', tool_call_name: 'hivemind_recall', tool_call_id: 'tool-2' });
    const assistant = msgs.find((message) => message.role === 'assistant');
    expect(assistant.timeline.map((item) => item.kind)).toEqual(['thinking', 'tool', 'thinking', 'tool']);
    expect(assistant.timeline.map((item) => item.name || item.text)).toEqual([
      'First I will inspect.',
      'PlaybookList',
      'Now I will verify.',
      'hivemind_recall',
    ]);
  });
});
