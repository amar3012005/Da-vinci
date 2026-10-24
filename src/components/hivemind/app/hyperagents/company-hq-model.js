/**
 * Pure projections for the Company HQ page: Runtime status, agendas,
 * assignments by teammate, upcoming wakes and recent deliverables.
 * Inputs are the existing reads (`/v1/hyper/company`, `/v1/hq/runtime`,
 * `/v1/hq/work`, the Library first page) and the sidebar's live room
 * statuses; nothing here fetches or mutates.
 */

/**
 * Join canonical Runtime tasks with first-life opportunities by id; canonical fields win.
 * @param {Array<object>} tasks - canonical Runtime tasks.
 * @param {Array<object>} opportunities - proposed opportunities.
 * @returns {Array<object>} canonical rows followed by opportunities without a canonical row.
 */
export function mergeRuntimeTaskProjection(tasks = [], opportunities = []) {
  const canonical = Array.isArray(tasks) ? tasks : [];
  const proposed = Array.isArray(opportunities) ? opportunities : [];
  const opportunityById = new Map(proposed.map((item) => [String(item.id || item.todo_id || ''), item]));
  const merged = canonical.map((task) => {
    const opportunity = opportunityById.get(String(task.id || ''));
    return opportunity ? { ...opportunity, ...task } : task;
  });
  const seen = new Set(merged.map((item) => String(item.id || item.todo_id || '')));
  for (const opportunity of proposed) {
    const id = String(opportunity.id || opportunity.todo_id || '');
    if (id && !seen.has(id)) {
      merged.push(opportunity);
      seen.add(id);
    }
  }
  return merged;
}

/** Display label and tone for each Runtime queue status. */
export const AGENDA_STATUS = {
  PROPOSED: ['Proposed', 'neutral'],
  RUNNING: ['In progress', 'active'],
  READY: ['Ready', 'active'],
  WAITING_FOR_AUTHORITY: ['Needs your approval', 'attention'],
  WAITING_FOR_EVIDENCE: ['Waiting for evidence', 'neutral'],
  MONITORING: ['Monitoring', 'neutral'],
  WAITING_FOR_CONNECTOR: ['Waiting for an app', 'attention'],
  BLOCKED: ['Blocked', 'attention'],
  NEEDS_ATTENTION: ['Needs attention', 'attention'],
  COMPLETED: ['Done', 'done'],
};

const AGENDA_ORDER = ['WAITING_FOR_AUTHORITY', 'NEEDS_ATTENTION', 'BLOCKED', 'WAITING_FOR_CONNECTOR', 'RUNNING', 'READY', 'MONITORING', 'WAITING_FOR_EVIDENCE', 'PROPOSED', 'COMPLETED'];

/**
 * Open Runtime agendas, most urgent first; completed work is excluded.
 * @param {object} work - `/v1/hq/work` response.
 * @returns {Array<{ id: string, title: string, objective: string, status: string, label: string, tone: string, owner: string }>} agenda rows.
 */
export function runtimeAgendas(work = {}) {
  const canonical = work?.agent_runtime_tasks || work?.runtime_queue || [];
  const rows = mergeRuntimeTaskProjection(canonical, work?.first_life_experience?.opportunities || []);
  return rows
    .filter((item) => item && item.status !== 'COMPLETED' && (item.title || item.objective))
    .map((item) => {
      const status = AGENDA_STATUS[item.status] ? item.status : 'READY';
      const [label, tone] = AGENDA_STATUS[status];
      return {
        id: String(item.id || item.todo_id || item.title),
        title: String(item.title || item.objective),
        objective: item.title ? String(item.objective || '') : '',
        status, label, tone,
        owner: String(item.owner || ''),
        recommended: item.recommended === true,
      };
    })
    .sort((a, b) => (b.recommended - a.recommended) || (AGENDA_ORDER.indexOf(a.status) - AGENDA_ORDER.indexOf(b.status)));
}

