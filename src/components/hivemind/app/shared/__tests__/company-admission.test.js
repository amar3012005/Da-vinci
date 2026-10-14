import { companyAdmissionStatus } from '../company-admission';
test('company build and website-derived HQ never bypass preview, awakening and confirmation', () => {
  expect(companyAdmissionStatus({ onboarded: false })).toBe('required');
  expect(companyAdmissionStatus({ onboarded: true, company: { company_location: 'Hannover', profile: { location_source: 'website' } } })).toBe('required');
});
test('persisted human HQ confirmation admits the workspace', () => {
  expect(companyAdmissionStatus({ onboarded: true, company: { company_location: 'Hannover', profile: { location_source: 'user_claim' } } })).toBe('ready');
});
test('incomplete or failed responses cannot admit chat', () => {
  expect(companyAdmissionStatus(undefined)).toBe('error');
  expect(companyAdmissionStatus({ onboarded: true })).toBe('error');
  expect(companyAdmissionStatus({ onboarded: true, company: { profile: { location_source: 'user_claim' } } })).toBe('required');
});
