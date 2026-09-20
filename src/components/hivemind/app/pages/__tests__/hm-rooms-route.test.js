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
    expect(shell).toContain('{navOpen ? legacySidebar : null}');
    expect(shell).toContain('Hyper Agents');
  });

  it('keeps the composer fixed while only the WorkRun conversation scrolls', () => {
    const shell = source('pages/hm-rooms/workrun/WorkRunShell.jsx');
    const stream = source('pages/hm-rooms/workrun/WorkRunStream.jsx');
    const userMessage = source('pages/hm-rooms/workrun/narrative/UserMessage.jsx');
    const agentMessage = source('pages/hm-rooms/workrun/narrative/AgentMessage.jsx');

    expect(shell).toContain('<WorkRunStream');
    expect(shell).toContain('shrink-0 border-t border-transparent');
    expect(stream).toContain('flex-1 min-h-0 overflow-y-auto overscroll-contain');
    expect(stream).toContain("node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })");
    expect(stream).toContain('[msgs]');
    expect(userMessage).toContain('items-end gap-2');
    expect(agentMessage).not.toContain('Working through the request');
    expect(agentMessage).not.toContain('View working notes');
    expect(agentMessage).toContain('label: item.name');
    expect(agentMessage).toContain("border-t border-[#e3e0db] pt-8");
  });

  it('does not expose AgentScope sandbox confirmations in the WorkRun conversation', () => {
    const rooms = source('pages/hm-rooms/HmRooms.jsx');
    const message = source('pages/hm-rooms/workrun/narrative/AgentMessage.jsx');
    expect(rooms).not.toContain('pendingConfirmationsFromMessages');
    expect(rooms).not.toContain('sendWorkRunConfirmation(runId, input)');
    expect(message).not.toContain('ApprovalCard');
    expect(message).not.toContain('Needs confirmation');
  });
});
