import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.node';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import apiClient from './api-client';
import { progressiveDraftFields, parseProgressiveDraftFields } from './progressive-draft-fields';
import { draftPresentation, MobileDraftCards } from './claude-chat';

jest.mock('./api-client', () => ({ __esModule: true, default: { controlPlane: {
  get: jest.fn(async () => ({ data: { drafts: [] } })),
  patch: jest.fn(async () => ({ data: {} })),
} } }));

const draft = { id: 'draft-1', status: 'draft', toolName: 'NOTION_CREATE_PAGE', toolArgs: {
  _harness_version: 'progressive-v1', _composio_slug: 'NOTION_CREATE_PAGE', title: 'Project', count: 2, published: false, blocks: [{ text: 'Hello' }],
  _input_schema: { type: 'object', required: ['title'], properties: {
    title: { type: 'string' }, count: { type: 'integer' }, published: { type: 'boolean' }, blocks: { type: 'array' },
    org_id: { type: 'string' }, _composio_slug: { type: 'string' },
  } },
} };

test('only flagged schema-backed drafts become generic editable forms', () => {
  expect(progressiveDraftFields({ toolArgs: { title: 'Legacy' } })).toBeNull();
  expect(draftPresentation(draft).editable).toBe(true);
  expect(progressiveDraftFields(draft).map(field => field.key)).toEqual(['title', 'count', 'published', 'blocks']);
  expect(draftPresentation({ ...draft, toolName: 'GMAIL_SEND_EMAIL' }).kind).toBe('generic');
});

test('edited values retain primitive and nested JSON types without authority metadata', () => {
  expect(parseProgressiveDraftFields(progressiveDraftFields(draft), { title: 'Neu', count: '3', published: 'true', blocks: '[{"text":"Hallo"}]', org_id: 'attacker' }))
    .toEqual({ title: 'Neu', count: 3, published: true, blocks: [{ text: 'Hallo' }] });
  expect(() => parseProgressiveDraftFields(progressiveDraftFields(draft), { title: 'Neu', count: '2.5' })).toThrow('integer');
  expect(() => parseProgressiveDraftFields(progressiveDraftFields(draft), { title: 'Neu', blocks: 'broken' })).toThrow('JSON');
});

test('pending generic card offers edit and approval without email-specific or metadata text', () => {
  const html = renderToStaticMarkup(<MobileDraftCards pendingActions={[draft]} />);
  expect(html).toContain('Edit draft');
  expect(html).toContain('Approve and continue');
  expect(html).toContain('Nothing has been executed yet');
  expect(html).not.toContain('Send email');
  expect(html).not.toContain('_input_schema');
  expect(html).not.toContain('_harness_version');
});

test('shared card edit and save submit typed schema fields to the existing endpoint', async () => {
  apiClient.controlPlane.get.mockResolvedValue({ data: { drafts: [] } });
  apiClient.controlPlane.patch.mockResolvedValue({ data: { draft } });
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MobileDraftCards pendingActions={[draft]} />));
    await act(async () => container.querySelector('[aria-label="Edit draft"]').click());
    expect(container.querySelectorAll('textarea')).toHaveLength(4);
    const save = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Save edits');
    await act(async () => save.click());
    expect(apiClient.controlPlane.patch).toHaveBeenCalledWith('/v1/proxy/pending-writes/draft-1', { tool_args: {
      title: 'Project', count: 2, published: false, blocks: [{ text: 'Hello' }],
    } });
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
