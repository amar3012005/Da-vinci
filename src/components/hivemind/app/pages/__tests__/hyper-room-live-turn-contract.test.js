const fs = require('fs');
const path = require('path');

describe('HyperAgents live turn adoption', () => {
  it('subscribes to a server-started live turn after loading a room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("const liveTurn = [...nextTurns].reverse().find((turn) => turn?.status === 'live');");
    expect(source).toContain('setActiveTurnId(liveTurn?.id || null);');
  });

  it('keeps every domain as a permanent company Room and tags work Rooms', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    ['general', 'campaign', 'seo', 'marketing', 'branding', 'fundraising', 'research', 'product', 'design', 'legal_finance']
      .forEach((roomTag) => expect(source).toContain(`key: '${roomTag}'`));
    expect(source).toContain("t('hyperAgents.companyRooms', 'Company rooms')");
    expect(source).toContain("domain.key === 'general' ? 'HQ' : domain.label");
    expect(source).toContain("t('hyperAgents.workRooms', 'Work rooms')");
    expect(source).toContain('domainHomeRooms.map');
    expect(source).toContain('workRooms.map');
    expect(source).toContain('RoomDomainIcon');
  });

  it('keeps campaign completion in Campaign Intelligence before the dashboard handoff', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("label: 'Campaign Intelligence'");
    expect(source).toContain("setCampaignHandoff({ campaignId, seconds: 10");
    expect(source).toContain('Campaign Intelligence finished');
    expect(source).toContain('Campaign contract accepted');
    expect(source).toContain('onCampaignReady?.(campaignHandoff.campaignId)');
  });

  it('requires an explicit expertise category for every new Room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("const [roomTag, setRoomTag] = useState('');");
    expect(source).toContain('const step1Valid = !!roomTag && !!name.trim() && !!goal.trim() && scopeReady;');
    expect(source).toContain('room_tag: roomTag');
  });

  it('shows company context and one-click staged tasks on first Room entry', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain('function DomainRoomIntro');
    expect(source).toContain('The category workspace is a permanent part of the room.');
    expect(source).toContain('setRoomIntroAcknowledged(true)');
    expect(source).toContain('const pinnedRef = useRef(false)');
    expect(source).not.toContain('setShowRoomIntro(!window.localStorage.getItem');
    expect(source).toContain("`hm-room-intro-${room.id}`");
    expect(source).toContain('What this Room already knows');
    expect(source).toContain('Suggested operating path');
    expect(source).toContain('onClick={() => onRun(`${contextPrefix}');
  });
});
