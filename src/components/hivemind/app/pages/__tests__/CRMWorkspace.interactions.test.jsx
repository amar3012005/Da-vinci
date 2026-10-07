import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CRMWorkspace } from '../CRMWorkspace';

const app = { id: 'app', spec: { name: 'Our relationships', entities: [
  { id: 'company', name: 'Companies', fields: [{ id: 'name', name: 'Name', type: 'text' }, { id: 'stage', name: 'Stage', type: 'enum', options: ['New', 'Qualified'] }] },
  { id: 'contact', name: 'Contacts', fields: [{ id: 'name', name: 'Name', type: 'text' }] },
], views: [
  { id: 'companies', name: 'Companies', type: 'table', entityId: 'company' },
  { id: 'board', name: 'Pipeline', type: 'kanban', entityId: 'company', groupByFieldId: 'stage' },
  { id: 'contacts', name: 'Contacts', type: 'table', entityId: 'contact' },
] } };
const records = [
  { id: 'company-uuid', entityId: 'company', data: { name: 'Acme', stage: 'Qualified' } },
  { id: 'contact-uuid', entityId: 'contact', data: { name: 'Ada' } },
];
function Workspace() {
  const [viewId, onViewChange] = useState('companies');
  return <CRMWorkspace app={app} records={records} viewId={viewId} onViewChange={onViewChange} />;
}

test('search, clear filters, switch sections and open details using familiar controls', () => {
  render(<Workspace />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } });
  expect(screen.getByText('No matches')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Acme' }));
  expect(screen.getByRole('dialog', { name: 'Item details' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close record' }));
  fireEvent.click(screen.getByRole('button', { name: 'Board' }));
  expect(document.querySelector('.crm-kanban')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Contacts' }));
  expect(screen.getByRole('button', { name: 'Ada' })).toBeTruthy();
  expect(screen.getByRole('textbox').value).toBe('');
  expect(screen.queryByText('company-uuid')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
  expect(screen.getByText('No activity yet')).toBeTruthy();
});

test('loading does not claim the workspace is empty', () => {
  render(<CRMWorkspace app={app} records={[]} viewId="companies" onViewChange={() => {}} loadingMore />);
  expect(screen.getByRole('status').textContent).toBe('Getting your companies…');
  expect(screen.queryByText('No companies yet')).toBeNull();
});
