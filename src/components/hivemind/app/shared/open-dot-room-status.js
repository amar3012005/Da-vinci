/** Accept only an owned frame's versioned, bounded status projection. */
export function openDotRoomStatus(data, expectedEmployeeId) {
  if (data?.type !== 'hivemind.open-dot.room-status' || data.version !== 1 || data.employeeId !== expectedEmployeeId || !expectedEmployeeId || !Array.isArray(data.rooms) || data.rooms.length > 100) return null;
  return data.rooms.filter(room => typeof room?.conversationId === 'string' && room.conversationId.length <= 200 && Number.isFinite(room.updatedAt)).map(room => ({
    id: expectedEmployeeId, sessionId: room.conversationId, updatedAt: room.updatedAt,
    running: room.running === true, unread: room.unread === true,
    actionRequired: room.actionRequired === true, waitingForAnswer: room.waitingForAnswer === true,
    activeCall: room.activeCall === true, error: room.error === true,
  }));
}
