import assert from 'node:assert/strict';
import test from 'node:test';
import { mostUrgentTaskStatus, withEmployeeTaskStatuses } from '../src/components/hivemind/app/shared/open-dot-room-status.js';

test('attaches known task states and ignores idle or unknown values', () => {
  const rooms = { turing: [{ id: 'turing', updatedAt: 1, status: 'idle' }] };
  const next = withEmployeeTaskStatuses(rooms, [
    { employeeId: 'turing', status: 'blocked', taskId: 't1', updatedAt: 2 },
    { employeeId: 'faraday', status: 'submitted', taskId: 't2', updatedAt: 2 },
    { employeeId: 'feynmann', status: 'idle', taskId: null, updatedAt: 2 },
    { employeeId: 'momo', status: 'unknown', taskId: 't3', updatedAt: 2 },
  ]);
  assert.equal(next.turing[0].taskStatus, 'blocked');
  assert.deepEqual(next.faraday, [{ id: 'faraday', updatedAt: 0, status: 'idle', taskStatus: 'submitted' }]);
  assert.equal(next.feynmann, undefined);
  assert.equal(next.momo, undefined);
  assert.equal(rooms.turing[0].taskStatus, undefined);
});

test('keeps rooms unchanged when the endpoint has no taskStatus yet', () => {
  const rooms = { turing: [{ id: 'turing', updatedAt: 1, status: 'idle' }] };
  assert.equal(withEmployeeTaskStatuses(rooms, undefined), rooms);
});

test('chooses the most urgent state across rooms', () => {
  assert.equal(mostUrgentTaskStatus([{ taskStatus: 'working' }, { taskStatus: 'blocked' }, { taskStatus: 'accepted' }]), 'blocked');
  assert.equal(mostUrgentTaskStatus([{ taskStatus: 'accepted' }, { taskStatus: 'failed' }]), 'failed');
  assert.equal(mostUrgentTaskStatus([{}]), undefined);
});

test('groups the team by task state and keeps the grid without task data', async () => {
  const { groupTeamByTask } = await import('../src/components/hivemind/app/shared/team-groups.js');
  const team = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const rooms = { a: { taskStatus: 'working' }, b: { taskStatus: 'blocked' }, c: { taskGroup: 'review' } };
  const groups = groupTeamByTask(team, id => rooms[id]);
  assert.deepEqual(groups.map(group => [group.label, group.members.map(member => member.id)]), [
    ['Working', ['a']], ['Waiting on you', ['b']], ['Needs review', ['c']], ['Idle', ['d']],
  ]);
  assert.equal(groupTeamByTask(team, () => undefined), null);
});

test('maps the final contract: group first, detailed waiting states without a group', () => {
  const next = withEmployeeTaskStatuses({}, [
    { employeeId: 'a', status: 'waiting_on_user', group: 'waiting', taskId: 't', updatedAt: 1 },
    { employeeId: 'b', status: 'waiting_on_runtime', group: 'working', taskId: 't', updatedAt: 1 },
    { employeeId: 'c', status: 'waiting_on_user', taskId: 't', updatedAt: 1 },
    { employeeId: 'd', status: 'waiting_on_runtime', taskId: 't', updatedAt: 1 },
    { employeeId: 'e', status: 'submitted', group: 'review', taskId: 't', updatedAt: 1 },
  ]);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map(id => next[id][0].taskStatus), ['waiting', 'working', 'waiting', 'working', 'review']);
});
