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
    expect(source).toContain('const roomAssignments = useMemo');
    expect(source).toContain('setShowAgentRooms(Boolean(assignedRoomSignature));');
    expect(source).toContain('? (assignedAgentRooms.length ? assignedAgentRooms : agentHomeRooms)');
    expect(source).toContain('displayedAgentRooms.map');
    expect(source).toContain('CompanyRoomActivityRow');
    expect(source).toContain('workRooms.map');
    expect(source).toContain('RoomDomainIcon');
  });

  it('keeps campaign completion and its dashboard inside Campaign Intelligence', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("label: 'Campaign Intelligence'");
    expect(source).toContain('<CampaignDashboardModal campaign={selectedCampaign}');
    expect(source).toContain('<CampaignProgressDashboard');
    expect(source).toContain('setSelectedCampaign(campaign)');
    expect(source).toContain('Campaign launched');
    expect(source).toContain('Launched campaigns');
    expect(source).toContain('Create campaign');
    expect(source).not.toContain('hm-campaign-handoff-');
    expect(source).not.toContain('seconds: 10');
  });

  it('keeps Campaign Intelligence work progressively visible in the Room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("'campaign_stage'");
    expect(source).toContain('Campaign Intelligence progress');
    expect(source).toContain("stages.filter(stage => !(accepted && stage.stage === 'validation')).slice(-6)");
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
    expect(source).toContain('const pinnedRef = useRef(true)');
    expect(source).toContain('if (el) el.scrollTop = el.scrollHeight;');
    expect(source).not.toContain('setShowRoomIntro(!window.localStorage.getItem');
    expect(source).toContain("`hm-room-intro-${room.id}`");
    expect(source).toContain('What this Room already knows');
    expect(source).toContain('Suggested operating path');
    expect(source).toContain('onClick={() => onRun(`${contextPrefix}');
  });

  it('opens every Room at the latest activity and limits Clear all to work Rooms', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain('Opening or switching a Room always starts at its latest durable activity.');
    expect(source).toContain('const observer = new MutationObserver(followLatest);');
    expect(source).toContain("observer.observe(el, { childList: true, subtree: true, characterData: true });");
    expect(source).toContain('const isCompanyIntelligenceRoom = Boolean(room.is_domain_home || room.isDomainHome);');
    expect(source).toContain('{!isCompanyIntelligenceRoom && (');
    expect(source).toContain("t('hyperAgents.clearAll', 'Clear all')");
    expect(source).toContain('setWorkPlan([]);');
    expect(source).toContain('roomJournal: []');
    expect(source).toContain('room_journal: []');
  });

  it('keeps the Campaign Intelligence operating banner as a campaign-only room surface', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain('campaignV2 ?');
    expect(source).toContain('h-[238px]');
    expect(source).toContain('bg-[#1d3d92]');
    expect(source).toContain('CampaignIntelligenceQuickRuns busy={busy} onRun={onRun} onStartCampaign={onStartCampaign}');
    expect(source).toContain('const startCampaignFromPreset');
    expect(source).toContain('Use only these connected organic channels: ${channels.join');
    expect(source).toContain('campaignV2={CAMPAIGN_INTELLIGENCE_V2 && isCampaignRoom}');
    expect(source).toContain('aria-label="Current launched campaign"');
    expect(source).toContain('sticky top-0 z-20');
  });

  it('shows natural work briefs, direct greetings, and one report with copy and download', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain('function legacyPlanNarrative');
    expect(source).toContain('<RoomLeadResponse content={workBriefText} />');
    expect(source).toContain('synthLine.conversational || campaignHandoff');
    expect(source).toContain('Download report as Markdown');
    expect(source).toContain('Copy report');
  });

  it('routes explicit Director connection events and resumes Gmail after OAuth', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("line?.t === 'connection_required'");
    expect(source).toContain('line?.explicit === true');
    expect(source).toContain("request.connector === 'gmail'");
    expect(source).toContain('setShowConnectors(true);');
    expect(source).toContain("apiClient.getNangoConnectSession('gmail')");
    expect(source).toContain('await apiClient.finalizeNangoConnection(providerKey, connectionId);');
    expect(source).toContain('if (turn) handleRerunTurn(turn);');
    expect(source).toContain("'work_brief', 'action_intent', 'connection_required'");
    expect(source).not.toContain('const outreachy = /outreach');
  });
});
