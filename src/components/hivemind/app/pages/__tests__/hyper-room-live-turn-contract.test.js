const fs = require('fs');
const path = require('path');

describe('HyperAgents live turn adoption', () => {
  it('subscribes to a server-started live turn after loading a room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("const liveTurn = [...nextTurns].reverse().find((turn) => turn?.status === 'live');");
    expect(source).toContain('setActiveTurnId(liveTurn?.id || null);');
  });

  it('keeps every domain visible in the Room category rail', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    ['general', 'seo', 'marketing', 'branding', 'fundraising', 'research', 'product', 'design', 'legal_finance']
      .forEach((roomTag) => expect(source).toContain(`key: '${roomTag}'`));
    expect(source).toContain('aria-label="Room categories"');
    expect(source).toContain("const [roomCategory, setRoomCategory] = useState('all');");
    expect(source).toContain('visibleLiveRooms.map');
  });

  it('requires an explicit expertise category for every new Room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("const [roomTag, setRoomTag] = useState('');");
    expect(source).toContain('const step1Valid = !!roomTag && !!name.trim() && !!goal.trim() && scopeReady;');
    expect(source).toContain('room_tag: roomTag');
  });
});
