import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignDashboardModal from '../CampaignDashboardModal';
import { campaignPaceSummary, deriveCampaignPayload } from '../CreateCampaignWizard';
import { withCampaignSearchParam } from '../CampaignsView';
import { CHANNEL_DESCRIPTIONS, CHANNEL_NAMES } from '../channel-catalog';

jest.mock('../../../shared/api-client', () => ({}));
jest.mock('../CampaignDetail', () => () => <div>Campaign detail</div>);
jest.mock('react-router-dom', () => ({ useSearchParams: jest.fn() }), { virtual: true });

describe('campaign dashboard shell', () => {
  test('distinguishes organic X publishing from paid X advertising', () => {
    expect(CHANNEL_NAMES.x_organic).toBe('X Organic Posts');
    expect(CHANNEL_NAMES.x_ads).toBe('Paid X Ads');
    expect(CHANNEL_DESCRIPTIONS.x_organic).toMatch(/regular posts/i);
    expect(CHANNEL_DESCRIPTIONS.x_ads).toMatch(/Ads API approval/i);
  });

  test('builds a minimal campaign payload with ready channels and strategic defaults', () => {
    const payload = deriveCampaignPayload(
      { objective: 'LEAD_GENERATION', goal: '  Start qualified conversations with founders  ', channels: [], durationDays: 30, intensity: 'high' },
      { channels: [
        { id: 'x_organic', executable: true, execution_ready: true },
        { id: 'gmail', executable: true, execution_ready: true },
        { id: 'tara', executable: true, execution_ready: false },
        { id: 'x_ads', executable: true, execution_ready: true },
      ] },
      'create-key',
      'Europe/Berlin',
    );

    expect(payload.goal).toBe('Start qualified conversations with founders');
    expect(payload.channels).toEqual(['x_organic', 'gmail', 'x_ads']);
    expect(payload.audience).toEqual({ mode: 'existing_first', discover_if_insufficient: true });
    expect(payload.success_metrics).toEqual(['Qualified replies', 'Meetings booked', 'Conversion rate']);
    expect(payload.autonomy_mode).toBe('APPROVE_PLAN_ONCE');
    expect(payload.timezone).toBe('Europe/Berlin');
    expect(payload.duration_days).toBe(30);
    expect(payload.intensity).toBe('high');
    expect(payload.cadence).toEqual({ preset: 'high' });
  });

  test('summarizes horizon and pace without asking the user for an exact post count', () => {
    expect(campaignPaceSummary({ durationDays: 14, intensity: 'focused', channels: ['x_organic'] })).toEqual({
      minimum: 6, maximum: 8, channelLabel: 'X Organic Posts', actionSummary: '6-8 X Organic Posts actions',
    });
  });

  test('uses an explicit channel selection instead of all ready channels', () => {
    const payload = deriveCampaignPayload(
      { objective: 'AWARENESS', goal: 'Build awareness for our launch', channels: ['x_organic'] },
      { channels: [{ id: 'x_organic', executable: true, execution_ready: true }, { id: 'gmail', executable: true, execution_ready: true }] },
      'create-key',
    );
    expect(payload.channels).toEqual(['x_organic']);
  });

  test('keeps an explicit plan-only platform in the campaign brief', () => {
    const payload = deriveCampaignPayload(
      { objective: 'AWARENESS', goal: 'Build category awareness with a paid social test', channels: ['meta'], durationDays: 7, intensity: 'light' },
      { channels: [{ id: 'meta', planning_ready: true, executable: false, execution_ready: false }] },
      'create-key',
    );
    expect(payload.channels).toEqual(['meta']);
    expect(payload.duration_days).toBe(7);
  });

  test('campaign deep links preserve unrelated query parameters', () => {
    const opened = withCampaignSearchParam(new URLSearchParams('view=campaigns&source=nav'), 'campaign-42');
    expect(opened.toString()).toBe('view=campaigns&source=nav&campaign=campaign-42');
    const closed = withCampaignSearchParam(opened, null);
    expect(closed.toString()).toBe('view=campaigns&source=nav');
  });

  test('renders one dashboard shell without a duplicate campaign header or timeline', () => {
    const campaign = {
      id: 'campaign-42', name: 'Founder awareness', status: 'READY_FOR_APPROVAL',
      events: [
        { id: 'ready', eventType: 'campaign_plan_ready', createdAt: '2026-07-26T17:56:32Z' },
        { id: 'created', eventType: 'campaign_created', createdAt: '2026-07-26T17:52:11Z' },
        { id: 'started', eventType: 'campaign_generation_started', createdAt: '2026-07-26T17:56:17Z' },
      ],
    };
    const markup = renderToStaticMarkup(<CampaignDashboardModal campaign={campaign} loading={false} onClose={jest.fn()}><div>Campaign detail</div></CampaignDashboardModal>);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('Founder awareness');
    expect(markup).toContain('Campaign detail');
    expect(markup).not.toContain('Campaign progress and operating plan');
    expect(markup).not.toContain('Campaign plan contract accepted');
  });
});
