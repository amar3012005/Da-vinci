import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CRMWorkspace } from '../CRMWorkspace';

const app = { id: 'demo-app', publishedVersion: 1, spec: {
  name: 'Enterprise sales', entities: [{ id: 'deal', name: 'Deals', fields: [
    { id: 'name', name: 'Name', type: 'text' }, { id: 'stage', name: 'Stage', type: 'enum', options: ['Review', 'Won'] },
  ] }], views: [
    { id: 'table', name: 'All deals', type: 'table', entityId: 'deal' },
    { id: 'pipeline', name: 'Pipeline', type: 'kanban', entityId: 'deal', groupByFieldId: 'stage' },
    { id: 'details', name: 'Records', type: 'record', entityId: 'deal' },
  ],
} };
const records = [{ id: 'd1', entityId: 'deal', data: { name: '<script>alert(1)</script>', stage: 'Review' } }];
function render(viewId, workflows = []) { return renderToStaticMarkup(<CRMWorkspace app={app} records={records} workflows={workflows} viewId={viewId} onViewChange={() => {}} />); }
test('renders published table values as escaped text', () => {
  const html = render('table'); expect(html).toContain('<table>'); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>'); expect(html).not.toContain('Published · version'); expect(html).toContain('List'); expect(html).toContain('Board'); expect(html).toContain('Cards');
});
test('renders pipeline and record views without generated code', () => {
  expect(render('pipeline')).toContain('crm-kanban'); expect(render('pipeline')).toContain('Won'); expect(render('details')).toContain('crm-record-grid');
});
test('projects existing workflow receipts and an honest empty state', () => {
  expect(render('workflows', [{ id: 'w1', name: 'Evidence review', status: 'completed' }])).toContain('Evidence review');
  expect(render('workflows')).toContain('No activity yet'); expect(render('workflows')).not.toContain('<table>');
});

test('activity uses everyday statuses without exposing workflow internals', () => {
  const html = render('workflows', [{ id: 'w1', title: 'Review Acme', status: 'completed' }]);
  expect(html).toContain('Activity'); expect(html).toContain('Done'); expect(html).not.toContain('completed');
});
