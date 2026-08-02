/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE GROUND TRUTH FOR THE FIRST-RUN TOUR.
 *
 * Edit the copy and the order HERE and nowhere else. OverviewTour.jsx is only a
 * renderer — it holds no content. Adding a stop is a data edit.
 *
 * Voice matches the login onboarding (WelcomeFlow.jsx): a mono eyebrow, a
 * headline of two clipped sentences, one line of body, two or three checks.
 *
 * `targets` are `data-tour-id` values, which Sidebar.jsx sets to each nav item's
 * route (`item.to`) — so a target string must match the route EXACTLY, query
 * string included. One target draws a single arrow; several draw a bracket that
 * spans the whole section with a stub into each child.
 *
 * Bump TOUR_VERSION to re-show the tour to everyone after a content change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TOUR_VERSION = 2;

export const TOUR_STEPS = [
  {
    eyebrow: 'WELCOME',
    title: 'One brain. Every answer.',
    body: 'A quick pass over where everything lives. Ten stops, and you can leave whenever you like.',
    checks: ['Nothing is set up yet — that is normal', 'Reopen any time from the Guide button'],
    targets: [],
  },
  {
    eyebrow: 'CONNECTORS',
    title: 'Connect once. Remember forever.',
    body: 'Gmail, Slack, Notion, Drive and Calendar stream into one shared cortex.',
    checks: ['One-click OAuth, encrypted at rest', 'Background sync — no imports to babysit'],
    targets: ['/hivemind/app/connectors'],
  },
  {
    eyebrow: 'MEMORIES',
    title: 'Ask by meaning. Not keywords.',
    body: 'Every fact, decision and document becomes durable memory you can interrogate.',
    checks: ['Updates and merges itself as things change', 'Contradictions resolve into one truth'],
    targets: ['/hivemind/app/memories'],
  },
  {
    eyebrow: 'AI MEETING NOTES',
    title: 'It listens. You stop typing.',
    body: 'Record a meeting and walk away with the parts that matter.',
    checks: ['Transcript, insights and hard facts', 'Saved straight to memory, not a folder'],
    targets: ['/hivemind/app/meeting-notes'],
  },
  {
    eyebrow: 'MEMORY GRAPH',
    title: 'See your mind. Rewind it.',
    body: 'Entities and relationships link themselves into a living atlas.',
    checks: ['3D force-graph and 2D canvas', 'Temporal slider — replay how a decision formed'],
    targets: ['/hivemind/app/graph'],
  },
  {
    eyebrow: 'KNOWLEDGE BASE',
    title: 'Drop a file. Ask it anything.',
    body: 'Documents are parsed page by page and promoted into recallable memory.',
    checks: ['PDF, DOCX, slides, spreadsheets', 'Every page counts as one document'],
    targets: ['/hivemind/app/knowledge'],
  },
  {
    eyebrow: 'WORKSPACE ADMIN',
    title: 'Your rules. Your scope.',
    body: 'Everything about who belongs here and what they are allowed to recall.',
    checks: ['Members, teams, projects, invites', 'Cognitive layer — background synthesis', 'Scoped recall with an audit trail'],
    targets: [
      '/hivemind/app/workspace',
      '/hivemind/app/workspace?tab=members',
      '/hivemind/app/workspace?tab=teams',
      '/hivemind/app/workspace?tab=projects',
      '/hivemind/app/workspace?tab=invites',
      '/hivemind/app/workspace?tab=cognition',
    ],
    brace: true,
  },
  {
    eyebrow: 'WEB INTEL',
    title: 'Read the web. Keep what matters.',
    body: 'Pull the live outside world in and file it beside what you already know.',
    checks: ['Deep research, search and crawl', 'Findings land in memory, not a tab'],
    targets: [
      '/hivemind/app/web',
      '/hivemind/app/web?mode=research',
      '/hivemind/app/web?mode=search',
      '/hivemind/app/web?mode=crawl',
    ],
    brace: true,
  },
  {
    eyebrow: 'PROFILE',
    title: 'Tuned to you.',
    body: 'Your identity, language and preferences — what every answer is shaped against.',
    checks: ['Set your name, role and language', 'Correct it any time by just saying so'],
    targets: ['/hivemind/app/profile'],
  },
  {
    eyebrow: 'USAGE',
    title: 'Know your headroom.',
    body: 'Live counts for everything your plan meters, before you hit a wall.',
    checks: ['Memories, meeting minutes, documents', 'Web intel and members'],
    targets: ['/hivemind/app/usage'],
  },
  {
    eyebrow: 'BILLING',
    title: 'Scale when you are ready.',
    body: 'What your plan includes, and exactly what changes if you move up.',
    checks: ['Compare limits side by side', 'Upgrade without leaving the page'],
    targets: ['/hivemind/app/billing'],
  },
];
