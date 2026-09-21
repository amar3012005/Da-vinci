import fs from 'fs';
import path from 'path';

const appRoot = path.join(__dirname, '..', '..');
const source = (relative) => fs.readFileSync(path.join(appRoot, relative), 'utf8');

describe('HM Rooms WorkRun routing', () => {
  it('mounts HM Rooms outside the dashboard shell and preserves the old WorkRun bookmark', () => {
    const routes = source('HiveMindApp.jsx');
    expect(routes).toContain("const HmRooms = React.lazy(() => import('./pages/hm-rooms/HmRooms'))");
    expect(routes).toContain('path="app/hm-rooms"');
    expect(routes).toContain('path="app/hm-rooms/:runId"');
    expect(routes).toContain('<PageSuspense><HmRooms /></PageSuspense>');
    expect(routes).toContain('function LegacyWorkRunRedirect()');
    expect(routes).toContain('`/hivemind/app/hm-rooms/${runId}`');
  });

  it('opens the HM Rooms canvas from the WorkRuns entry and keys a new session by the returned WorkRun id', () => {
    const legacyNav = source('pages/HyperAgents.jsx');
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    expect(legacyNav).toContain("navigate('/hivemind/app/hm-rooms')");
    expect(rooms).toContain('apiClient.createWorkRun({ goal: text })');
    expect(rooms).toContain('navigate(`/hivemind/app/hm-rooms/${id}`)');
  });

  it('uses the same legacy Rooms sidebar inside an active WorkRun session', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const shell = source('pages/hm-rooms/workrun/WorkRunShell.jsx');
    expect(rooms).toContain("import LegacyRoomsSidebar from './LegacyRoomsSidebar'");
    expect(rooms).toContain('<LegacyRoomsSidebar runs={runs} rooms={rooms} activeRunId={runId}');
    expect(shell).toContain('{legacySidebar}');
    expect(shell).toContain('Hyper Agents');
    expect(shell).not.toContain('<WorkRunHeader');
  });

  it('keeps the composer fixed while only the WorkRun conversation scrolls', () => {
    const shell = source('pages/hm-rooms/workrun/WorkRunShell.jsx');
    const stream = source('pages/hm-rooms/workrun/WorkRunStream.jsx');
    const userMessage = source('pages/hm-rooms/workrun/narrative/UserMessage.jsx');
    const agentMessage = source('pages/hm-rooms/workrun/narrative/AgentMessage.jsx');

    expect(shell).toContain('<WorkRunStream');
    expect(shell).toContain('shrink-0 border-t border-transparent');
    expect(stream).toContain('h-full overflow-y-auto overscroll-contain');
    expect(stream).toContain('const atLatest = node.scrollHeight - node.scrollTop - node.clientHeight < 96');
    expect(stream).toContain('if (!node || !followLive.current) return undefined');
    expect(stream).toContain('node.scrollTop = node.scrollHeight');
    expect(stream).toContain('ArrowDown size={13} /> Latest');
    expect(stream).toContain('[msgs]');
    expect(userMessage).toContain('items-end gap-2');
    expect(agentMessage).not.toContain('Working through the request');
    expect(agentMessage).not.toContain('View working notes');
    expect(agentMessage).toContain('label: item.label || item.name');
    expect(agentMessage).toContain("border-t border-[#e3e0db] pt-8");
  });

  it('offers a real stop control while a WorkRun is active', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const shell = source('pages/hm-rooms/workrun/WorkRunShell.jsx');
    const composer = source('pages/hm-rooms/workrun/WorkRunComposer.jsx');
    const api = source('shared/api-client.js');
    expect(rooms).toContain('await apiClient.cancelWorkRun(runId)');
    expect(shell).toContain('busy={working}');
    expect(composer).toContain('aria-label="Stop WorkRun"');
    expect(api).toContain('async cancelWorkRun(id)');
    expect(api).toContain("post(`/v1/workruns/${encodeURIComponent(id)}/chat`, { text: content })");
    expect(api).toContain('/cancel`');
  });

  it('keeps the initial WorkRun prompt as a conversation bubble', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    expect(rooms).toContain("const initialUser = { role: 'user'");
    expect(rooms).toContain('[initialUser, ...normalized]');
  });

  it('opens live streams before history hydration and replays their buffered events', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    expect(rooms.indexOf('new EventSource(apiClient.workRunSessionStreamUrl(runId)')).toBeLessThan(
      rooms.indexOf('apiClient.getWorkRunSessionMessages(runId)'),
    );
    expect(rooms).toContain('bufferedEvents.splice(0).forEach(onEvt)');
  });

  it('does not expose AgentScope sandbox confirmations in the WorkRun conversation', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const message = source('pages/hm-rooms/workrun/narrative/AgentMessage.jsx');
    expect(rooms).not.toContain('pendingConfirmationsFromMessages');
    expect(rooms).not.toContain('sendWorkRunConfirmation(runId, input)');
    expect(message).not.toContain('ApprovalCard');
    expect(message).not.toContain('Needs confirmation');
  });

  it('uses the HIVE pending-write policy record for external actions', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const api = source('shared/api-client.js');
    const card = source('pages/hm-rooms/workrun/approval/ExternalActionCard.jsx');
    expect(rooms).toContain("t: 'external_action.resolved'");
    expect(api).toContain('async resolvePendingWrite(id, action)');
    expect(api).toContain('/v1/proxy/pending-writes/');
    expect(card).toContain('Approve action');
    expect(card).not.toContain('Needs confirmation');
  });

  it('exposes governed AgentScope Routines without creating a second scheduler', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const shell = source('pages/hm-rooms/workrun/WorkRunShell.jsx');
    const drawer = source('pages/hm-rooms/workrun/RoutinesDrawer.jsx');
    const api = source('shared/api-client.js');
    expect(rooms).toContain('apiClient.listRoutines()');
    expect(rooms).toContain('apiClient.createRoutine(payload)');
    expect(rooms).toContain('apiClient.runRoutineNow(routineId)');
    expect(shell).toContain('<RoutinesDrawer');
    expect(drawer).toContain('AgentScope schedules · HIVE governed');
    expect(drawer).toContain('Create governed schedule');
    expect(api).toContain("get('/v1/routines");
    expect(api).toContain("post(`/v1/routines/${routineId}/run-now`");
  });
});
