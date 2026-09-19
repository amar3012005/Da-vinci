import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import CampaignRoomVisualProgress, { campaignVisualProgress } from '../CampaignRoomVisualProgress';
import apiClient from '../../../shared/api-client';

jest.mock('../../../shared/api-client', () => ({ getCampaignImageBlob: jest.fn() }));
jest.mock('../../RuntimeArtifactPopup', () => ({ __esModule: true, default: () => <div>Image popup</div> }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const campaign = (status, actions = []) => ({ id: 'campaign-1', name: 'Growth campaign', status, actions });
const action = (id, assetStatus) => ({
  id,
  actionType: 'POST',
  payload: { title: `Post ${id}`, creative_brief: { required: true }, asset_alt_text: `Visual ${id}` },
  assets: assetStatus ? [{ id: `asset-${id}`, status: assetStatus, content_url: assetStatus === 'READY' ? `/assets/${id}` : null, metadata: { alt_text: `Visual ${id}` } }] : [],
});

describe('CampaignRoomVisualProgress', () => {
  test('shows the in-room planning effect before visual actions exist', () => {
    const value = campaign('GENERATING');
    expect(campaignVisualProgress(value).planning).toBe(true);
    const markup = renderToStaticMarkup(<CampaignRoomVisualProgress campaign={value} />);
    expect(markup).toContain('Generating campaign visuals');
    expect(markup).toContain('selecting which actions need original imagery');
    expect((markup.match(/campaign-room-visual-planning/g) || [])).toHaveLength(3);
  });

  test('projects ready and generating assets together as they complete', () => {
    const value = campaign('READY_FOR_APPROVAL', [action('one', 'READY'), action('two', 'GENERATING'), action('three', 'WAITING_QUOTA')]);
    const progress = campaignVisualProgress(value);
    expect(progress.ready).toHaveLength(1);
    expect(progress.pending).toHaveLength(2);
    expect(progress.complete).toBe(false);
    const markup = renderToStaticMarkup(<CampaignRoomVisualProgress campaign={value} onOpenCampaign={jest.fn()} />);
    expect(markup).toContain('1 of 3 visuals ready');
    expect(markup).toContain('Creating visual');
    expect(markup).toContain('Waiting for capacity');
    expect(markup).toContain('Open Campaign Board');
  });

  test('keeps a required visual pending before its asset record is queued', () => {
    const value = campaign('READY_FOR_APPROVAL', [action('one')]);
    const progress = campaignVisualProgress(value);
    expect(progress.pending).toHaveLength(1);
    expect(progress.complete).toBe(false);
    const markup = renderToStaticMarkup(<CampaignRoomVisualProgress campaign={value} />);
    expect(markup).toContain('0 of 1 visual ready');
    expect(markup).toContain('Creating visual');
  });

  test('switches to the ready state after every selected visual is complete', () => {
    const value = campaign('READY_FOR_APPROVAL', [action('one', 'READY'), action('two', 'APPROVED')]);
    const progress = campaignVisualProgress(value);
    expect(progress.complete).toBe(true);
    const markup = renderToStaticMarkup(<CampaignRoomVisualProgress campaign={value} />);
    expect(markup).toContain('Campaign visuals ready');
    expect(markup).toContain('2 of 2 visuals ready');
    expect(markup).not.toContain('Creating visual');
  });

  test('opens the same image artifact popup used by Runtime', async () => {
    const value = campaign('READY_FOR_APPROVAL', [action('one', 'READY')]);
    const container = document.createElement('div');
    const root = createRoot(container);
    apiClient.getCampaignImageBlob.mockResolvedValue(new Blob(['image']));
    URL.createObjectURL = jest.fn(() => 'blob:campaign-visual');
    URL.revokeObjectURL = jest.fn();
    await act(async () => { root.render(<CampaignRoomVisualProgress campaign={value} />); });
    expect(container.textContent).not.toContain('Image popup');
    act(() => { container.querySelector('[data-testid="campaign-room-visual-ready"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.textContent).toContain('Image popup');
    act(() => { root.unmount(); });
  });

  test('does not invent a visual strip for campaigns without requested imagery', () => {
    const markup = renderToStaticMarkup(<CampaignRoomVisualProgress campaign={campaign('READY_FOR_APPROVAL')} />);
    expect(markup).toBe('');
  });
});
