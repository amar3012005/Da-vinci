const fs = require('fs');
const path = require('path');

describe('HyperAgents live turn adoption', () => {
  it('subscribes to a server-started live turn after loading a room', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'HyperAgents.jsx'), 'utf8');
    expect(source).toContain("const liveTurn = [...nextTurns].reverse().find((turn) => turn?.status === 'live');");
    expect(source).toContain('setActiveTurnId(liveTurn?.id || null);');
  });
});
