// Same-origin client for the community API served by the hivemind-web Worker on dev.singulancelabs.com.
// Identity calls (email code, Google) go through the shared HIVEMIND api client instead.
export class DevApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/dev${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new DevApiError(data.error || 'request_failed', response.status);
  return data;
}

export const devApi = {
  me: () => request('/me'),
  saveProfile: (profile) => request('/me', { method: 'PUT', body: profile }),
  stats: () => request('/stats'),
  members: (limit = 24) => request(`/members?limit=${limit}`),
  member: (handle) => request(`/members/${encodeURIComponent(handle)}`),
  posts: ({ channel = '', before = '' } = {}) => request(`/posts?${new URLSearchParams({ channel, before })}`),
  post: (id) => request(`/posts/${id}`),
  createPost: (post) => request('/posts', { method: 'POST', body: post }),
  reply: (id, body) => request(`/posts/${id}/replies`, { method: 'POST', body: { body } }),
  removePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  removeReply: (id) => request(`/replies/${id}`, { method: 'DELETE' }),
};

const MESSAGES = {
  handle_taken: 'That handle is taken. Try another.',
  invalid_handle: 'Handles are 3 to 24 lowercase letters, numbers or dashes.',
  invalid_name: 'Add your name (up to 60 characters).',
  invalid_link: 'Links must be full https:// addresses.',
  invalid_title: 'Titles are 4 to 140 characters.',
  invalid_body: 'Write something first (up to 8,000 characters).',
  slow_down: 'You are posting quickly. Take a breath and try again in a few minutes.',
  profile_required: 'Create your member profile first.',
  authentication_required: 'Sign in to continue.',
  identity_unavailable: 'Sign-in is briefly unavailable. Try again shortly.',
};
export const errorMessage = (error) => MESSAGES[error?.code] || 'Something went wrong. Please try again.';

export const CHANNELS = [
  { id: 'research', label: 'Research', blurb: 'Papers, ideas and reading groups' },
  { id: 'open-source', label: 'Open source', blurb: 'Build on ICARUS and friends' },
  { id: 'startups', label: 'Startups', blurb: 'Find co-founders and ship' },
  { id: 'show-and-tell', label: 'Show & tell', blurb: 'Share what you built' },
  { id: 'help', label: 'Help', blurb: 'Stuck? Ask the community' },
];
export const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'researcher', label: 'Researcher' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'founder', label: 'Founder' },
  { id: 'other', label: 'Other' },
];

export function timeAgo(ms) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
