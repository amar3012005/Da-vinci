// Page welcome cards and the Brain sidebar share the same owned artwork.
export const brainFeatureArtwork = [
  {
    "id": "connectors",
    "title": "Connectors",
    "image": "/images/feature-banners/connectors.webp",
    "alt": "Connect your apps. Bring your tools into your company’s memory.",
    "href": "/hivemind/app/connectors",
    "label": "Connect your apps to HIVEMIND",
    "zoom": 1
  },
  {
    "id": "memory-graph",
    "title": "Memory Graph",
    "image": "/images/feature-banners/memory-graph.webp",
    "alt": "See how it all connects. Explore relationships between people, ideas and memories.",
    "href": "/hivemind/app/graph",
    "label": "MEMORY GRAPH",
    "zoom": 1
  },
  {
    "id": "meeting-notes",
    "title": "Meeting Intelligence",
    "image": "/images/feature-banners/meeting-intelligence-v2.webp",
    "alt": "Connect your team’s thinking to the company Brain. Turn conversations into decisions, commitments and shared understanding.",
    "href": "/hivemind/app/meeting-notes",
    "label": "Meeting Intelligence",
    "zoom": 1
  },
  {
    "id": "uploads",
    "title": "Upload Everything",
    "image": "/images/feature-banners/uploads.webp",
    "alt": "Upload everything. Keep what matters. Turn your files into searchable company knowledge.",
    "href": "/hivemind/app/knowledge",
    "label": "Upload everything to HIVEMIND",
    "zoom": 1
  },
  {
    "id": "memories",
    "title": "Memories",
    "image": "/images/feature-banners/memories.webp",
    "alt": "Find what your company knows. Search and revisit saved knowledge in one place.",
    "href": "/hivemind/app/memories",
    "label": "MEMORIES",
    "zoom": 1
  },
  {
    "id": "company-brain",
    "title": "Company Brain",
    "image": "/images/feature-banners/company-brain.webp",
    "alt": "Ask your company’s Brain. Get answers grounded in your company’s knowledge.",
    "href": "/hivemind/app/overview/new",
    "label": "COMPANY BRAIN",
    "zoom": 1
  },
  {
    "id": "dreaming",
    "title": "Dreaming",
    "image": "/images/feature-banners/dreaming-v2.webp",
    "alt": "Wake up to connections you hadn’t seen. Your agents explore company knowledge overnight. Discover sourced insights in Flashbacks.",
    "href": "/hivemind/app/overview/dreaming",
    "label": "DREAMING",
    "zoom": 1
  },
  {
    "id": "chatgpt-connection",
    "title": "Connect ChatGPT",
    "image": "/images/feature-banners/chatgpt-connection-v1.webp",
    "alt": "Bring your ChatGPT plan to HIVEMIND. Frontier models, real conversations and image creation.",
    "href": "/hivemind/app/ai-models",
    "label": "Connect your ChatGPT plan to HIVEMIND",
    "zoom": 1
  },
  {
    "id": "workspace-admin",
    "title": "Workspace Admin",
    "image": "/images/feature-banners/workspace-admin.webp",
    "alt": "A place for your whole team. Manage members, teams, projects and invitations.",
    "href": "/hivemind/app/workspace",
    "label": "WORKSPACE ADMIN",
    "zoom": 1
  },
  {
    "id": "mcp-server",
    "title": "MCP Server",
    "image": "/images/feature-banners/mcp-server.webp",
    "alt": "Bring your Brain to your tools. Let compatible AI tools access your company knowledge.",
    "href": "/hivemind/app/mcp",
    "label": "MCP SERVER",
    "zoom": 1
  },
  {
    "id": "api-keys",
    "title": "API Keys",
    "image": "/images/feature-banners/api-keys.webp",
    "alt": "Connect with controlled access. Create and manage keys for your integrations.",
    "href": "/hivemind/app/keys",
    "label": "API KEYS",
    "zoom": 1
  },
  {
    "id": "evaluation",
    "title": "Evaluation",
    "image": "/images/feature-banners/evaluation.webp",
    "alt": "Check the quality of your answers. Run evaluations and review the results.",
    "href": "/hivemind/app/evaluation",
    "label": "EVALUATION",
    "zoom": 1
  }
];

export function featureForBrainPath(pathname) {
  const page = pathname.replace(/\/$/, '');
  if (page === '/hivemind/app/graph-2d') return brainFeatureArtwork.find(item => item.id === 'memory-graph');
  if (page === '/hivemind/app/brain') return brainFeatureArtwork.find(item => item.id === 'company-brain');
  if (page === '/hivemind/app/team/members' || page === '/hivemind/app/team/projects') return brainFeatureArtwork.find(item => item.id === 'workspace-admin');
  if (page === '/hivemind/app/overview/dreaming') return brainFeatureArtwork.find(item => item.id === 'dreaming');
  if (/^\/hivemind\/app\/overview(?:\/|$)/.test(page)) return brainFeatureArtwork.find(item => item.id === 'company-brain');
  return brainFeatureArtwork.find(item => item.href === page) || null;
}
