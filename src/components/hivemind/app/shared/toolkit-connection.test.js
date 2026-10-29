import { toolkitConnectionState, toolkitOriginLabel } from './toolkit-connection';

// Rows as Core's GET /v1/connectors/composio/toolkits returns them for the shared tenant inventory
// (personal gmail ACTIVE, github EXPIRED, notion not connected).
const gmail = { slug: 'gmail', connected: true, connection_status: 'connected', connection_origin: 'personal' };
const github = { slug: 'github', connected: false, connection_status: 'reconnect', connection_origin: null };
const notion = { slug: 'notion', connected: false, connection_status: 'available', connection_origin: null };

test('maps the Core connection_status to the card state', () => {
  expect(toolkitConnectionState(gmail)).toBe('connected');
  expect(toolkitConnectionState(github)).toBe('reconnect');
  expect(toolkitConnectionState(notion)).toBe('available');
});

test('an action taken on the page overrides the last fetch', () => {
  expect(toolkitConnectionState(github, 'connected')).toBe('connected');
  expect(toolkitConnectionState(gmail, 'disconnected')).toBe('available');
});

test('an older Core response without connection_status falls back to connected', () => {
  expect(toolkitConnectionState({ slug: 'gmail', connected: true })).toBe('connected');
  expect(toolkitConnectionState({ slug: 'gmail', connected: false })).toBe('available');
});

test('labels the origin of the chosen account', () => {
  expect(toolkitOriginLabel(gmail)).toBe('Personal');
  expect(toolkitOriginLabel({ connection_origin: 'workspace' })).toBe('Workspace');
  expect(toolkitOriginLabel(github)).toBe('');
});
