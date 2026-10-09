const MOBILE_PAGES = { profile:'profile', usage:'usage', billing:'billing', settings:'settings', connectors:'connectors', knowledge:'uploads', memories:'memories', 'meeting-notes':'meeting-notes', projects:'projects' };
export function mobilePageDestination(location, compact) {
 if (!compact || new URLSearchParams(location.search || '').get('desktop') === '1') return null;
 const match = location.pathname.match(/^\/hivemind\/app\/([^/]+)\/?$/);
 const page = match && MOBILE_PAGES[match[1]];
 return page ? `/hivemind/m/${page}${location.search || ''}${location.hash || ''}` : null;
}
