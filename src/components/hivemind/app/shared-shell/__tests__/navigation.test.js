import { dotAppsUrl, runtimeNavigation, matchingShellIdentity, brainNavigation } from '../navigation';
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
test('Brain navigation: Chat is the Company Brain room with the cached conversation, other Brain pages stay on the Brain host', () => {
 const room='https://brain-runner.singulancelabs.com/dots/dot_company_brain';
 for(const chat of ['/hivemind/app/overview','/hivemind/app/overview/new','/hivemind/app/overview/new/']) expect(brainNavigation(chat)).toBe(room);
 expect(brainNavigation('/hivemind/app/overview/new','conv_a1')).toBe(`${room}?c=conv_a1`);
 expect(brainNavigation('/hivemind/app/overview/new?hm_locale=de&c=old','conv_a1')).toBe(`${room}?hm_locale=de&c=conv_a1`);
 expect(brainNavigation('/hivemind/app/overview/new','not a conversation')).toBe(room);
 expect(brainNavigation('/hivemind/app/memories')).toBe('https://next.singulancelabs.com/hivemind/app/memories');
 expect(brainNavigation('/hivemind/app/overview/dreaming')).toBe('https://next.singulancelabs.com/hivemind/app/overview/dreaming');
 expect(brainNavigation('/hivemind/app/employee/harness')).toBe('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
 expect(()=>brainNavigation('https://evil.test/hivemind/app')).toThrow();
 expect(()=>brainNavigation('/api/secrets')).toThrow();
});
