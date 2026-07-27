import { campaignProgress } from '../CampaignDetail';

jest.mock('../../../shared/api-client', () => ({}));
jest.mock('../../rooms/reports', () => ({ CampaignReport: () => null }));
jest.mock('../ActionCard', () => () => null);
jest.mock('../ChannelTab', () => () => null);

describe('campaign dashboard progress', () => {
  test('shows the launch handoff instead of repeating room internals', () => {
    expect(campaignProgress('GENERATING').map(({ label, state }) => [label, state])).toEqual([
      ['Plan accepted', 'current'],
      ['Launch checks', 'upcoming'],
      ['First action', 'upcoming'],
      ['Schedule active', 'upcoming'],
    ]);

    expect(campaignProgress('READY_FOR_APPROVAL').map(({ state }) => state)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    expect(campaignProgress({ status: 'RUNNING', actions: [{ status: 'QUEUED' }] }).map(({ state }) => state)).toEqual(['complete', 'complete', 'current', 'upcoming']);
    expect(campaignProgress({ status: 'RUNNING', actions: [{ status: 'SUCCEEDED' }] }).map(({ state }) => state)).toEqual(['complete', 'complete', 'complete', 'current']);
  });
});
