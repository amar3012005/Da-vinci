/**
 * hyperagents/elements — element-level UI for HyperAgents surfaces.
 *
 * Each element defines ONE artifact's UX (an email, a call, a connect nudge)
 * so report pages and the room thread compose them instead of inlining raw
 * markdown. Add new report artifacts here, not in HyperAgents.jsx.
 */
export { EmailComposeCard, CallRingingCard } from './LiveActionCards';
export { EmailBlock, parseEmailMarkdown } from './EmailBlock';
export { default as GmailConnectGate } from './GmailConnectGate';
