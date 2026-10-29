import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
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
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ org: { id: 'org-a', runtime_enabled: false } }) }));

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

test('HQ without Runtime drops the Runtime card and its reads, and keeps the rest of the company page', async () => {
  const team = [{ id: 'mia', name: 'Mia', role: 'researcher' }];
  render(<CompanyDashboard showTasks={false} showRuntimeInvite={true} allowOnboarding={false} team={team} rooms={[]} />);
  expect(await screen.findByRole('heading', { name: 'Solvis GmbH' })).toBeTruthy();
  expect(await screen.findByText('Launch plan')).toBeTruthy();
  const headings = screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent);
  expect(headings).toEqual(['Company overview', 'Team & assignments', 'Calendar & next wakes', 'Recent deliverables', 'Company knowledge']);
  expect(screen.queryByRole('region', { name: 'Runtime' })).toBeNull();
  expect(apiClient.getHqRuntime).not.toHaveBeenCalled();
  expect(apiClient.getHqWork).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.hm-hq-grid')).toHaveAttribute('data-runtime-off');
  // The Runtime invitation never opens, even after its delay.
  await new Promise(resolve => setTimeout(resolve, 5200));
  expect(screen.queryByRole('dialog', { name: 'Activate Runtime' })).toBeNull();
}, 15000);
