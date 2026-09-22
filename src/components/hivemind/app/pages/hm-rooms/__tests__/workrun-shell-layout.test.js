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
  expect(sidebar).toContain("collapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'");
  expect(sidebar).toContain("aria-label={collapsed ? 'Expand company sidebar' : 'Collapse company sidebar'}");
  expect(inspector).toContain('aria-label="WorkRun preview"');
  expect(inspector).toContain('Artifacts, pages, computer sessions, and files from this run appear here.');
});
