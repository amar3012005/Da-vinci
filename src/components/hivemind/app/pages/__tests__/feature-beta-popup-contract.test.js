const fs = require('fs');
const path = require('path');

describe('Runtime and Operating Rooms beta popups', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
  const rooms = fs.readFileSync(path.join(__dirname, '..', 'OperatingRooms.jsx'), 'utf8');
  const modal = fs.readFileSync(path.join(__dirname, '..', 'FeatureBetaModal.jsx'), 'utf8');

  it('shows Runtime and Operating Rooms to every user but does not open them', () => {
    expect(source).toContain("onClick={() => setBetaFeature('runtime')}");
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
