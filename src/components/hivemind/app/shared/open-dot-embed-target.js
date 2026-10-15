const DOT_ORIGIN = 'https://dots.singulancelabs.com';
const EMPLOYEE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOT_ID = /^dot_[a-zA-Z0-9_-]+$/;
const CONVERSATION_ID = /^conv_[a-zA-Z0-9_-]+$/;

export function buildOpenDotEmbedTarget(suffix, search = '') {
  const route = suffix.replace(/\/+$/, '');
  const query = new URLSearchParams(search);
  const conversation = query.get('c');
  if (conversation && !CONVERSATION_ID.test(conversation)) return null;

  let path;
  if (!route) path = '/';
  else if (route === '/apps') path = '/apps';
  else if (route.startsWith('/employee/')) {
    const employeeId = route.slice('/employee/'.length);
    if (!EMPLOYEE_ID.test(employeeId)) return null;
    path = `/employees/${employeeId}`;
  } else if (route.startsWith('/dot_') && DOT_ID.test(route.slice(1))) {
    path = `/dots/${route.slice(1)}`;
  } else return null;

  const target = new URL(path, DOT_ORIGIN);
  target.searchParams.set('embed', 'hivemind');
  if (conversation && route !== '/apps') target.searchParams.set('c', conversation);
  const provider = query.get('connect');
  if (route === '/apps' && provider && /^[a-z0-9_-]{1,80}$/i.test(provider)) target.searchParams.set('app', provider);
  return target.href;
}
