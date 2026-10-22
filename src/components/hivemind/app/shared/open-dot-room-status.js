/** Accept only an owned frame's versioned, bounded status projection. */
export function openDotRoomStatus(data, expectedEmployeeId) {
  if (data?.type !== 'hivemind.open-dot.room-status' || data.version !== 1 || data.employeeId !== expectedEmployeeId || !expectedEmployeeId || !Array.isArray(data.rooms) || data.rooms.length > 128) return null;
  return data.rooms.filter(room => typeof room?.conversationId === 'string' && room.conversationId.length <= 200 && Number.isFinite(room.updatedAt)).map(room => ({
    id: expectedEmployeeId, sessionId: room.conversationId, updatedAt: room.updatedAt,
    live: room.live === true,
    activity: typeof room.activity === 'string' ? room.activity.slice(0, 120) : undefined,
    status: ['working', 'waiting', 'paused', 'idle'].includes(room.status) ? room.status : undefined,
    running: room.running === true, unread: room.unread === true,
    actionRequired: room.actionRequired === true, waitingForAnswer: room.waitingForAnswer === true,
    activeCall: room.activeCall === true, error: room.error === true,
  }));
}

/** Aggregate entries must match the signed-in canonical roster's durable Dot binding. */
export function ownedOpenDotRoomStatuses(employees, roster, readAt = {}) {
  if (!Array.isArray(employees) || employees.length > 64) return {};
  const statuses = {};
  for (const entry of employees) {
    const employee = roster.find(item => item.id === entry?.employeeId);
    const binding = (employee?.policy_rules ?? employee?.policyRules)?.open_dot_employee;
    if (!employee || binding?.version !== 1 || binding.state !== 'bound' || binding.dot_id !== entry.dotId) continue;
    const rooms = openDotRoomStatus({ type: 'hivemind.open-dot.room-status', version: 1, employeeId: entry.employeeId, rooms: entry.rooms }, entry.employeeId);
    if (rooms !== null) statuses[entry.employeeId] = rooms.length === 0 && ['idle', 'paused'].includes(entry.status)
      ? [{ id: entry.employeeId, updatedAt: 0, status: entry.status }]
      : rooms.map(room => {
      const lastAssistantAt = entry.rooms.find(value => value.conversationId === room.sessionId)?.lastAssistantAt;
      const watermark = readAt[entry.employeeId];
      return { ...room, unread: Number.isFinite(lastAssistantAt) ? Number.isFinite(watermark) && lastAssistantAt > watermark : room.unread };
      });
  }
  return statuses;
}

/** Retain the last scoped snapshot during transport failure, never as current work state. */
export function reconnectingOpenDotRoomStatuses(previous, status) {
  if ([401, 403, 404].includes(status)) return {};
  return Object.fromEntries(Object.entries(previous).map(([id, rooms]) => [id, rooms.map(room => ({ ...room, stale: true }))]));
}

const TASK_STATUS_RANK = { failed: 6, blocked: 5, submitted: 4, working: 3, assigned: 2, accepted: 1 };

/**
 * Attach each employee's most urgent native task state to its room statuses.
 * Unknown values and `idle` leave the rooms unchanged; an employee without a
 * room snapshot gets one status row so the card can still show its task.
 */
export function withEmployeeTaskStatuses(statuses, taskStatus) {
  if (!Array.isArray(taskStatus)) return statuses;
  const next = { ...statuses };
  for (const entry of taskStatus.slice(0, 64)) {
    const status = entry?.status;
    if (typeof entry?.employeeId !== 'string' || !TASK_STATUS_RANK[status]) continue;
    const rooms = next[entry.employeeId] ?? [{ id: entry.employeeId, updatedAt: 0, status: 'idle' }];
    next[entry.employeeId] = rooms.map(room => ({ ...room, taskStatus: status }));
  }
  return next;
}

/** Most urgent task state among one employee's rooms: failed, blocked, submitted, working, assigned, then accepted. */
export function mostUrgentTaskStatus(rooms) {
  return rooms.reduce((best, room) => (TASK_STATUS_RANK[room.taskStatus] ?? 0) > (TASK_STATUS_RANK[best] ?? 0) ? room.taskStatus : best, undefined);
}
