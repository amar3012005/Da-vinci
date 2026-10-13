/** Accept only an owned frame's versioned, bounded status projection. */
export function openDotRoomStatus(data, expectedEmployeeId) {
  if (data?.type !== 'hivemind.open-dot.room-status' || data.version !== 1 || data.employeeId !== expectedEmployeeId || !expectedEmployeeId || !Array.isArray(data.rooms) || data.rooms.length > 128) return null;
  return data.rooms.filter(room => typeof room?.conversationId === 'string' && room.conversationId.length <= 200 && Number.isFinite(room.updatedAt)).map(room => ({
    id: expectedEmployeeId, sessionId: room.conversationId, updatedAt: room.updatedAt,
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
    if (rooms !== null) statuses[entry.employeeId] = rooms.map(room => {
      const lastAssistantAt = entry.rooms.find(value => value.conversationId === room.sessionId)?.lastAssistantAt;
      const watermark = readAt[entry.employeeId];
      return { ...room, unread: Number.isFinite(lastAssistantAt) ? Number.isFinite(watermark) && lastAssistantAt > watermark : room.unread };
    });
  }
  return statuses;
}
