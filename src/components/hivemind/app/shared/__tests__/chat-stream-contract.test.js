import { isRenderableAnswerDelta } from '../chat-stream-contract';

test('renders validated V2 and grounded LangGraph answer deltas progressively', () => {
  expect(isRenderableAnswerDelta({ type: 'answer_delta', delta: 'V2 ', validated: true })).toBe(true);
  expect(isRenderableAnswerDelta({ type: 'answer_delta', delta: 'LangGraph ', grounded: true })).toBe(true);
});

test('does not render untrusted, empty, or non-answer events as assistant text', () => {
  expect(isRenderableAnswerDelta({ type: 'answer_delta', delta: 'untrusted' })).toBe(false);
  expect(isRenderableAnswerDelta({ type: 'answer_delta', delta: '', grounded: true })).toBe(false);
  expect(isRenderableAnswerDelta({ type: 'tool_result', delta: 'tool output', grounded: true })).toBe(false);
});
