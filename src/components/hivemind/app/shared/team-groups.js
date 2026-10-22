/** Specialist grouping for the team sidebar, keyed by native task state. */
/** Grouped list order and the native task states each group collects. */
export const TEAM_GROUPS = [
  { id: 'working', label: 'Working', states: ['working', 'assigned'] },
  { id: 'waiting', label: 'Waiting on you', states: ['blocked', 'waiting'] },
  { id: 'review', label: 'Needs review', states: ['submitted', 'review'] },
  { id: 'failed', label: 'Failed', states: ['failed'] },
  { id: 'resolved', label: 'Resolved', states: ['accepted', 'resolved'] },
  { id: 'idle', label: 'Idle', states: ['idle'] },
];

/**
 * Group employees by their room's task state, or return null while no
 * employee carries one so the avatar grid stays in place.
 * @param {Array<{id: string}>} team - employees in roster order.
 * @param {(id: string) => ({taskStatus?: string, taskGroup?: string} | undefined)} roomFor - aggregated room lookup.
 * @returns {Array<{id: string, label: string, members: Array<{id: string}>}> | null} non-empty groups in display order.
 */
export function groupTeamByTask(team, roomFor) {
  const stateOf = agent => { const room = roomFor(agent.id); return room?.taskGroup ?? room?.taskStatus; };
  if (!team.some(agent => stateOf(agent) !== undefined)) return null;
  const groups = TEAM_GROUPS.map(group => ({ id: group.id, label: group.label, members: [] }));
  for (const agent of team) {
    const state = stateOf(agent) ?? 'idle';
    const index = TEAM_GROUPS.findIndex(group => group.id === state || group.states.includes(state));
    groups[index === -1 ? groups.length - 1 : index].members.push(agent);
  }
  return groups.filter(group => group.members.length > 0);
}
