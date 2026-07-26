import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignActivation from '../CampaignActivation';

describe('campaign activation dashboard', () => {
  test('shows a concise setup sequence before opening the dedicated Room', () => {
    const markup = renderToStaticMarkup(<CampaignActivation activation={{ status: 'working', step: 2, goal: 'Launch HIVEMIND for European legal firms' }} onClose={jest.fn()} />);
    expect(markup).toContain('Setting up your Campaign Room');
    expect(markup).toContain('Campaign brief accepted');
    expect(markup).toContain('Creating dedicated Room');
    expect(markup).toContain('Starting campaign workflow');
    expect(markup).not.toContain('Best');
    expect(markup).not.toContain('Population simulation');
  });

  test('announces navigation only after setup completes', () => {
    const markup = renderToStaticMarkup(<CampaignActivation activation={{ status: 'opening', step: 5, goal: 'Launch HIVEMIND' }} onClose={jest.fn()} />);
    expect(markup).toContain('Opening your HyperAgents Room');
    expect(markup).toContain('Campaign workflow started');
  });
});
