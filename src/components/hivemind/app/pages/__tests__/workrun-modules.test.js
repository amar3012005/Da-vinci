const fs = require('fs');
const path = require('path');
import GenericTool from '../workrun/tools/GenericTool';
import TaskRow from '../workrun/plan/TaskRow';
import ToolDisclosure from '../workrun/tools/ToolDisclosure';

const ROOT = path.join(__dirname, '../workrun');

const REQUIRED = [
  'WorkRunShell.jsx',
  'WorkRunHeader.jsx',
  'WorkRunStream.jsx',
  'WorkRunComposer.jsx',
  'index.js',
  'narrative/UserMessage.jsx',
  'narrative/AgentMessage.jsx',
  'narrative/StreamingText.jsx',
  'narrative/ReasoningRow.jsx',
  'dsh.module.css',
  'narrative/RunSummary.jsx',
  'activity/ActivityRow.jsx',
  'activity/ActivityGroup.jsx',
  'activity/SearchActivity.jsx',
  'activity/MemoryActivity.jsx',
  'activity/BrowserActivity.jsx',
  'activity/AppActivity.jsx',
  'tools/ToolDisclosure.jsx',
  'tools/BashTool.jsx',
  'tools/ReadTool.jsx',
  'tools/WriteTool.jsx',
  'tools/EditTool.jsx',
  'tools/SearchTool.jsx',
  'tools/ComposioTool.jsx',
  'tools/GenericTool.jsx',
  'plan/PlanInline.jsx',
  'plan/PlanDrawer.jsx',
  'plan/TaskRow.jsx',
  'team/TeamInline.jsx',
  'team/TeamDrawer.jsx',
  'team/AgentMember.jsx',
  'approval/ApprovalCard.jsx',
  'approval/ExternalActionCard.jsx',
  'inspector/Inspector.jsx',
  'inspector/InspectorTabs.jsx',
  'inspector/ArtifactPreview.jsx',
  'inspector/SourcesPanel.jsx',
  'inspector/FilesPanel.jsx',
  'inspector/ComputerPanel.jsx',
  'inspector/TeamPanel.jsx',
  'artifacts/ArtifactCard.jsx',
  'artifacts/ArtifactGrid.jsx',
  'artifacts/ArtifactPreviewRouter.jsx',
];

describe('workrun module tree', () => {
  it('contains every required element file', () => {
    REQUIRED.forEach((rel) => {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    });
  });

  it('ships real tool and plan components', () => {
    expect(typeof GenericTool).toBe('function');
    expect(typeof TaskRow).toBe('function');
    expect(typeof ToolDisclosure).toBe('function');
  });

  it('index re-exports the tree', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
    [
      'WorkRunShell', 'UserMessage', 'ToolDisclosure', 'Inspector', 'ArtifactPreviewRouter',
      'PlanInline', 'TeamDrawer', 'ApprovalCard', 'BashTool', 'ComputerPanel',
    ].forEach((name) => {
      expect(src).toContain(name);
    });
  });
});
