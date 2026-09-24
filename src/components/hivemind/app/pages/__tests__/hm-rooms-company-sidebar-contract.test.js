const fs = require('fs');
const path = require('path');

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('HM Rooms uses the company workspace rail and AgentScope page', () => {
  it('routes the HM Rooms URL through the company workspace shell', () => {
    const routes = read('../../HiveMindApp.jsx');
    expect(routes).toContain('<Route path="hm-rooms" element={<PageSuspense><HyperAgents /></PageSuspense>} />');
    expect(routes).toContain('<Route path="hm-rooms/:runId" element={<PageSuspense><HyperAgents /></PageSuspense>} />');
  });

  it('renders the dedicated HmRooms list and desk from the My Company sidebar', () => {
    const page = read('../HyperAgents.jsx');
    expect(page).toContain("import { HmRoomDesk, HmRoomList } from './HmRooms';");
    expect(page).toContain('<span>HM Rooms</span>');
    expect(page).toContain('aria-label="New WorkRun"');
    expect(page).toContain('No WorkRuns yet.');
    expect(page).toContain('<HmRoomDesk key={activeWorkRunId} runId={activeWorkRunId} />');
    expect(page).toContain('<HmRoomList />');
  });
});
