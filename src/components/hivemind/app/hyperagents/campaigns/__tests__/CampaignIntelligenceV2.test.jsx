import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CAMPAIGN_INTELLIGENCE_V2,
  CampaignConnectionsRail,
  CampaignIntelligenceLaunchpad,
} from '../CampaignIntelligenceV2';

describe('Campaign Intelligence V2 shell', () => {
  test('is enabled unless the rollback flag explicitly disables it', () => {
    expect(CAMPAIGN_INTELLIGENCE_V2).toBe(true);
  });

  test('renders natural-language and one-touch campaign entry points', () => {
    const markup = renderToStaticMarkup(
      <CampaignIntelligenceLaunchpad busy={false} onRun={() => {}} autonomyMode="AUTO" />,
    );
    expect(markup).toContain('Tell your campaign team what outcome you want');
    expect(markup).toContain('Launch an awareness sequence');
    expect(markup).toContain('Turn a page into a campaign');
    expect(markup).toContain('Auto operation');
  });

  test('derives execution readiness from tenant capability data', () => {
    const markup = renderToStaticMarkup(<CampaignConnectionsRail
      onConnect={() => {}}
      capabilities={{ channels: [
        { id: 'x_organic', connected: true, execution_ready: true },
        { id: 'gmail', connected: false, execution_ready: false },
        { id: 'x_ads', connected: true, execution_ready: false },
      ] }}
    />);
    expect(markup).toContain('X Organic Posts');
    expect(markup).toContain('Paid X Ads');
    expect(markup).toContain('1 ready');
    expect(markup).toContain('Schedule');
    expect(markup).toContain('Run ads');
  });

  test('surfaces a degraded provider sync without exposing provider details', () => {
    const markup = renderToStaticMarkup(<CampaignConnectionsRail
      onConnect={() => {}}
      capabilities={{ status: 'DEGRADED', channels: [] }}
    />);
    expect(markup).toContain('Sync needed');
    expect(markup).not.toContain('Zernio');
  });
});
