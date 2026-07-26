import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignRoomExperience, { groupCampaignRoomTranscript } from '../CampaignRoomExperience';

const campaign = {
  name: 'Legal awareness campaign',
  goal: 'Launch HIVEMIND for legal firms across Europe',
  requestedChannels: ['x_organic'],
  status: 'GENERATING',
  roomTranscript: [{ lines: [
    { t: 'typing', agent: 'research_lead', note: 'Gathering company evidence.' },
    { t: 'gather', agent: 'research_lead', sources: ['hivemind'] },
    { t: 'round_start', round: 1 },
    { t: 'react', agent: 'strategy_lead', content: 'Use product proof instead of broad AI claims.' },
  ] }],
  planVersions: [],
};

describe('CampaignRoomExperience', () => {
  it('groups campaign work into high-level evidence and decision signals', () => {
    const groups = groupCampaignRoomTranscript(campaign.roomTranscript);
    expect(groups.research).toHaveLength(2);
    expect(groups.debate).toHaveLength(2);
    expect(groups.research[1].content).toContain('company knowledge');
  });

  it('renders four calm campaign phases without generic synthesis chrome', () => {
    const markup = renderToStaticMarkup(<CampaignRoomExperience campaign={campaign} ReportComponent={() => null} />);
    ['Brief', 'Evidence', 'Decisions', 'Build', 'Evidence gathered', 'Strategic decisions'].forEach((label) => expect(markup).toContain(label));
    expect(markup).not.toContain('Final synthesis');
    expect(markup).not.toContain('CAMPAIGN_ID');
  });

  it('hands the accepted bundle directly to the Campaign Board renderer', () => {
    const ready = {
      ...campaign,
      status: 'READY_FOR_APPROVAL',
      planVersions: [{ bundle: { strategy: 'Proof led', actions: [] }, reportMarkdown: '' }],
    };
    const Report = ({ report, surface }) => <div>{surface}:{report.bundle.strategy}</div>;
    const markup = renderToStaticMarkup(<CampaignRoomExperience campaign={ready} ReportComponent={Report} />);
    expect(markup).toContain('dashboard:Proof led');
    expect(markup).not.toContain('Evidence gathered');
  });
});
