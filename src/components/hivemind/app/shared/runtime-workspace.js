import { isNativeApp } from './native-app';
import { readLastTenant } from './boot-cache';
import { cachedBrainRoomId, brainRoomUrl } from '../shared-shell/brain-room';

/** Runtime's room lives on the Runtime host; Brain's host links there. */
export const RUNTIME_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness';

/** HyperAgents pages live on the Runtime host too; a company without Runtime uses this team page. */
export const HYPERAGENTS_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/apps';

/** Brain's chat lives on Brain's host. */
export const BRAIN_CHAT = 'https://next.singulancelabs.com/hivemind/app/overview/new';

/**
 * Open Brain chat: in place on Brain's host, on the Company Brain page (whose sidebar navigates) and in the packaged app (which hosts every page itself); from any other host it loads the room, with the cached conversation when known.
 * @param {(path: string) => void} navigate - Router navigation for the current host.
 */
export function openBrainChat(navigate) {
  if (['next.singulancelabs.com', 'brain-runner.singulancelabs.com'].includes(window.location.hostname) || isNativeApp()) navigate('/hivemind/app/overview/new', { state: { fromTeam: true } });
  else window.location.assign(brainChatUrl());
}

/**
 * Brain chat address for a link followed from another page: the Company Brain room carrying the conversation this device last showed
 * in it, when this origin's storage knows one (the Company Brain page stores it on its own origin), otherwise the Brain host's
 * entry, which the edge sends to the room without an id; the room then resolves it from its own cache.
 * @returns {string} Absolute URL.
 */
export function brainChatUrl() {
  const tenant = readLastTenant();
  const conversationId = tenant ? cachedBrainRoomId({ tenant: tenant.orgId, user: tenant.userId }) : null;
  return conversationId ? brainRoomUrl(conversationId) : BRAIN_CHAT;
}
