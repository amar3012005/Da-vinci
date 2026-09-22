const fs = require('fs');
const path = require('path');

test('legacy MCP server deep links canonicalize to the single MCP route', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../..', 'HiveMindApp.jsx'), 'utf8');
  const connectors = fs.readFileSync(path.resolve(__dirname, '../Connectors.jsx'), 'utf8');

  expect(app).toContain('path="mcp-server/*"');
  expect(app).toContain("/hivemind/app/mcp${location.search || ''}");
  expect(connectors).toContain('/hivemind/app/mcp?source=connectors&connector=claude-web&prompt=agent');
});

test('agent prompt makes recall-first and entity-rich saving explicit', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../McpServer.jsx'), 'utf8');

  expect(source).toContain('living, tenant-scoped memory cortex');
  expect(source).toContain('entity:<slug> tags');
  expect(source).toContain('Do not invent entities');
  expect(source).toContain('source-page:<url>');
});
