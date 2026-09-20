const fs = require('fs');
const path = require('path');

describe('WorkRun legacy room handoff', () => {
  it('opens the durable WorkRun room in the existing HyperAgents room surface', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'WorkRunConsole.jsx'), 'utf8');
    expect(source).toContain('const legacyRoomPath = (run) =>');
    expect(source).toContain('/hivemind/app/employees/rooms/${roomId}?workrun=${encodeURIComponent(run.id)}');
    expect(source).toContain('navigate(legacyRoomPath(created))');
    expect(source).toContain('onOpen={(selected) => navigate(legacyRoomPath(selected))}');
  });

  it('keeps WorkRuns discoverable from the legacy rooms rail', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("navigate('/hivemind/app/employees/workruns')");
    expect(source).toContain('WorkRuns');
  });
});
