export const runtimeMotions = ['ready','sleeping','listening','thinking','working','needs-you','blocked','done','unknown'];
export function motionForRoom(room) {
  if (!room || room.stale) return 'unknown';
  if (runtimeMotions.includes(room.motion)) return room.motion;
  if (room.activeCall) return 'listening';
  if (room.actionRequired || room.waitingForAnswer) return 'needs-you';
  if (room.running) return 'working';
  return room.error ? 'blocked' : 'ready';
}
/** Same priority as the native adapter; old dormant rooms never mask active work. */
export function aggregateMotion(rooms) {
  for (const state of ['listening','needs-you','working','thinking']) if (rooms.some(room => motionForRoom(room) === state)) return state;
  const latest=rooms.reduce((latest,room)=>!latest || room.updatedAt>latest.updatedAt ? room : latest,undefined);
  return motionForRoom(latest);
}
