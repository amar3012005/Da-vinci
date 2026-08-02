import { campaignProgress } from '../CampaignDetail';

jest.mock('../../../shared/api-client', () => ({}));
jest.mock('../../rooms/reports', () => ({ CampaignReport: () => null }));
jest.mock('../ActionCard', () => () => null);
jest.mock('../ChannelTab', () => () => null);

describe('campaign dashboard progress', () => {
  test('reduces campaign lifecycle to three user-facing stages', () => {
    expect(campaignProgress('GENERATING').map(({ label, state }) => [label, state])).toEqual([
      ['Campaign Room', 'current'],
      ['Plan ready', 'upcoming'],
      ['Campaign live', 'upcoming'],
    ]);

    expect(campaignProgress('READY_FOR_APPROVAL').map(({ state }) => state)).toEqual(['complete', 'current', 'upcoming']);
    expect(campaignProgress('RUNNING').map(({ state }) => state)).toEqual(['complete', 'complete', 'current']);
  });
});
