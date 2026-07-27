import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignActivation from '../CampaignActivation';

describe('campaign activation dashboard', () => {
  test('shows a concise setup sequence before opening Campaign Intelligence', () => {
    const markup = renderToStaticMarkup(<CampaignActivation activation={{ status: 'working', step: 2, goal: 'Launch HIVEMIND for European legal firms' }} onClose={jest.fn()} />);
    expect(markup).toContain('Preparing Campaign Intelligence');
    expect(markup).toContain('Campaign brief accepted');
    expect(markup).toContain('Opening Campaign Intelligence');
    expect(markup).toContain('Starting campaign workflow');
    expect(markup).not.toContain('Best');
    expect(markup).not.toContain('Population simulation');
  });

  test('announces navigation only after setup completes', () => {
    const markup = renderToStaticMarkup(<CampaignActivation activation={{ status: 'opening', step: 5, goal: 'Launch HIVEMIND' }} onClose={jest.fn()} />);
    expect(markup).toContain('Opening Campaign Intelligence');
    expect(markup).toContain('Campaign workflow started');
  });
});
