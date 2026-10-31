import { fetchWithRuntimeAdmission } from './runtime-admission';
import { createAgentRosterCache } from './agent-roster-cache';
import { rememberEmployeeAppearances } from './employee-appearance-cache';
import { isNativeApp } from './native-app';
import apiClient from './api-client';

/**
 * Sidebar profiles from Control's company team (`/v1/hyper/company`), for the packaged app when the runner roster
 * is gated. Keeps the saved look (`policy_rules.appearance`) so avatars match the runner roster.
 * @param {object} company - hyperCompany() result.
 * @returns {Array<object>} profiles with at least id, name and role.
 */
export function controlTeamProfiles(company) {
  const team = company?.company?.team;
  if (!Array.isArray(team)) return [];
  return team.filter(member => typeof member?.id === 'string' && member.id !== 'runtime' && typeof member.name === 'string')
    .map(member => ({
      ...member,
      id: member.id,
      name: member.name,
      role: typeof member.role === 'string' ? member.role : '',
      ...(member.policy_rules || member.policyRules ? { policyRules: member.policyRules || member.policy_rules } : {}),
    }));
}
function optionalRosterStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
export const agentRoster = createAgentRosterCache(async scope => {
  // The outer next shell has no Runtime cookie. Read the catalog through the
  // authenticated Runtime iframe; never send that cookie to the Brain runner.
  if (window.location.origin === 'https://next.singulancelabs.com' && /^\/hivemind\/app\/employee\/harness(?:\/|$)/.test(window.location.pathname)) {
    return new Promise((resolve, reject) => {
      const finish = profiles => { clearTimeout(timer); window.removeEventListener('hivemind:runtime-roster',receive); resolve(profiles); };
      const receive = event => { if (event.detail?.scope === scope && Array.isArray(event.detail.profiles)) finish(event.detail.profiles); };
      const timer = setTimeout(() => { window.removeEventListener('hivemind:runtime-roster',receive); reject(new Error('Runtime team has not connected yet')); },15000);
      window.addEventListener('hivemind:runtime-roster',receive);
      window.dispatchEvent(new CustomEvent('hivemind:request-runtime-roster',{detail:{scope}}));
    });
  }
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 15000);
  const read = async url => {
    const response = await fetchWithRuntimeAdmission(url, { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error('team unavailable');
    if (!(response.headers.get('content-type') || '').includes('json')) throw new Error('team response is not JSON');
    const value = await response.json();
    if (!Array.isArray(value.profiles)) throw new Error('invalid team response');
    return value.profiles.filter(agent => typeof agent.id === 'string' && agent.id !== 'runtime' && typeof agent.name === 'string');
  };
  try {
    // The OpenDot company roster is the source of truth on every host, so the sidebar
    // never depends on the Runtime service (Runtime may be disabled). The native
    // Runtime catalog is only a fallback for the Runtime host.
    try { return await read('/api/hivemind/workspace-shell?resource=roster'); } catch (error) {
      // The packaged app has no runner session until Control admits it; Control still knows the team.
      if (isNativeApp()) {
        const profiles = controlTeamProfiles(await apiClient.hyperCompany());
        if (profiles.length) return profiles;
        throw error;
      }
      if (window.location.hostname !== 'runtime-runner.singulancelabs.com' || controller.signal.aborted) throw error;
      return await read('/api/hivemind/employees');
    }
  } finally { clearTimeout(deadline); }
}, Date.now, optionalRosterStorage(), rememberEmployeeAppearances);
