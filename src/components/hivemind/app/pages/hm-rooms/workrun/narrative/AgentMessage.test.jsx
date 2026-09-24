import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('../../../../hyperagents/rooms/shared', () => ({ renderMarkdownLite: (text) => text }));
jest.mock('../tools/ToolDisclosure', () => () => null);
jest.mock('../approval/ExternalActionCard', () => () => null);
jest.mock('./TurnUsage', () => () => null);
import AgentMessage from './AgentMessage';

describe('AgentMessage failure state', () => {
  it('shows a visible alert for an empty failed reply', () => {
    const html = renderToStaticMarkup(
      <AgentMessage failure="The agent session failed during setup." text="" streaming={false} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('failed during setup');
  });
});
