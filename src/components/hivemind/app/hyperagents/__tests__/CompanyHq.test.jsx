import React from 'react';
import { render, screen, within } from '@testing-library/react';
import CompanyDashboard from '../CompanyDashboard';
import apiClient from '../../shared/api-client';
import { pageCache } from '../../shared/resource-cache';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_, fallback) => fallback }) }));
jest.mock('../../shared/api-client', () => ({ hyperCompany: jest.fn(), getHqRuntime: jest.fn(), getHqWork: jest.fn(), hyperCompanyWebArtifactPreviewUrl: id => `/preview/${id}` }));
jest.mock('../HyperOnboarding', () => () => <div>NEW COMPANY SETUP</div>);
jest.mock('../WebsitePreview', () => () => <div>Website preview</div>);
jest.mock('../AgentAvatar', () => () => null);
jest.mock('../../shared/RuntimeAvatar', () => () => null);
jest.mock('../rooms/shared', () => ({ LANE_META: {} }));

const company = {
  onboarded: true, hq_room_id: 'room-hq',
  employees: [],
  company: {
    company: 'Solvis GmbH', mission: 'Make solar maintenance effortless.', website: 'https://solvis.example',
    profile: { tagline: 'Solar upkeep on autopilot', icp: 'Facility managers' },
    tasks: [{ id: 'task-1', title: 'Map competitors', tag: 'RESEARCH' }],
    deliverables: [{ room_id: 'room-9', title: 'Pricing teardown', sealed_at: '2026-10-20T10:00:00Z' }],
    documents: ['Brand voice'], web_artifacts: [{ id: 'w1', title: 'Homepage', url: 'https://solvis.example', content_chars: 1200 }],
  },
};
const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(9, 30, 0, 0);

beforeEach(() => {
  pageCache.clear();
  apiClient.hyperCompany.mockReset().mockResolvedValue(company);
  apiClient.getHqRuntime.mockReset().mockResolvedValue({ runtime: { state: 'WAITING' } });
  apiClient.getHqWork.mockReset().mockResolvedValue({
    agent_runtime_tasks: [{ id: 'q1', title: 'Send partner shortlist', status: 'WAITING_FOR_AUTHORITY', owner: 'Mia' }],
    schedules: [{ id: 's1', dueAt: tomorrow.toISOString(), triggerType: 'weekly_review' }],
  });
  global.fetch = jest.fn(async () => ({ status: 200, ok: true, json: async () => ({ items: [{ artifactId: 'a1', title: 'Launch plan', mediaType: 'text/markdown', latestVersion: 1, producerName: 'Runtime', updatedAt: Date.now() }] }) }));
});

test('HQ orders overview, Runtime, team, wakes and deliverables from one read of each source', async () => {
  const team = [{ id: 'mia', name: 'Mia', role: 'researcher' }, { id: 'leo', name: 'Leo', role: 'writer' }];
  const rooms = [{ id: 'mia', running: true, activity: 'Researching partners', updatedAt: 2 }, { id: 'runtime', status: 'waiting', updatedAt: 1 }];
  const { rerender } = render(<CompanyDashboard showTasks={false} showRuntimeInvite={false} allowOnboarding={false} team={team} rooms={rooms} />);
  expect(await screen.findByRole('heading', { name: 'Solvis GmbH' })).toBeTruthy();
  for (let index = 0; index < 4; index += 1) rerender(<CompanyDashboard showTasks={false} showRuntimeInvite={false} allowOnboarding={false} team={team} rooms={[...rooms]} />);
  expect(await screen.findByText('Launch plan')).toBeTruthy();
  expect((await screen.findAllByText('Send partner shortlist')).length).toBe(2);

  const headings = screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent);
  expect(headings).toEqual(['Company overview', 'Runtime', 'Team & assignments', 'Calendar & next wakes', 'Recent deliverables', 'Company knowledge']);
  const runtime = screen.getByRole('region', { name: 'Runtime' });
  expect(within(runtime).getByRole('status').textContent).toBe('Waiting for you');
  expect(within(runtime).getByText('Needs your approval')).toBeTruthy();
  const teamCard = screen.getByRole('region', { name: 'Team & assignments' });
  expect(teamCard.textContent).toContain('Researching partners');
  expect(teamCard.textContent).toContain('Send partner shortlist');
  expect(within(teamCard).getByText('Map competitors').closest('[data-company-task]').tagName).toBe('DIV');
  const wakes = screen.getByRole('region', { name: 'Calendar & next wakes' });
  expect(within(wakes).getByText('Tomorrow')).toBeTruthy();
  expect(within(wakes).getByText('Weekly review')).toBeTruthy();
  const deliverables = screen.getByRole('region', { name: 'Recent deliverables' });
  expect(deliverables.textContent).toContain('Pricing teardown');
  expect(document.body.textContent).not.toMatch(/\bDot\b/);

  expect(apiClient.hyperCompany).toHaveBeenCalledTimes(1);
  expect(apiClient.getHqRuntime).toHaveBeenCalledTimes(1);
  expect(apiClient.getHqWork).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('reopening HQ paints the cached company at once and skips fresh reads', async () => {
  const first = render(<CompanyDashboard showRuntimeInvite={false} allowOnboarding={false} />);
  await screen.findByText('Launch plan');
  first.unmount();
  render(<CompanyDashboard showRuntimeInvite={false} allowOnboarding={false} />);
  expect(screen.getByRole('heading', { name: 'Solvis GmbH' })).toBeTruthy();
  expect(apiClient.hyperCompany).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('loading shows a skeleton, and unavailable Runtime reads leave calm empty states', async () => {
  apiClient.getHqRuntime.mockRejectedValue(new Error('not found'));
  apiClient.getHqWork.mockRejectedValue(new Error('not found'));
  global.fetch = jest.fn(async () => ({ status: 404, ok: false }));
  render(<CompanyDashboard showRuntimeInvite={false} allowOnboarding={false} />);
  expect(screen.getByRole('status', { name: 'Loading company' })).toBeTruthy();
  expect(await screen.findByText(/No open agendas right now/)).toBeTruthy();
  expect(await screen.findByText(/Nothing scheduled/)).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Runtime' }).textContent).toContain('Not reporting yet');
  expect(screen.queryByRole('button', { name: /Open Library/ })).toBeNull();
});
