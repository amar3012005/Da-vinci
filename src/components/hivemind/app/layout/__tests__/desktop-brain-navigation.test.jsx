import React from 'react';
// CRA Jest 27 predates React Router 7 package exports. Exercise its real router.
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Brain } from 'lucide-react';
import DesktopBrainNavigation from '../DesktopBrainNavigation';
import '@testing-library/jest-dom';

const link = (path, label) => ({ to: `/hivemind/app/${path}`, label, icon: Brain });
const sections = [
  { items: [link('overview', 'Overview'), link('overview/dreaming', 'Dreaming')] },
  { items: [link('memories', 'Memories'), link('knowledge', 'Upload Everything'), link('connectors', 'Connectors'), link('meeting-notes', 'AI Meeting Notes'), link('graph', 'Memory Graph')] },
  { items: [link('workspace', 'Workspace Admin')] },
  { items: [link('mcp', 'MCP Server'), link('keys', 'API Keys'), link('evaluation', 'Evaluation')] },
];
function setup(path = '/hivemind/app/memories') {
  return render(<MemoryRouter initialEntries={[path]}><DesktopBrainNavigation sections={sections} user={{ display_name: 'Amar' }} planLabel="Enterprise Plan" credits={{ percent_used: 41, remaining: 2358, included: 4000 }} logout={jest.fn()}/></MemoryRouter>);
}

test('advanced destinations stay collapsed until explicitly opened, and keep native routes', () => {
  setup();
  expect(screen.queryByRole('link', { name: 'API Keys' })).not.toBeInTheDocument();
  const advanced = screen.getByRole('button', { name: 'Advanced' });
  fireEvent.click(advanced);
  expect(advanced).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute('href', '/hivemind/app/keys');
  fireEvent.click(advanced);
  expect(screen.queryByRole('link', { name: 'API Keys' })).not.toBeInTheDocument();
});

test('the selected Brain destination has its own active state; banner precedes real account usage', () => {
  const { container } = setup();
  expect(screen.getByRole('link', { name: 'Memories' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Uploads' })).not.toHaveAttribute('aria-current');
  expect(screen.queryByRole('link', { name: /invite/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Workspace Admin' })).toHaveAttribute('href', '/hivemind/app/workspace');
  const banner = screen.getByRole('link', { name: 'Explore your Brain' });
  const usage = screen.getByRole('link', { name: /View credit usage: 41% used/ });
  expect(banner.compareDocumentPosition(usage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelectorAll('.brain-icon-grid > *')).toHaveLength(6);
});

test('account settings uses the existing account action', () => {
  setup();
  const listener = jest.fn();
  window.addEventListener('hm:open-account-settings', listener);
  fireEvent.click(screen.getByRole('button', { name: 'Account & Settings' }));
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('hm:open-account-settings', listener);
});
