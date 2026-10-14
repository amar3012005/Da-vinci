// Building the company record is not the final user-confirmed entry step.
// The existing HQ confirmation write persists this provenance marker.
export function companyAdmissionStatus(data) {
  if (data?.onboarded === false) return 'required';
  if (data?.onboarded !== true || !data?.company) return 'error';
  const profile = data.company.profile;
  return profile?.location_source === 'user_claim' && String(data.company.company_location || profile.location || '').trim()
    ? 'ready' : 'required';
}
