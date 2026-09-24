const fs = require('fs');
const path = require('path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('HM Rooms keeps Company navigation and preview as independent resizable shell surfaces', () => {
  const shell = read('../workrun/WorkRunShell.jsx');
  const sidebar = read('../LegacyRoomsSidebar.jsx');
  const inspector = read('../workrun/inspector/Inspector.jsx');

  expect(shell).toContain('const [sidebarCollapsed, setSidebarCollapsed] = useState(false);');
  expect(shell).toContain('cloneElement(legacySidebar, { collapsed: sidebarCollapsed, onCollapsedChange: setSidebarCollapsed })');
  expect(shell).toContain('const [previewWidth, setPreviewWidth] = useState(360);');
  expect(shell).toContain('aria-label="Resize preview pane"');
  expect(shell).toContain('<PlanInline tasks={tasks} onOpen={() => setPlanOpen(true)} />');
  expect(read('../HmRooms.jsx')).toContain('const liveReplyRef = useRef(false);');
  expect(read('../HmRooms.jsx')).toContain('const appliesToLiveReply = liveReplyRef.current;');
  expect(sidebar).toContain("collapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'");
  expect(sidebar).toContain("aria-label={collapsed ? 'Expand company sidebar' : 'Collapse company sidebar'}");
  expect(inspector).toContain('aria-label="WorkRun preview"');
  expect(inspector).toContain('Artifacts, pages, computer sessions, and files from this run appear here.');
});

test('tool activity rows retain both the human label and the actual tool identifier', () => {
  const genericTool = read('../workrun/tools/GenericTool.jsx');
  const disclosure = read('../workrun/tools/ToolDisclosure.jsx');

  expect(genericTool).toContain("const action = label && label !== rawName ? label : (isCommand ? 'Ran' : 'Tool call');");
  expect(genericTool).toContain('font-mono text-[12px] text-[#737373]');
  expect(genericTool).toContain('const preview = compactInput(input)');
  expect(disclosure).toContain('input: tool?.input');
});

test('follow-up turns keep the AgentScope session stream attached after WorkRun terminal status', () => {
  const rooms = read('../HmRooms.jsx');

  expect(rooms).toContain('const terminal = [\'failed\', \'completed\', \'cancelled\'].includes(String(row?.status || \'\'));');
  expect(rooms).toContain('new EventSource(apiClient.workRunSessionStreamUrl(runId), { withCredentials: true })');
  expect(rooms).toContain('if (terminal && !liveReplyRef.current) return;');
  expect(rooms).toContain('const progress = terminal ? null : new EventSource(apiClient.workRunStreamUrl(runId), { withCredentials: true });');
  expect(rooms).toContain('const historyPromise = apiClient.getWorkRunSessionMessages(runId).catch(() => null);');
  expect(rooms.indexOf('new EventSource(apiClient.workRunSessionStreamUrl(runId)')).toBeLessThan(rooms.indexOf('const history = await historyPromise;'));
  expect(rooms.indexOf('const historyPromise =')).toBeLessThan(rooms.indexOf('const history = await historyPromise;'));
  expect(rooms).toContain('const historyHasLiveReply = !terminal && !submittedTurnRef.current && normalized.some((message) => (');
  expect(rooms).toContain('const working = phase === \'streaming\';');
  expect(rooms).not.toContain('if (terminal) return;');
});
