// HIVEMIND Connector Catalog (canonical, server-side)
//
// Single source of truth for "what connectors exist + what they do".
// Frontend mirror lives at:
//   frontend/Da-vinci/src/components/hivemind/app/shared/connectors-catalog.js
// Keep the two in sync when adding a connector.
//
// Two architectural modes:
//   ingestion — scheduled/batch sync via sync-engine → indexed into memories+Qdrant
//   live      — on-demand MCP tool calls (no batch sync, no indexing)
//
// Mode is an array; many providers support both (Notion: ingest its docs +
// expose live page/database tools).

export const CONNECTOR_CATALOG = [
  // ── INGESTION — Google Workspace ──────────────────────────────────────
  {
    id: 'gmail',
    provider: 'native',
    name: 'Gmail',
    category: 'email',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Sync emails into company brain. Threads, attachments, labels.',
    docsUrl: '/hivemind/app/connectors/gmail',
  },
  {
    id: 'google-drive',
    provider: 'native',
    name: 'Google Drive',
    category: 'files',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Index Drive docs, sheets, slides. Live search.',
  },
  {
    id: 'google-calendar',
    provider: 'native',
    name: 'Google Calendar',
    category: 'productivity',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Past events as memory, future events live on demand.',
  },
  {
    id: 'google-docs',
    provider: 'native',
    name: 'Google Docs',
    category: 'docs',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Doc bodies chunked + ingested like KB uploads.',
  },
  {
    id: 'google-sheets',
    provider: 'native',
    name: 'Google Sheets',
    category: 'data',
    mode: ['live'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Live cell + range read on demand.',
  },
  {
    id: 'google-slides',
    provider: 'native',
    name: 'Google Slides',
    category: 'docs',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Presentation text + structure indexed.',
  },
  {
    id: 'google-contacts',
    provider: 'native',
    name: 'Google Contacts',
    category: 'productivity',
    mode: ['live'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Structured contact directory — no memory pollution.',
  },
  {
    id: 'google-tasks',
    provider: 'native',
    name: 'Google Tasks',
    category: 'productivity',
    mode: ['live'],
    authType: 'oauth2',
    status: 'beta',
    description: 'Live task lookup — fetched when AI needs them.',
  },
  {
    id: 'google-chat',
    provider: 'native',
    name: 'Google Chat',
    category: 'comms',
    mode: ['live'],
    authType: 'oauth2',
    status: 'beta',
    description: 'Spaces, messages — live query.',
  },
  {
    id: 'google-search-console',
    provider: 'native',
    name: 'Google Search Console',
    category: 'data',
    mode: ['live'],
    authType: 'oauth2',
    status: 'stable',
    description: 'First-party queries, pages, clicks, impressions, CTR, and position for SEO Intelligence.',
  },

  // ── INGESTION / LIVE — Microsoft 365 ──────────────────────────────────
  {
    id: 'microsoft365',
    provider: 'nango',
    name: 'Microsoft 365',
    category: 'productivity',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'needs_oauth_setup',
    description: 'Outlook mail + Calendar + Teams chat + SharePoint via single Azure AD OAuth.',
    setupHint: 'Set MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET on the control plane',
  },

  // ── INGESTION / LIVE — Atlassian ──────────────────────────────────────
  {
    id: 'atlassian',
    provider: 'nango',
    name: 'Atlassian (Jira + Confluence)',
    category: 'project',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'needs_oauth_setup',
    description: 'Jira issues + Confluence pages via single Atlassian OAuth 2.0 (3LO).',
    setupHint: 'Set ATLASSIAN_CLIENT_ID + ATLASSIAN_CLIENT_SECRET on the control plane',
  },

  // ── INGESTION / LIVE — Salesforce ─────────────────────────────────────
  {
    id: 'salesforce',
    provider: 'nango',
    name: 'Salesforce',
    category: 'crm',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'needs_oauth_setup',
    description: 'Accounts, Opportunities, Cases, Contacts via Salesforce Connected App.',
    setupHint: 'Set SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET on the control plane',
  },

  // ── LIVE — Comms ──────────────────────────────────────────────────────
  {
    id: 'slack',
    provider: 'nango',
    name: 'Slack',
    category: 'comms',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'stable',
    description: 'Channel messages, threads, files. Both batch sync + live query.',
  },

  // ── INGESTION — Docs/Knowledge ───────────────────────────────────────
  {
    id: 'notion',
    provider: 'nango',
    name: 'Notion',
    category: 'docs',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'beta',
    description: 'Pages, databases, blocks. Ingest + live page query.',
  },

  // ── INGESTION / LIVE — Code ──────────────────────────────────────────
  {
    id: 'github',
    provider: 'nango',
    name: 'GitHub',
    category: 'code',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'beta',
    description: 'Issues, PRs, code search. Ingest + live tool calls.',
  },

  // ── LIVE — Project ───────────────────────────────────────────────────
  {
    id: 'linear',
    provider: 'native',
    name: 'Linear',
    category: 'project',
    mode: ['live'],
    authType: 'api_key',
    status: 'beta',
    description: 'Live issue queries via Linear GraphQL.',
  },

  // ── INGESTION / LIVE — CRM/Marketing ─────────────────────────────────
  {
    id: 'hubspot',
    provider: 'native',
    name: 'HubSpot',
    category: 'crm',
    mode: ['ingestion', 'live'],
    authType: 'oauth2',
    status: 'planned',
    description: 'Contacts, deals, companies, tickets.',
  },
  {
    id: 'x-account',
    provider: 'native',
    name: 'X',
    category: 'marketing',
    mode: ['live'],
    authType: 'oauth2',
    status: 'needs_oauth_setup',
    description: 'X identity, media upload and public Post creation.',
    setupHint: 'Uses the official X OAuth 2.0 PKCE flow.',
  },
  {
    id: 'x-ads',
    provider: 'native',
    name: 'X Ads',
    category: 'marketing',
    mode: ['live'],
    authType: 'oauth1',
    status: 'needs_oauth_setup',
    description: 'Advertiser accounts, paid campaigns, budgets and performance.',
    setupHint: 'Uses official X OAuth 1.0a and requires Ads API access.',
  },

  // ── LIVE — Composio ──────────────────────────────────────────────────
  {
    id: 'linkedin',
    provider: 'composio',
    composioToolkit: 'linkedin',
    name: 'LinkedIn',
    category: 'marketing',
    mode: ['live'],
    authType: 'oauth2',
    status: 'beta',
    description: 'Profile, company-page stats, posting and comments, via Composio. No feed/employee scraping — LinkedIn exposes no such API.',
  },

  // ── INGESTION — Database ─────────────────────────────────────────────
  {
    id: 'postgres',
    provider: 'native',
    name: 'PostgreSQL',
    category: 'database',
    mode: ['ingestion'],
    authType: 'connection_string',
    status: 'planned',
    description: 'Read-only table sync with column-level allowlist.',
  },

  // ── INGESTION — Manual ───────────────────────────────────────────────
  {
    id: 'file-upload',
    provider: 'native',
    name: 'File Upload',
    category: 'files',
    mode: ['ingestion'],
    authType: 'none',
    status: 'stable',
    description: 'Drop files into Knowledge Base. PDF, DOCX, TXT, MD, code.',
    docsUrl: '/hivemind/app/knowledge',
  },

  // ── INGESTION — Web ──────────────────────────────────────────────────
  {
    id: 'web-crawl',
    provider: 'native',
    name: 'Web Crawl',
    category: 'web',
    mode: ['ingestion'],
    authType: 'none',
    status: 'stable',
    description: 'Crawl URL into chunks. Tavily-backed.',
  },

  // ── INGESTION — HR ───────────────────────────────────────────────────
  {
    id: 'personio-v2',
    provider: 'nango',
    name: 'Personio',
    description: 'HR management — employees, departments, positions, org chart',
    category: 'hr',
    nangoProvider: 'personio-v2',
    icon: '👥',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'beta',
  },

  // ── INGESTION — Accounting ────────────────────────────────────────────
  {
    id: 'datev',
    provider: 'nango',
    name: 'DATEV',
    description: 'German accounting and payroll — invoices, bookkeeping, payroll data',
    category: 'accounting',
    nangoProvider: 'datev',
    icon: '📊',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'planned',
  },

  // ── INGESTION — ERP ───────────────────────────────────────────────────
  {
    id: 'sap-business-one',
    provider: 'nango',
    name: 'SAP Business One',
    description: 'ERP — business processes, inventory, financials, sales orders',
    category: 'erp',
    nangoProvider: 'sap-business-one',
    icon: '🏭',
    mode: ['ingestion'],
    authType: 'oauth2',
    status: 'planned',
  },
];

export const CONNECTOR_BY_ID = Object.fromEntries(CONNECTOR_CATALOG.map(c => [c.id, c]));

// Original brand marks (simple-icons CDN / iconify, official brand colors).
// Single source for both the Connectors page and the HyperAgents room
// "view in new tab" connector_logo buttons. CSP img-src allows https:.
export const BRAND_LOGOS = {
  'claude-web':    'https://cdn.simpleicons.org/claude',
  claude:          'https://cdn.simpleicons.org/claude',
  chatgpt:         'https://api.iconify.design/logos/openai-icon.svg',
  'gemini-paste':  'https://cdn.simpleicons.org/googlegemini',
  'google-gemini': 'https://cdn.simpleicons.org/googlegemini',
  gmail:           'https://cdn.simpleicons.org/gmail',
  'google-docs':   'https://cdn.simpleicons.org/googledocs',
  'google-sheets': 'https://cdn.simpleicons.org/googlesheets',
  slack:           'https://api.iconify.design/logos/slack-icon.svg',
  whatsapp:        'https://cdn.simpleicons.org/whatsapp',
  notion:          'https://cdn.simpleicons.org/notion/000000',
  confluence:      'https://cdn.simpleicons.org/confluence',
  atlassian:       'https://cdn.simpleicons.org/jira',
  github:          'https://cdn.simpleicons.org/github/181717',
  linear:          'https://cdn.simpleicons.org/linear',
  salesforce:      'https://api.iconify.design/logos/salesforce.svg',
};

export const CONNECTOR_CATEGORIES = [
  { id: 'email', name: 'Email' },
  { id: 'files', name: 'Files' },
  { id: 'docs', name: 'Documents & Knowledge' },
  { id: 'data', name: 'Data & Spreadsheets' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'comms', name: 'Communication' },
  { id: 'crm', name: 'CRM & Sales' },
  { id: 'marketing', name: 'Marketing & Ads' },
  { id: 'project', name: 'Project Management' },
  { id: 'code', name: 'Code & DevOps' },
  { id: 'database', name: 'Databases' },
  { id: 'web', name: 'Web' },
  { id: 'hr', name: 'HR & People' },
  { id: 'accounting', name: 'Accounting & Finance' },
  { id: 'erp', name: 'ERP' },
];

export const CONNECTOR_MODES = {
  ingestion: {
    label: 'Ingestion',
    description: 'Scheduled batch sync → indexed into memory + Qdrant. Best for "search company knowledge".',
  },
  live: {
    label: 'Live (MCP)',
    description: 'On-demand tool calls. Best for "let the AI act on/query live data without storing it".',
  },
};
