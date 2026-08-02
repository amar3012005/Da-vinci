const fs = require('fs');
const path = require('path');

describe('room response presentation contract', () => {
  it('keeps every business-function pack and renders one unboxed report authority', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("taskTag={room?.taskTag || 'GENERAL'}");
    expect(source).toContain("lines.find(l => l.t === 'work_brief' && l.content)");
    expect(source).toContain('final_report is the sole report source');
    expect(source).toContain('<ReportActions report={renderedReport}');
    expect(source).toContain('surface="room"');
    expect(source).not.toContain("t('hyperAgents.finalOutput', 'Final — room synthesis')");
  });

  it('renders tool activity as an unboxed reasoning trace on the room canvas', () => {
    const roomSource = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    const sharedSource = fs.readFileSync(path.join(__dirname, '..', '..', 'hyperagents', 'rooms', 'shared.jsx'), 'utf8');
    expect(roomSource).toContain('bg-[#fbfaf7]');
    expect(sharedSource).toContain("t('hyperAgents.reasoning', 'Reasoning')");
    expect(sharedSource).toContain('presentationFor(s).operation');
    expect(sharedSource).toContain('text-[#329044]">→');
    expect(sharedSource).toContain("t('hyperAgents.tlAfterOutput', 'Runs after final output')");
    expect(roomSource).toContain('actionIntents={actionIntents}');
    expect(sharedSource).not.toContain('tlUsedTools');
  });
});
