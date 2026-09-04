import { liveReasoningRows } from './claude-chat';

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
