import { isNativeApp } from './native-app';
import { openNativeCompanyBrainRoom } from './native-room';

/** Runtime's room lives on the Runtime host; Brain's host links there. */
export const RUNTIME_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness';

/** HyperAgents pages live on the Runtime host too; a company without Runtime uses this team page. */
export const HYPERAGENTS_WORKSPACE = 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/apps';

/** Brain's chat lives on Brain's host. */
export const BRAIN_CHAT = 'https://next.singulancelabs.com/hivemind/app/overview/new';

/**
 * Open Brain chat: in place on Brain's host and in the packaged app (which hosts every page itself), otherwise on Brain's host.
 * @param {(path: string) => void} navigate - Router navigation for the current host.
 * @param {{ scope?: string }} [options] - `org:user` of the signed-in person (the native room's persistent web store).
 */
export function openBrainChat(navigate, { scope } = {}) {
  // The packaged app shows the Company Brain room natively over the team (OpenDot refuses framing by capacitor://), so the
  // team is still under it when the person goes back; the harness chat page is the fallback when the plugin refuses the room.
  if (isNativeApp()) {
    openNativeCompanyBrainRoom({ scope }).catch(() => navigate('/hivemind/app/overview/new', { state: { fromTeam: true } }));
    return;
  }
  if (window.location.hostname === 'next.singulancelabs.com' || isNativeApp()) navigate('/hivemind/app/overview/new', { state: { fromTeam: true } });
  else window.location.assign(BRAIN_CHAT);
}
