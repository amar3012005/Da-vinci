import { fetchHarness } from './harness-fetch';
import { createAgentRosterCache } from './agent-roster-cache';
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
  try {
    const response = await fetchHarness((window.location.hostname === 'dots.singulancelabs.com' || window.location.pathname === '/apps') ? '/api/hivemind/workspace-shell?resource=roster' : '/api/hivemind/employees', { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error('team unavailable');
    const value = await response.json();
    if (!Array.isArray(value.profiles)) throw new Error('invalid team response');
    return value.profiles.filter(agent => typeof agent.id === 'string' && agent.id !== 'runtime' && typeof agent.name === 'string');
  } finally { clearTimeout(deadline); }
});
