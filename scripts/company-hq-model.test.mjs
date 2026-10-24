import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignmentsByTeammate, mergeRuntimeTaskProjection, recentDeliverables, runtimeAgendas, runtimeStatusSummary, upcomingWakes,
} from '../src/components/hivemind/app/hyperagents/company-hq-model.js';

test('agendas merge opportunities, drop completed work and put approvals first', () => {
  const work = {
    agent_runtime_tasks: [
      { id: 't1', title: 'Draft launch email', status: 'RUNNING', owner: 'Mia' },
      { id: 't2', title: 'Old audit', status: 'COMPLETED' },
      { id: 't3', title: 'Send campaign', status: 'WAITING_FOR_AUTHORITY' },
    ],
    first_life_experience: { opportunities: [{ id: 'o1', title: 'Find partners', status: 'PROPOSED', objective: 'Ten warm intros' }, { id: 't1', objective: 'Announce v2' }] },
  };
  const rows = runtimeAgendas(work);
  assert.deepEqual(rows.map(row => row.id), ['t3', 't1', 'o1']);
  assert.equal(rows[0].label, 'Needs your approval');
  assert.equal(rows[0].tone, 'attention');
  assert.equal(rows[1].objective, 'Announce v2');
  assert.equal(rows[1].owner, 'Mia');
  assert.deepEqual(runtimeAgendas({}), []);
  assert.deepEqual(runtimeAgendas({ runtime_queue: [{ id: 'q', title: 'Fallback queue', status: 'UNKNOWN' }] }).map(row => row.label), ['Ready']);
});

test('task projection keeps canonical fields over proposals', () => {
  assert.deepEqual(mergeRuntimeTaskProjection([{ id: 'a', status: 'RUNNING' }], [{ id: 'a', status: 'PROPOSED', title: 'A' }, { todo_id: 'b' }]),
    [{ id: 'a', status: 'RUNNING', title: 'A' }, { todo_id: 'b' }]);
});

test('Runtime status prefers the live room and falls back to the HQ record', () => {
  assert.equal(runtimeStatusSummary({ room: { running: true, activity: 'Writing the brief' } }).label, 'Writing the brief');
  assert.equal(runtimeStatusSummary({ room: { actionRequired: true, running: true } }).tone, 'attention');
  assert.equal(runtimeStatusSummary({ room: { scheduled: true } }).tone, 'scheduled');
  assert.equal(runtimeStatusSummary({ room: { status: 'idle' }, runtime: { state: 'BLOCKED' } }).label, 'Ready');
  assert.equal(runtimeStatusSummary({ room: { stale: true, running: true }, runtime: { state: 'PAUSED' } }).label, 'Paused');
  assert.equal(runtimeStatusSummary({ runtime: { state: 'DIAGNOSING' } }).tone, 'working');
  assert.equal(runtimeStatusSummary({}).tone, 'unknown');
});

test('teammates carry live state and their owned agendas, busiest first', () => {
  const rooms = { mia: { running: true, activity: 'Researching competitors' }, leo: { taskStatus: 'review' }, ana: { scheduled: true } };
  const members = assignmentsByTeammate({
    team: [{ id: 'ana', name: 'Ana', role: 'growth_lead' }, { id: 'mia', name: 'Mia', role: 'researcher' }, { id: 'leo', name: 'Leo' }, { id: 'kai', name: 'Kai' }, { name: 'No id' }],
    employees: [{ id: 'legacy', name: 'Legacy' }],
    roomFor: id => rooms[id],
    agendas: [{ id: 'x', title: 'Pricing study', owner: 'mia' }, { id: 'y', title: 'Unowned', owner: '' }],
  });
  assert.deepEqual(members.map(member => [member.id, member.state]), [['leo', 'review'], ['mia', 'working'], ['ana', 'scheduled'], ['kai', 'idle']]);
  assert.equal(members[1].activity, 'Researching competitors');
  assert.deepEqual(members[1].items.map(item => item.id), ['x']);
  assert.equal(members[2].role, 'growth lead');
  assert.equal(members[3].label, 'Available');
  assert.deepEqual(assignmentsByTeammate({ employees: [{ id: 'e1', name: 'Eve', roleArchetype: 'Builder' }] }).map(member => member.role), ['Builder']);
});

test('wakes group by day from today, skip finished and past days, and keep time order', () => {
  const now = new Date(2026, 9, 24, 12, 0).getTime();
  const at = (day, hour) => new Date(2026, 9, day, hour, 0).toISOString();
  const groups = upcomingWakes([
    { id: 'c', dueAt: at(26, 9), triggerType: 'weekly_review' },
    { id: 'a', dueAt: at(24, 15), triggerType: 'follow_up' },
    { id: 'p', dueAt: at(24, 8), triggerType: 'morning_check' },
    { id: 'old', dueAt: at(20, 9) },
    { id: 'done', dueAt: at(25, 9), status: 'completed' },
    { id: 'b', dueAt: at(25, 10) },
    { id: 'bad', dueAt: 'never' },
  ], now, { locale: 'en-GB' });
  assert.deepEqual(groups.map(group => group.label), ['Today', 'Tomorrow', 'Mon 26 Oct']);
  assert.deepEqual(groups.flatMap(group => group.items.map(item => item.id)), ['p', 'a', 'b', 'c']);
  assert.equal(groups[0].items[0].overdue, true);
  assert.equal(groups[0].items[1].label, 'Follow up');
  assert.equal(groups[0].items[1].time, '15:00');
  assert.equal(groups[1].items[0].label, 'Check-in');
  assert.equal(upcomingWakes(Array.from({ length: 9 }, (unused, index) => ({ id: String(index), dueAt: at(25, index) })), now, { limit: 3 })[0].items.length, 3);
});

test('deliverables merge Library files and sealed rooms, newest first', () => {
  const rows = recentDeliverables({
    deliverables: [{ room_id: 'r1', title: 'Market map', sealed_at: '2026-10-20T10:00:00Z' }, { room_id: 'r1', title: 'Duplicate', sealed_at: '2026-10-21T10:00:00Z' }],
    libraryItems: [{ artifactId: 'a1', title: 'Launch plan', producerName: 'Runtime', updatedAt: Date.parse('2026-10-22T10:00:00Z') }, { artifactId: 'a0', updatedAt: Date.parse('2026-10-01T10:00:00Z') }],
    limit: 3,
  });
  assert.deepEqual(rows.map(row => [row.key, row.title]), [['library:a1', 'Launch plan'], ['room:r1', 'Market map'], ['library:a0', 'Untitled file']]);
  assert.deepEqual(recentDeliverables({}), []);
});
