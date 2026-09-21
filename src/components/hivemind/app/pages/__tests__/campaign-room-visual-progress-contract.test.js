import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../HyperAgents.jsx'), 'utf8');

describe('Campaign Room visual lifecycle contract', () => {
  test('renders the shared visual progress projection inside the Room thread', () => {
    const turns = source.indexOf('turns.map(turn =>');
    const progress = source.indexOf('<CampaignRoomVisualProgress', turns);
    const errors = source.indexOf('{error &&', progress);
    expect(turns).toBeGreaterThan(-1);
    expect(progress).toBeGreaterThan(turns);
    expect(errors).toBeGreaterThan(progress);
  });

  test('keeps the user in the Room while images remain queued, generating, or quota-waiting', () => {
    expect(source).toContain("['QUEUED', 'GENERATING', 'WAITING_QUOTA'].includes(asset.status)");
    expect(source).toContain("action.payload?.creative_brief?.required === true && assets.length === 0");
    expect(source).toContain("&& !pendingAssets");
    expect(source).toContain('setRoomCampaigns((current) => [campaign');
  });

  test('continues polling the canonical Campaign API during image generation', () => {
    expect(source).toContain('window.setInterval(checkCampaign, 3500)');
    expect(source).toContain('window.setInterval(() => openRoomCampaign(selectedCampaign.id), 5000)');
  });

  test('adopts a canonical campaign materialized from an ordinary Room visual handoff', () => {
    expect(source).toContain("line?.t === 'campaign_visual_handoff'");
    expect(source).toContain('if (roomVisualCampaignId) setPendingCampaignId(roomVisualCampaignId)');
    expect(source).toContain('campaignReturn || roomVisualCampaignId');
  });
});
