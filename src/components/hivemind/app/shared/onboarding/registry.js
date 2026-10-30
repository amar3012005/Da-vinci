/**
 * The one first-run step registry. Edit the steps, their order and their actions HERE; the Get Started card, the phone sheet
 * and the older tours read it. Copy lives in onboarding-locales.json under `steps.<id>`; this file holds no sentences.
 * Step ids are shared with the server record (OpenDot `src/lib/onboarding.ts`), which owns progress for every device.
 */

/** Matches the server's ONBOARDING_VERSION; bump both to reopen the card for people who have not finished. */
export const ONBOARDING_VERSION = 1;

const EMPLOYEE_HOME = '/hivemind/app/employee';

/**
 * Steps in card order. `action` says what the step's button does:
 * - `language`: the inline language row (no navigation);
 * - `route`: open `to`;
 * - `create-or-route`: open the employee creation dialog when there is no employee yet, otherwise `to`;
 * - `event`: dispatch the window event `name` (the sidebar dial listens);
 * - `proactive`: open the real proactive item when one exists, otherwise `to` (the calendar, where the watch schedule lives).
 * `skippable: false` marks server work the person can leave but not skip.
 */
export const STEPS = Object.freeze([
  { id: 'language', action: { kind: 'language' }, skippable: true },
  { id: 'awaken', action: { kind: 'route', to: EMPLOYEE_HOME }, skippable: false },
  { id: 'meet', action: { kind: 'create-or-route', to: EMPLOYEE_HOME }, skippable: true },
  { id: 'first_task', action: { kind: 'route', to: EMPLOYEE_HOME }, skippable: true },
  { id: 'authority', action: { kind: 'event', name: 'hm:focus-autonomy' }, skippable: true },
  { id: 'connect_app', action: { kind: 'route', to: '/hivemind/app/employee/apps' }, skippable: true },
  { id: 'first_proactive', action: { kind: 'proactive', to: '/hivemind/app/employee/calendar' }, skippable: true },
  { id: 'shared_brain', action: { kind: 'route', to: '/hivemind/app/employee/library' }, skippable: true },
  { id: 'brief_team', action: { kind: 'route', to: '/hivemind/app/employee/calendar', secondary: '/hivemind/app/team/members' }, skippable: true },
]);

export const STEP_IDS = Object.freeze(STEPS.map(step => step.id));

/** Pastel tile per step group; neighbours never share a colour. */
export const STEP_TILE = Object.freeze({
  language: 'butter', awaken: 'aqua', meet: 'lilac', first_task: 'butter', authority: 'mint',
  connect_app: 'aqua', first_proactive: 'lilac', shared_brain: 'mint', brief_team: 'butter',
});

/**
 * The older first-run surfaces this registry replaces, with the browser keys they used. Their "closed" state now lives in the
 * server record as surfaces; the keys are read once to carry earlier progress over, then left alone.
 */
export const LEGACY_SURFACES = Object.freeze({
  /** HyperAgentsWelcome's six-card company tour. */
  companyTour: { surface: 'company_tour:editorial-v1', key: (userId, orgId) => userId && orgId ? `hm.hyperagents-tour:editorial-v1:${userId}:${orgId}` : null, closed: raw => { try { return JSON.parse(raw)?.done === true; } catch { return false; } } },
  /** OverviewTour (Brain navigation tour, version 2). */
  brainTour: { surface: 'brain_tour:2', key: () => 'hm.tour.overview', closed: raw => raw === '2' },
});

/** The Runtime rail's checkpoint fields and the steps they complete (native checkpoint evidence, `hivemind:runtime-get-started`). */
export const RUNTIME_CHECKPOINT_STEPS = Object.freeze({ companyUnderstood: 'awaken', teamIntroduced: 'meet' });

/** The Runtime rail's browser store, read once so its checked steps carry over. */
export const LEGACY_RUNTIME_RAIL_KEY = scope => `hivemind.runtime-get-started:v2:${scope}`;

/**
 * Count of steps the person finished or skipped.
 * @param {{ id: string, status: string }[]} steps - Steps from the server view.
 * @returns {number}
 */
export function completedCount(steps) {
  return (steps || []).filter(step => step.status === 'done' || step.status === 'skipped').length;
}

/**
 * Steps that wait for something real to happen (a proactive item, a second employee using team memory). Until the server
 * marks one ready, the card moves past it and shows its status line instead, so nobody is stuck behind a moment that has not
 * happened yet and nothing is faked.
 */
export const WAITING_STEPS = Object.freeze(['first_proactive', 'shared_brain']);

/**
 * The first step that still needs the person, in registry order, passing over waiting steps that are not ready.
 * @param {{ id: string, status: string, ready?: boolean }[]} steps - Steps from the server view.
 * @returns {string|null} step id, or null when every step is done or skipped.
 */
export function nextStepId(steps) {
  const byId = new Map((steps || []).map(step => [step.id, step]));
  const open = STEP_IDS.filter(id => !['done', 'skipped'].includes(byId.get(id)?.status));
  return open.find(id => !WAITING_STEPS.includes(id) || byId.get(id)?.ready) || open[0] || null;
}
