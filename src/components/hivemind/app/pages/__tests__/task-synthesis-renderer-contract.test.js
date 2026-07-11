const fs = require('fs');
const path = require('path');

describe('task synthesis renderer', () => {
  it('renders every business-function pack and defaults user rooms to General', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    ['RESEARCH', 'OUTREACH', 'MARKETING', 'STRATEGY', 'FEATURE', 'GENERAL'].forEach((tag) => {
      expect(source).toContain(`${tag}: {`);
    });
    expect(source).toContain('<TaskSynthesisRenderer taskTag={taskTag} content={synthLine.content} />');
    expect(source).toContain("taskTag={room?.taskTag || 'GENERAL'}");
  });
});
