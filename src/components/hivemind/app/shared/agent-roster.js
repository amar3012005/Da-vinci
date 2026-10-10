import { fetchHarness } from './harness-fetch';
import { createAgentRosterCache } from './agent-roster-cache';
export const agentRoster = createAgentRosterCache(async () => {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchHarness('/api/hivemind/employees', { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error('team unavailable');
    const value = await response.json();
    if (!Array.isArray(value.profiles)) throw new Error('invalid team response');
    return value.profiles.filter(agent => typeof agent.id === 'string' && agent.id !== 'runtime' && typeof agent.name === 'string');
  } finally { clearTimeout(deadline); }
});
