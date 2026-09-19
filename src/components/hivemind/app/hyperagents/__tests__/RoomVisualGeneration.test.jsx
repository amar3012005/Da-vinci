import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mergeVisualJobs, visualStageLabel, VisualJobCard } from '../RoomVisualGeneration';

jest.mock('../../shared/api-client', () => ({
  visualGenerationAssetUrl: (jobId, assetId) => `/visual/${jobId}/${assetId}`,
  visualGenerationEventsUrl: (jobId) => `/visual/${jobId}/events`,
}));

const baseJob = {
  job_id: 'job-1',
  instruction: 'Create a premium campaign launch image.',
  use_case: 'campaign_social',
  status: 'running',
  stage: 'generating_master',
  progress: 58,
  quality: 'quality',
  output: { mode: 'set', count: 2, aspect_ratios: ['16:9', '4:5'] },
  assets: [],
  created_at: '2026-09-19T18:00:00.000Z',
};

describe('RoomVisualGeneration', () => {
  test('renders a polished in-room progress card for every expected visual', () => {
    const markup = renderToStaticMarkup(<VisualJobCard job={baseJob} onPatch={jest.fn()} onRefresh={jest.fn()} onRetry={jest.fn()} onOpen={jest.fn()} />);
    expect(markup).toContain('Visual studio');
    expect(markup).toContain('Rendering the master');
    expect(markup).toContain('58%');
    expect((markup.match(/visual-generation-skeleton/g) || [])).toHaveLength(2);
  });

  test('shows authenticated final asset previews when the durable job completes', () => {
    const job = { ...baseJob, status: 'completed', stage: 'completed', progress: 100, assets: [
      { asset_id: 'asset-1', aspect_ratio: '16:9', content_type: 'image/jpeg' },
      { asset_id: 'asset-2', aspect_ratio: '4:5', content_type: 'image/jpeg' },
    ] };
    const markup = renderToStaticMarkup(<VisualJobCard job={job} onPatch={jest.fn()} onRefresh={jest.fn()} onRetry={jest.fn()} onOpen={jest.fn()} />);
    expect(markup).toContain('/visual/job-1/asset-1');
    expect(markup).toContain('/visual/job-1/asset-2');
    expect((markup.match(/visual-generation-ready/g) || [])).toHaveLength(2);
    expect(markup).toContain('Rendered + reviewed');
  });

  test('keeps a failed request visible with a real retry action', () => {
    const markup = renderToStaticMarkup(<VisualJobCard job={{ ...baseJob, status: 'failed', progress: 100, error: { message: 'Capacity exhausted.' } }} onPatch={jest.fn()} onRefresh={jest.fn()} onRetry={jest.fn()} onOpen={jest.fn()} />);
    expect(markup).toContain('Capacity exhausted.');
    expect(markup).toContain('Retry visual');
  });

  test('merges streamed patches without duplicating persisted jobs', () => {
    const merged = mergeVisualJobs([baseJob], [{ ...baseJob, stage: 'critiquing', progress: 70 }]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ job_id: 'job-1', stage: 'critiquing', progress: 70 });
    expect(visualStageLabel('art_direction')).toBe('Building art direction');
  });
});
