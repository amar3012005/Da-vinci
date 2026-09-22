import { isDuplicateOperationalMessage, liveReasoningRows, reasoningRows, stageDetails } from './claude-chat';

test.each(['error', 'failed', 'pending', 'waiting_user', 'waiting_connection', 'waiting_approval'])('progressive %s receipts never become completed', (status) => {
  const [row] = liveReasoningRows([
    { type: 'tool_started', name: 'agent', harness_version: 'progressive-v1' },
    { type: 'tool_result', name: 'agent', status, summary: 'Receipt-backed status' },
  ]);
  expect(row).toMatchObject({ phase: status, detail: 'Receipt-backed status' });
});

test('progressive terminal status remains truthful without summary', () => {
  const [row] = liveReasoningRows([{ type: 'tool_result', name: 'agent', harness_version: 'progressive-v1', status: 'waiting_approval' }]);
  expect(row).toMatchObject({ phase: 'waiting_approval', detail: 'waiting approval' });
});

test('legacy result defaults are unchanged', () => {
  const [row] = liveReasoningRows([{ type: 'tool_result', name: 'agent', status: 'error' }]);
  expect(row).toMatchObject({ phase: 'completed', detail: 'Completed' });
});

test('collapses lifecycle duplicates while preserving distinct tool calls and recall hops', () => {
  const events = [
    { type: 'tool_selected', name: 'hivemind_recall', arguments: { query: 'company' } },
    { type: 'tool_started', name: 'hivemind_recall', arguments: { query: 'company' } },
    { type: 'tool_call', name: 'hivemind_recall', arguments: '{"query":"company"}' },
    { type: 'tool_result', name: 'hivemind_recall', result_summary: '5 memories + 8 evidence' },
    { type: 'recall_window_revealed', recall_id: 'r1', from_rank: 1, to_rank: 5, candidate_count: 15 },
    { type: 'recall_window_revealed', recall_id: 'r1', from_rank: 6, to_rank: 10, candidate_count: 15 },
  ];
  const rows = liveReasoningRows(events);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({ tool: 'hivemind_recall', phase: 'completed', detail: '5 memories + 8 evidence' });
  expect(rows[1]).toMatchObject({ tool: 'evidence_rank', detail: 'Ranks 1–5 of 15' });
  expect(rows[2]).toMatchObject({ tool: 'next_evidence_hop', detail: 'Ranks 6–10 of 15' });
});

test('live rows keep github and gmail tool names from streamed events', () => {
  const rows = liveReasoningRows([
    { type: 'tool_started', name: 'GITHUB_LIST_REPOS' },
    { type: 'tool_result', name: 'GITHUB_LIST_REPOS', result_summary: 'amar/HIVEMIND' },
    { type: 'orchestration_step', step_id: 's2', index: 1, tool: 'GMAIL_CREATE_EMAIL_DRAFT', phase: 'draft_created', detail: 'draft to rama — not sent' },
  ]);
  expect(rows.some((row) => row.tool === 'GITHUB_LIST_REPOS' && row.phase === 'completed')).toBe(true);
  expect(rows.some((row) => row.tool === 'GMAIL_CREATE_EMAIL_DRAFT')).toBe(true);
});

test('native LangGraph states remain visible and truthful in the timeline', () => {
  const rows = liveReasoningRows([
    { type: 'agent_state', state: 'context_loaded', run_id: 'run-1' },
    { type: 'agent_state', state: 'awaiting_connection', run_id: 'run-1' },
    { type: 'agent_state', state: 'resumed', run_id: 'run-1' },
  ]);
  expect(rows.map((row) => row.phase)).toEqual(['context_loaded', 'awaiting_connection', 'resumed']);
  expect(rows[1]).toMatchObject({ tool: 'agent', detail: 'awaiting connection' });
});

test('mobile timeline keeps every meaningful governed stage and never narrates them with an LLM', () => {
  const rows = reasoningRows([
    { type: 'tool_started', name: 'hivemind_connected_task', arguments: { action: 'search' } },
    { type: 'tool_result', name: 'hivemind_connected_task', status: 'completed' },
    { type: 'tool_started', name: 'GMAIL_FETCH_EMAILS' },
    { type: 'tool_result', name: 'GMAIL_FETCH_EMAILS', status: 'completed', summary: 'five raw subjects' },
    { type: 'tool_started', name: 'hivemind_save_memory' },
    { type: 'tool_result', name: 'hivemind_save_memory', status: 'completed', summary: 'saved' },
  ]);
  expect(rows.map((row) => row.tool)).toEqual(['hivemind_connected_task', 'GMAIL_FETCH_EMAILS', 'hivemind_save_memory']);
  expect(rows.map((row) => [row.display_label, row.display_detail])).toEqual([
    ['Connected apps', 'Capability selected'],
    ['Gmail', 'Email retrieval complete'],
    ['HIVE-MIND', 'Memory saved'],
  ]);
});

test('stage details expose only a small safe input and receipt summary', () => {
  expect(stageDetails({
    arguments: { query: 'latest five emails', limit: 5, api_key: 'must-not-render', nested: { raw: 'must-not-render' } },
    summary: '5 email records returned',
    display_detail: 'Email retrieval complete',
  })).toEqual({
    input: [{ label: 'query', value: 'latest five emails' }, { label: 'limit', value: '5' }],
    output: '5 email records returned',
  });
});

test('memory scope selection is a compact deterministic stage', () => {
  const [row] = reasoningRows([
    {
      type: 'tool_result',
      name: 'hivemind_save_memory',
      status: 'waiting_user',
      summary: 'Memory destination was not stated. Ask the user to choose a personal, organization, team, or authorized project scope before saving.',
    },
  ]);

  expect(row.display_label).toBe('HIVE-MIND');
  expect(row.display_detail).toBe('Choose memory destination');
});

test('does not render the legacy scope-picker boilerplate as an assistant answer', () => {
  expect(isDuplicateOperationalMessage('Memory destination was not stated. Ask the user to choose a personal, organization, team, or authorized project scope before saving; do not retry the save yourself.')).toBe(true);
  expect(isDuplicateOperationalMessage('Memory saved.')).toBe(false);
});
