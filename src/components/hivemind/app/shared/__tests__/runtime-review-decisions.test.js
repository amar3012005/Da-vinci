import { withRuntimeReviewDecisions } from '../open-dot-room-status';

const openDot = [
  { employeeId: 'feynmann', status: 'submitted', group: 'review', taskId: 'task-9' },
  { employeeId: 'turing', status: 'submitted', group: 'review', taskId: 'task-7' },
  { employeeId: 'faraday', status: 'working', group: 'working', taskId: 'task-8' },
];

test('a Runtime-accepted task replaces the same task submitted view', () => {
  const merged = withRuntimeReviewDecisions(openDot, [
    { employeeId: 'feynmann', status: 'accepted', group: 'resolved', taskId: 'task-9' },
    { employeeId: 'turing', status: 'accepted', group: 'resolved', taskId: 'task-6' },
    { employeeId: 'faraday', status: 'accepted', group: 'resolved', taskId: 'task-8' },
  ]);
  expect(merged[0]).toMatchObject({ status: 'accepted', group: 'resolved' });
  // A different (older) task decision does not hide a newer submission.
  expect(merged[1]).toMatchObject({ status: 'submitted', group: 'review' });
  // Live work stays visible even when an earlier decision exists for that task id.
  expect(merged[2]).toMatchObject({ status: 'working' });
});

test('an unavailable Runtime read keeps the Open Dot view unchanged', () => {
  expect(withRuntimeReviewDecisions(openDot, undefined)).toBe(openDot);
});
