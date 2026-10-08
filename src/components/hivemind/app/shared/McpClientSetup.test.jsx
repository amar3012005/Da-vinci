import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import McpClientSetup, { HIVEMIND_MCP_URL, MCP_CLIENT_GUIDES, McpClientSetupModal } from './McpClientSetup';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, fallback, values) => values ? fallback.replace('{{client}}', values.client) : fallback }) }));

test('ChatGPT uses canonical remote MCP OAuth instead of legacy GPT Actions credentials', () => {
  render(<McpClientSetup />);
  expect(screen.getByText(HIVEMIND_MCP_URL)).toBeInTheDocument();
  expect(screen.getByText(/Register automatically|automatic client registration/)).toBeInTheDocument();
  expect(screen.getByText(/Install it, sign in/)).toBeInTheDocument();
  expect(screen.queryByText('OpenAPI spec URL')).not.toBeInTheDocument();
  expect(screen.queryByText(/hmc_/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Official setup guide/ })).toHaveAttribute('href', MCP_CLIENT_GUIDES.chatgpt.docs);
});

test('selects distinct client schemas without inventing an authenticated connection', () => {
  render(<McpClientSetup selectable />);
  fireEvent.click(screen.getByRole('button', { name: 'VS Code' }));
  const vscode = JSON.parse(MCP_CLIENT_GUIDES.vscode.config);
  expect(vscode.servers.hivemind).toEqual({ type: 'http', url: HIVEMIND_MCP_URL });
  expect(vscode.mcpServers).toBeUndefined();
  expect(screen.getByText(/servers object/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Codex CLI' }));
  expect(screen.getByText(/codex mcp add/, { selector: 'pre' })).toHaveTextContent('codex mcp login hivemind');
  expect(screen.getByText(/do not confirm a connection/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Claude' }));
  expect(screen.getByText(/Sign in now and Register automatically/)).toBeInTheDocument();
  expect(screen.getByText(/No fixed request headers/)).toBeInTheDocument();
});

test('clipboard failure does not report copied success', async () => {
  const writeText = jest.fn().mockRejectedValue(new Error('Clipboard denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<McpClientSetup />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy MCP server URL' }));
  expect(writeText).toHaveBeenCalledWith(HIVEMIND_MCP_URL);
});

test('setup modal closes on Escape and restores existing focus', () => {
  const prior = document.createElement('button'); document.body.appendChild(prior); prior.focus();
  const onClose = jest.fn();
  const view = render(<McpClientSetupModal client="claude" onClose={onClose} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  view.unmount(); expect(document.activeElement).toBe(prior); prior.remove();
});
