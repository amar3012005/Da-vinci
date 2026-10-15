export const TOUR_VERSION = 'editorial-v1';
export const tourKey = (userId, orgId) => userId && orgId ? `hm.hyperagents-tour:${TOUR_VERSION}:${userId}:${orgId}` : null;
export function readTourProgress(storage, key) {
  if (!key) return { step: 0, done: false };
  try { const value = JSON.parse(storage.getItem(key)); return { step: Number.isInteger(value?.step) ? Math.max(0, Math.min(5, value.step)) : 0, done: value?.done === true }; }
  catch { return { step: 0, done: false }; }
}
export const tourCards = [
  { id:'01-welcome', title:'Your company is awake.', body:'I’m Runtime, your Chief of Staff. I coordinate your team and help turn your direction into finished work.', next:'Meet your team', crop:[84,195,1368,642] },
  { id:'02-specialists', title:'Meet your specialists.', body:'Different strengths. One coordinated team. Your saved employee profiles define each specialist’s role.', next:'See how we work', crop:[100,205,1335,542] },
  { id:'03-workflow', title:'You set direction. We move the work forward.', body:'Share the outcome you want. Runtime coordinates the specialists, reviews their work and brings back results or decisions that need you.', next:'Stay in the loop', crop:[64,250,1405,467] },
  { id:'04-status', title:'Stay informed without chasing.', body:'Follow progress in the sidebar. Your specialists bring ordinary work blockers to Runtime first.', next:'Explore your work', crop:[76,205,1385,432] },
  { id:'05-artifacts', title:'Your team’s work stays here.', body:'Find reports, spreadsheets, images and other deliverables in Artifacts. Connect apps when you’re ready; you choose what to share.', next:'Choose a direction', crop:[69,223,1398,531] },
  { id:'06-first-priority', title:'What should we move forward?', body:'Tell Runtime the outcome you want for your company. Your direction starts the conversation; this tour doesn’t start any work.', next:'Continue to Runtime', crop:[83,205,1370,627] },
];
