import { isNativeApp } from './native-app';

/** Runtime's room lives on the Runtime host; Brain's host links there. */
export const RUNTIME_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness';

/** HyperAgents pages live on the Runtime host too; a company without Runtime uses this team page. */
export const HYPERAGENTS_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/apps';

/** Brain's chat lives on Brain's host. */
export const BRAIN_CHAT = 'https://next.singulancelabs.com/hivemind/app/overview/new';

/**
 * Open Brain chat: in place on Brain's host and in the packaged app (which hosts every page itself), otherwise on Brain's host.
 * @param {(path: string) => void} navigate - Router navigation for the current host.
 */
export function openBrainChat(navigate) {
  if (window.location.hostname === 'next.singulancelabs.com' || isNativeApp()) navigate('/hivemind/app/overview/new');
  else window.location.assign(BRAIN_CHAT);
}
