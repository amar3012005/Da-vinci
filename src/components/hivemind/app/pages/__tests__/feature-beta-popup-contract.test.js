const fs = require('fs');
const path = require('path');

describe('Runtime entry and Operating Rooms beta popup', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
  const rooms = fs.readFileSync(path.join(__dirname, '..', 'OperatingRooms.jsx'), 'utf8');
  const modal = fs.readFileSync(path.join(__dirname, '..', 'FeatureBetaModal.jsx'), 'utf8');

  it('opens native Runtime chat while preserving the Operating Rooms beta', () => {
    expect(source).toContain("onClick={() => navigate('/hivemind/app/overview?runtime=1')}");
    expect(source).toContain("onClick={() => setBetaFeature('operatingRooms')}");
    expect(source).not.toContain("navigate('/hivemind/app/employees/operating-rooms')");
    expect(rooms).toContain("feature=\"operatingRooms\"");
    expect(rooms).toContain("navigate('/hivemind/app/employees/mycompany')");
  });

  it('explains the beta products in the popup', () => {
    expect(modal).toContain('Meta-Governing');
    expect(modal).toContain('Google Meet');
    expect(modal).toContain('beta users are testing it now');
  });
});