const RUNTIME_STATE_SUMMARY = {
  PAUSED: ['paused', 'Paused', 'Runtime is paused and will not start new work.'],
  BLOCKED: ['attention', 'Needs attention', 'Runtime is waiting on something only you can provide.'],
  WAITING: ['idle', 'Listening', 'Runtime wakes when new evidence or a scheduled check arrives.'],
  SLEEPING: ['idle', 'Resting', 'Runtime wakes at its next scheduled check.'],
};

/**
 * One status line for Runtime. The sidebar's live room status wins; the HQ
 * runtime record is the fallback when no live room status has arrived.
 * @param {{ room?: object, runtime?: object | null }} sources - aggregated live room and `/v1/hq/runtime` record.
 * @returns {{ tone: 'working' | 'attention' | 'scheduled' | 'paused' | 'idle' | 'unknown', label: string, detail: string }} status summary.
 */
export function runtimeStatusSummary({ room, runtime } = {}) {
  if (room && !room.stale) {
    if (room.error) return { tone: 'attention', label: 'Something failed', detail: 'Open Runtime to see what went wrong.' };
    if (room.actionRequired || room.waitingForAnswer || room.status === 'waiting') return { tone: 'attention', label: 'Waiting for you', detail: 'Runtime has a question or an approval for you.' };
    if (room.running || room.status === 'working') return { tone: 'working', label: room.activity || 'Working', detail: 'Runtime is working on the current agenda.' };
    if (room.scheduled) return { tone: 'scheduled', label: 'Work scheduled', detail: 'Runtime has assignments waiting for their scheduled time.' };
    if (room.status === 'paused') return { tone: 'paused', ...pick(RUNTIME_STATE_SUMMARY.PAUSED) };
    if (room.status === 'idle') return { tone: 'idle', label: 'Ready', detail: 'Runtime is ready for the next piece of work.' };
  }
  const state = runtime?.state;
  if (state && RUNTIME_STATE_SUMMARY[state]) {
    const [tone, label, detail] = RUNTIME_STATE_SUMMARY[state];
    return { tone, label, detail };
  }
  if (state) return { tone: 'working', label: 'Working', detail: 'Runtime is working through the current agenda.' };
  return { tone: 'unknown', label: 'Not reporting yet', detail: 'Status appears here once Runtime connects to this workspace.' };
}

function pick([, label, detail]) { return { label, detail }; }

/** Labels for teammate task states published by the sidebar's room status read. */
export const TEAMMATE_STATUS = {
  working: ['Working', 'working'], assigned: ['Assigned', 'neutral'], blocked: ['Blocked', 'attention'],
  waiting: ['Waiting on you', 'attention'], submitted: ['Submitted', 'review'], review: ['Needs review', 'review'],
  accepted: ['Accepted', 'done'], resolved: ['Resolved', 'done'], failed: ['Failed', 'attention'],
  scheduled: ['Scheduled', 'neutral'], paused: ['Paused', 'neutral'], idle: ['Available', 'idle'],
};

function teammateState(room) {
  if (!room || room.stale) return 'idle';
  if (room.running || room.status === 'working') return 'working';
  if (TEAMMATE_STATUS[room.taskStatus]) return room.taskStatus;
  if (room.actionRequired || room.waitingForAnswer || room.status === 'waiting') return 'waiting';
  if (room.scheduled) return 'scheduled';
  if (room.status === 'paused') return 'paused';
  return 'idle';
}

const STATE_ORDER = ['waiting', 'blocked', 'failed', 'review', 'submitted', 'working', 'assigned', 'scheduled', 'accepted', 'resolved', 'paused', 'idle'];

/**
 * Teammates with their live state and the agendas whose owner names them.
 * @param {{ team?: Array<object>, employees?: Array<object>, roomFor?: (id: string) => object | undefined, agendas?: Array<object> }} sources -
 *   native roster (preferred), company employees (fallback), live room lookup and Runtime agendas.
 * @returns {Array<{ id: string, name: string, role: string, agent: object, state: string, label: string, tone: string, activity: string, items: Array<object> }>} teammates, busiest first.
 */
