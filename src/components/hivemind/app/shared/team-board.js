const KINDS = new Set(['question', 'reply', 'update', 'message']);
const OUTCOMES = new Set(['completed', 'blocked', 'failed']);

/** One line of server text, bounded so a long value never breaks the layout. */
const line = (value, max = 160) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Keep only well-formed parts of the `/api/dots/team-board` answer.
 * @param {unknown} body - Parsed JSON.
 * @returns {{ employees: Array<object>, handoffs: Array<object>, digests: Array<object> } | null} The board extras, or null when the answer is not version 1.
 */
export function parseTeamBoard(body) {
  if (!body || body.version !== 1) return null;
  const list = value => (Array.isArray(value) ? value : []);
  return {
    employees: list(body.employees).filter(item => item && typeof item.dotId === 'string').map(item => ({
      dotId: item.dotId, employeeId: line(item.employeeId, 80), name: line(item.name, 80),
      task: item.task && line(item.task.title) ? { title: line(item.task.title), status: item.task.status === 'blocked' ? 'blocked' : 'in_progress' } : null,
      lastResult: item.lastResult && line(item.lastResult.subject) ? { subject: line(item.lastResult.subject), outcome: OUTCOMES.has(item.lastResult.outcome) ? item.lastResult.outcome : '', at: Number(item.lastResult.at) || 0 } : null,
    })),
    handoffs: list(body.handoffs).filter(item => item && typeof item.id === 'string' && typeof item.fromDotId === 'string' && typeof item.toDotId === 'string').map(item => ({
      id: item.id, fromDotId: item.fromDotId, fromName: line(item.fromName, 80), toDotId: item.toDotId, toName: line(item.toName, 80),
      kind: KINDS.has(item.kind) ? item.kind : 'message', summary: line(item.summary), files: list(item.files).map(file => line(file, 80)).filter(Boolean).slice(0, 4), at: Number(item.at) || 0,
    })).sort((a, b) => b.at - a.at),
    digests: list(body.digests).filter(item => item && line(item.text)).map(item => ({ name: line(item.name, 80), date: line(item.date, 10), text: line(item.text), at: Number(item.at) || 0 })),
  };
}

/**
 * Keep the totals and the first subjects of the `/api/dots/team-week` answer.
 * @param {unknown} body - Parsed JSON.
 * @returns {{ totals: Record<string, number>, rows: Array<{ name: string, subject: string }> } | null} Week summary, or null when absent.
 */
export function parseTeamWeek(body) {
  const week = body?.week;
  if (!week || typeof week !== 'object') return null;
  const totals = ['completed', 'blocked', 'failed', 'returned', 'lessons'].reduce((out, key) => ({ ...out, [key]: Number(week.totals?.[key]) || 0 }), {});
  const rows = (Array.isArray(week.rows) ? week.rows : []).filter(row => row && line(row.name)).slice(0, 4)
    .map(row => ({ name: line(row.name, 80), subject: line(Array.isArray(row.subjects) ? row.subjects[0] : '', 120) }));
  return { totals, rows };
}

async function readJson(url, signal) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Team board unavailable');
  return response.json();
}

/** Reads current tasks, last results, colleague handoffs and digest lines (one tenant-scoped read). */
export async function fetchTeamBoard(signal) {
  const parsed = parseTeamBoard(await readJson('/api/dots/team-board', signal));
  if (!parsed) throw new Error('Team board unavailable');
  return parsed;
}

/** Reads "what the team moved" for the last seven days. */
export async function fetchTeamWeek(signal) {
  return parseTeamWeek(await readJson('/api/dots/team-week', signal));
}

/**
 * The board state of one employee, from the same aggregated room row the roster uses (shared poll and live frames).
 * @param {object | undefined} room - Aggregated room status.
 * @returns {'error' | 'waiting' | 'working' | 'paused' | 'idle'} State.
 */
export function boardState(room) {
  if (!room || room.stale) return 'idle';
  if (room.error) return 'error';
  if (room.actionRequired || room.waitingForAnswer || room.status === 'waiting') return 'waiting';
  if (room.running || room.status === 'working') return 'working';
  if (room.status === 'paused') return 'paused';
  return 'idle';
}

/**
 * One column per employee.
 * @param {{ team: Array<object>, roomFor: (id: string) => object | undefined, extras: ReturnType<typeof parseTeamBoard> | null }} sources - Roster, live room lookup and the board read.
 * @returns {Array<object>} Columns busiest first: waiting, error, working, paused, idle.
 */
export function boardColumns({ team, roomFor, extras }) {
  const byEmployee = new Map((extras?.employees || []).map(item => [item.employeeId.toLowerCase(), item]));
  const order = ['waiting', 'error', 'working', 'paused', 'idle'];
  return (team || []).filter(agent => agent?.id && agent.name && agent.id !== 'runtime').map((agent, index) => {
    const room = roomFor(agent.id);
    const state = boardState(room);
    const extra = byEmployee.get(String(agent.id).toLowerCase());
    return { agent, id: String(agent.id), name: String(agent.name), index, dotId: extra?.dotId || '', state,
      role: String(agent.role || agent.job_title || agent.roleArchetype || agent.role_archetype || '').replace(/_/g, ' '),
      activity: state === 'working' && room?.activity ? line(room.activity) : '', task: extra?.task || null, lastResult: extra?.lastResult || null };
  }).sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.index - b.index);
}

/** A string that changes when any column's state, activity or task changes; a new value triggers one board read. */
export function boardSignature(columns) {
  return columns.map(column => `${column.id}:${column.state}:${column.activity}`).join('|');
}
