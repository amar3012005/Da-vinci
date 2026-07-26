import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignDashboardModal, { campaignTimeline } from '../CampaignDashboardModal';
import { deriveCampaignPayload } from '../CreateCampaignWizard';
import { withCampaignSearchParam } from '../CampaignsView';

jest.mock('../../../shared/api-client', () => ({}));
jest.mock('../CampaignDetail', () => () => <div>Campaign detail</div>);
jest.mock('react-router-dom', () => ({ useSearchParams: jest.fn() }), { virtual: true });

describe('campaign dashboard shell', () => {
  test('builds a minimal campaign payload with ready channels and strategic defaults', () => {
    const payload = deriveCampaignPayload(
      { objective: 'LEAD_GENERATION', goal: '  Start qualified conversations with founders  ', channels: [] },
      { channels: [
        { id: 'x_organic', executable: true, execution_ready: true },
        { id: 'gmail', executable: true, execution_ready: true },
        { id: 'tara', executable: false, execution_ready: false },
        { id: 'x_ads', executable: true, execution_ready: true },
      ] },
      'create-key',
      'Europe/Berlin',
    );

    expect(payload.goal).toBe('Start qualified conversations with founders');
    expect(payload.channels).toEqual(['x_organic', 'gmail']);
    expect(payload.audience).toEqual({ mode: 'existing_first', discover_if_insufficient: true });
    expect(payload.success_metrics).toEqual(['Qualified replies', 'Meetings booked', 'Conversion rate']);
    expect(payload.autonomy_mode).toBe('APPROVE_PLAN_ONCE');
    expect(payload.timezone).toBe('Europe/Berlin');
  });

  test('uses an explicit channel selection instead of all ready channels', () => {
    const payload = deriveCampaignPayload(
      { objective: 'AWARENESS', goal: 'Build awareness for our launch', channels: ['x_organic'] },
      { channels: [{ id: 'x_organic', executable: true, execution_ready: true }, { id: 'gmail', executable: true, execution_ready: true }] },
      'create-key',
    );
    expect(payload.channels).toEqual(['x_organic']);
  });

  test('campaign deep links preserve unrelated query parameters', () => {
    const opened = withCampaignSearchParam(new URLSearchParams('view=campaigns&source=nav'), 'campaign-42');
    expect(opened.toString()).toBe('view=campaigns&source=nav&campaign=campaign-42');
    const closed = withCampaignSearchParam(opened, null);
    expect(closed.toString()).toBe('view=campaigns&source=nav');
  });

  test('renders a timeline-first modal with chronological, human-readable events', () => {
    const campaign = {
      id: 'campaign-42', name: 'Founder awareness', status: 'READY_FOR_APPROVAL',
      events: [
        { id: 'ready', eventType: 'campaign_plan_ready', createdAt: '2026-07-26T17:56:32Z' },
        { id: 'created', eventType: 'campaign_created', createdAt: '2026-07-26T17:52:11Z' },
        { id: 'started', eventType: 'campaign_generation_started', createdAt: '2026-07-26T17:56:17Z' },
      ],
    };
    expect(campaignTimeline(campaign.events).map((event) => event.id)).toEqual(['created', 'started', 'ready']);

    const markup = renderToStaticMarkup(<CampaignDashboardModal campaign={campaign} loading={false} onClose={jest.fn()}><div>Campaign detail</div></CampaignDashboardModal>);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-label="Campaign progress"');
    expect(markup).toContain('Campaign and dedicated Room created');
    expect(markup).toContain('Agents started gathering and debating');
    expect(markup).toContain('Campaign plan contract accepted');
    expect(markup).toContain('Campaign detail');
  });
});
