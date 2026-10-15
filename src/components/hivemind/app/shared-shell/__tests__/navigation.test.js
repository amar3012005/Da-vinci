import { dotAppsUrl, runtimeNavigation, matchingShellIdentity } from '../navigation';
test('preserves callback query bytes and duplicate keys without iframe flags', () => {
 const search='?app=googledrive&status=success&connected_account_id=ca_dhOsdPGa-X7a&return_to=%2Fa+b&x=1&x=2';
 expect(dotAppsUrl(search)).toBe(`https://dots.singulancelabs.com/apps${search}`);
 expect(dotAppsUrl(search)).not.toContain('embed=');
});
test('keeps Apps on Dot, other workspace links on Runtime, rejects external navigation', () => {
 expect(runtimeNavigation('/hivemind/app/employee/apps?app=gmail')).toBe('https://dots.singulancelabs.com/apps?app=gmail');
 expect(runtimeNavigation('/hivemind/app/employee/dots/employee/abc')).toBe('https://runtime-runner.singulancelabs.com/hivemind/app/employee/dots/employee/abc');
 expect(()=>runtimeNavigation('https://evil.test/hivemind/app')).toThrow();
});
test('requires both actual identities; missing/query-like authority cannot grant access', () => {
 expect(matchingShellIdentity({user:{id:'u'},org:{id:'o'}},{userId:'u',organizationId:'o'})).toBe(true);
 for(const expected of [{userId:'x',organizationId:'o'},{userId:'u',organizationId:'x'},{}]) expect(matchingShellIdentity({user:{id:'u'},org:{id:'o'}},expected)).toBe(false);
});