export function assignmentsByTeammate({ team, employees, roomFor = () => undefined, agendas = [] } = {}) {
  const roster = (Array.isArray(team) && team.length ? team : Array.isArray(employees) ? employees : []).filter((member) => member?.id && member?.name);
  return roster.map((member, index) => {
    const room = roomFor(member.id);
    const state = teammateState(room);
    const [label, tone] = TEAMMATE_STATUS[state];
    const name = String(member.name);
    const items = agendas.filter((agenda) => agenda.owner && [name.toLowerCase(), String(member.id).toLowerCase()].includes(agenda.owner.toLowerCase()));
    return {
      id: String(member.id), name, agent: member, state, label, tone, index,
      role: String(member.role || member.job_title || member.roleArchetype || member.role_archetype || 'Team member').replace(/_/g, ' '),
      activity: state === 'working' && room?.activity && room.activity !== 'Working' ? String(room.activity) : '',
      items,
    };
  }).sort((a, b) => (STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)) || (b.items.length - a.items.length) || (a.index - b.index))
    .map(({ index, ...member }) => member);
}

/**
 * Upcoming Runtime wakes grouped by calendar day.
 * @param {Array<{ id?: string, dueAt?: string | number, triggerType?: string, status?: string }>} schedules - `/v1/hq/work` schedules.
 * @param {number} [now] - reference epoch milliseconds.
 * @param {{ limit?: number, locale?: string }} [options] - row bound and formatting locale.
 * @returns {Array<{ key: string, label: string, items: Array<{ id: string, label: string, time: string, at: number, overdue: boolean }> }>} day groups in time order.
 */
export function upcomingWakes(schedules = [], now = Date.now(), { limit = 6, locale } = {}) {
  const startOfDay = (time) => { const day = new Date(time); day.setHours(0, 0, 0, 0); return day.getTime(); };
  const today = startOfDay(now);
  const rows = (Array.isArray(schedules) ? schedules : [])
    .map((item, index) => ({ item, at: new Date(item?.dueAt).getTime(), index }))
    .filter(({ item, at }) => Number.isFinite(at) && !['cancelled', 'canceled', 'completed', 'delivered'].includes(String(item?.status || '').toLowerCase()) && at >= today)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
  const groups = new Map();
  for (const { item, at, index } of rows) {
    const day = startOfDay(at);
    const offset = Math.round((day - today) / 86400000);
    const key = String(day);
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow'
      : new Date(at).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    const group = groups.get(key) || { key, label, items: [] };
    const kind = String(item.triggerType || item.kind || 'check-in').replace(/_/g, ' ');
    group.items.push({
      id: String(item.id || `${at}-${index}`),
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      time: new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      at, overdue: at < now,
    });
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Newest deliverables across sealed company rooms and the Library.
 * @param {{ deliverables?: Array<{ room_id: string, title: string, sealed_at?: string }>, libraryItems?: Array<object>, limit?: number }} sources - company deliverables and Library summaries.
 * @returns {Array<{ key: string, source: 'room' | 'library', title: string, at: number, producer: string, item: object }>} newest first.
 */
export function recentDeliverables({ deliverables = [], libraryItems = [], limit = 6 } = {}) {
  const rows = [
    ...(Array.isArray(libraryItems) ? libraryItems : []).map((item) => ({
      key: `library:${item.artifactId}`, source: 'library', title: String(item.title || 'Untitled file'),
      at: Number(new Date(item.updatedAt).getTime()) || 0, producer: String(item.producerName || ''), item,
    })),
    ...(Array.isArray(deliverables) ? deliverables : []).map((item) => ({
      key: `room:${item.room_id}`, source: 'room', title: String(item.title || 'Room deliverable'),
      at: Number(new Date(item.sealed_at).getTime()) || 0, producer: '', item,
    })),
  ];
  const seen = new Set();
  return rows
    .filter((row) => { if (seen.has(row.key)) return false; seen.add(row.key); return true; })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
