import { fetchHarness } from './harness-fetch';
import { createAgentRosterCache } from './agent-roster-cache';
import { isNativeApp } from './native-app';
import { establishHarnessSession } from './harness-admission';
export const agentRoster = createAgentRosterCache(async () => {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 15000);
  try {
    let response = await fetchHarness('/api/hivemind/employees', { credentials: 'same-origin', signal: controller.signal });
    // A packaged app starts with an empty OS runner-cookie jar. Brain does not
    // mount Harness, so the sidebar must establish the same authenticated seat.
    if (isNativeApp() && ([401, 403].includes(response.status) || /text\/html/i.test(response.headers.get('content-type') || ''))) {
      const admitted = await establishHarnessSession();
      if (admitted.mode !== 'harness') throw new Error('team unavailable');
      response = await fetchHarness('/api/hivemind/employees', { credentials: 'same-origin', signal: controller.signal });
    }
    if (!response.ok) throw new Error('team unavailable');
    const value = await response.json();
    if (!Array.isArray(value.profiles)) throw new Error('invalid team response');
    return value.profiles.filter(agent => typeof agent.id === 'string' && agent.id !== 'runtime' && typeof agent.name === 'string');
  } finally { clearTimeout(deadline); }
});
