/** Company HQ offers an Overview / Team switch; the Team view shows the live team board in place of the card grid. */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import CompanyDashboard from '../CompanyDashboard';
import apiClient from '../../shared/api-client';
import { pageCache } from '../../shared/resource-cache';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../shared/api-client', () => ({ hyperCompany: jest.fn(), getHqRuntime: jest.fn(), getHqWork: jest.fn(), hyperCompanyWebArtifactPreviewUrl: id => `/preview/${id}` }));
jest.mock('../HyperOnboarding', () => () => <div>NEW COMPANY SETUP</div>);
jest.mock('../WebsitePreview', () => () => <div>Website preview</div>);
jest.mock('../AgentAvatar', () => () => null);
jest.mock('../../shared/RuntimeAvatar', () => () => null);
jest.mock('../rooms/shared', () => ({ LANE_META: {} }));

const fs = require('fs');
const path = require('path');
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', 'en', 'dashboard.json'), 'utf8'));
i18n.use(initReactI18next).init({ lng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', resources: { en: { dashboard: en } }, interpolation: { escapeValue: false } });

beforeEach(() => {
  pageCache.clear();
  apiClient.hyperCompany.mockReset().mockResolvedValue({ onboarded: true, hq_room_id: 'room-hq', employees: [], company: { company: 'Solvis GmbH', profile: {}, tasks: [], deliverables: [], documents: [] } });
  apiClient.getHqRuntime.mockReset().mockResolvedValue({ runtime: { state: 'WAITING' } });
  apiClient.getHqWork.mockReset().mockResolvedValue({ schedules: [] });
  global.fetch = jest.fn(async url => ({ status: 200, ok: true, json: async () => (String(url).includes('team-board') ? { version: 1, employees: [], handoffs: [], digests: [] } : { items: [] }) }));
});

test('the Team view replaces the card grid with the live team board and Overview brings it back', async () => {
  const team = [{ id: 'mia', name: 'Mia', role: 'researcher' }];
  render(<CompanyDashboard showTasks={false} showRuntimeInvite={false} allowOnboarding={false} team={team} rooms={[{ id: 'mia', running: true, activity: 'Researching partners', updatedAt: 2 }]} />);
  expect(await screen.findByRole('heading', { name: 'Solvis GmbH' })).toBeTruthy();
  const teamButton = screen.getByRole('button', { name: 'Team' });
  expect(teamButton).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(teamButton);
  await waitFor(() => expect(document.querySelector('[data-team-board]')).toBeTruthy());
  expect(screen.getAllByText('Researching partners').length).toBeGreaterThan(0);
  expect(document.querySelector('.hm-hq-grid')).toBeNull();
  await waitFor(() => expect(global.fetch.mock.calls.some(([url]) => url === '/api/dots/team-board')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  expect(await screen.findByRole('region', { name: 'Team & assignments' })).toBeTruthy();
});
