import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import CliVerified from './auth/CliVerified';
import AppShell from './layout/AppShell';

// Pages (lazy loaded for code splitting)
const Overview = React.lazy(() => import('./pages/Overview'));
const TalkToHiveMobile = React.lazy(() => import('./pages/TalkToHiveMobile'));
const Memories = React.lazy(() => import('./pages/Memories'));
const MeetingNotes = React.lazy(() => import('./pages/MeetingNotes'));
const ApiKeys = React.lazy(() => import('./pages/ApiKeys'));
const Connectors = React.lazy(() => import('./pages/Connectors'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Evaluation = React.lazy(() => import('./pages/Evaluation'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Billing = React.lazy(() => import('./pages/Billing'));
const Usage = React.lazy(() => import('./pages/Usage'));
const WebStudio = React.lazy(() => import('./pages/WebStudio'));
const McpServer = React.lazy(() => import('./pages/McpServer'));
const MemoryGraph = React.lazy(() => import('./pages/MemoryGraph'));
const MemoryGraph2D = React.lazy(() => import('./pages/MemoryGraph2D'));
const Brain = React.lazy(() => import('./pages/Brain'));
const DeepResearch = React.lazy(() => import('./pages/DeepResearch'));
const Engine = React.lazy(() => import('./pages/Engine'));
const KnowledgeBase = React.lazy(() => import('./pages/KnowledgeBase'));
const AgentSwarm = React.lazy(() => import('./pages/AgentSwarm'));
const SwarmGovernance = React.lazy(() => import('./pages/SwarmGovernance'));
const TaraConfig = React.lazy(() => import('./pages/TaraConfig'));
const TeamMembers = React.lazy(() => import('./pages/TeamMembers'));
const TeamProjects = React.lazy(() => import('./pages/TeamProjects'));
const JoinOrg = React.lazy(() => import('./pages/JoinOrg'));
const ClaudeCodeConnectCallback = React.lazy(() => import('./pages/ClaudeCodeConnectCallback'));
const McpConnectCallback = React.lazy(() => import('./pages/McpConnectCallback'));
const AuditLog = React.lazy(() => import('./pages/AuditLog'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminSso = React.lazy(() => import('./pages/AdminSso'));
const DigitalEmployees = React.lazy(() => import('./pages/DigitalEmployees'));
const HyperAgents = React.lazy(() => import('./pages/HyperAgents'));
const HermesAgents = React.lazy(() => import('./pages/HermesAgents'));
const WorkspaceAdmin = React.lazy(() => import('./pages/WorkspaceAdmin'));

// Catches render/chunk-load errors in any lazy page so a single broken page
// (a throwing component, a missing api-client method, a stale lazy chunk after
// a deploy) shows a recoverable message instead of a BLANK screen that takes the
// whole app down. Resets on navigation via the `routeKey` prop.
class PageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[page-error]', error, info?.componentStack); }
  componentDidUpdate(prev) { if (prev.routeKey !== this.props.routeKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      const isChunk = /loading chunk|dynamically imported module|importing/i.test(this.state.error?.message || '');
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">This page hit an error</p>
          <p className="text-[12px] text-[#737373] mt-1 max-w-sm">
            {isChunk ? 'A newer version was deployed — reload to get the latest.' : (this.state.error?.message || 'Something went wrong rendering this page.')}
          </p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-3 py-1.5 rounded-lg bg-[#117dff] text-white text-xs font-medium hover:bg-[#0f6fe0]">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageSuspense({ children }) {
  // key the boundary by current path so an error on one page clears when you navigate away
  const routeKey = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <PageErrorBoundary routeKey={routeKey}>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#bdf213] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        {children}
      </React.Suspense>
    </PageErrorBoundary>
  );
}

/**
 * HIVEMIND Dashboard Application
 * Mounts under /hivemind/app/* and /hivemind/login
 */
export default function HiveMindApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="cli-verified" element={<CliVerified />} />
        {/* Mobile dedicated chat — no AppShell chrome, full screen */}
        <Route
          path="m/chat"
          element={
            <ProtectedRoute>
              <PageSuspense><TalkToHiveMobile /></PageSuspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="join/:slug/:token"
          element={
            <ProtectedRoute>
              <PageSuspense><JoinOrg /></PageSuspense>
            </ProtectedRoute>
          }
        />

        {/* Protected dashboard */}
        <Route
          path="app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PageSuspense><Overview /></PageSuspense>} />
          <Route path="memories" element={<PageSuspense><Memories /></PageSuspense>} />
          <Route path="meeting-notes" element={<PageSuspense><MeetingNotes /></PageSuspense>} />
          <Route path="keys" element={<PageSuspense><ApiKeys /></PageSuspense>} />
          <Route path="connectors" element={<PageSuspense><Connectors /></PageSuspense>} />
          <Route path="profile" element={<PageSuspense><Profile /></PageSuspense>} />
          <Route path="evaluation" element={<PageSuspense><Evaluation /></PageSuspense>} />
          <Route path="settings" element={<PageSuspense><Settings /></PageSuspense>} />
          <Route path="billing" element={<PageSuspense><Billing /></PageSuspense>} />
          <Route path="usage" element={<PageSuspense><Usage /></PageSuspense>} />
          <Route path="web" element={<PageSuspense><WebStudio /></PageSuspense>} />
          {/* Legacy /web-admin deep-link → studio with health drawer pre-opened. */}
          <Route path="web-admin" element={<Navigate to="/hivemind/app/web?view=health" replace />} />
          <Route path="audit" element={<PageSuspense><AuditLog /></PageSuspense>} />
          <Route path="mcp" element={<PageSuspense><McpServer /></PageSuspense>} />
          <Route path="graph" element={<PageSuspense><MemoryGraph /></PageSuspense>} />
          <Route path="graph-2d" element={<PageSuspense><MemoryGraph2D /></PageSuspense>} />
          <Route path="brain" element={<PageSuspense><Brain /></PageSuspense>} />
          <Route path="deep-research" element={<PageSuspense><DeepResearch /></PageSuspense>} />
          <Route path="engine" element={<PageSuspense><Engine /></PageSuspense>} />
          <Route path="knowledge" element={<PageSuspense><KnowledgeBase /></PageSuspense>} />
          <Route path="swarm" element={<PageSuspense><AgentSwarm /></PageSuspense>} />
          <Route path="governance" element={<PageSuspense><SwarmGovernance /></PageSuspense>} />
          <Route path="tara" element={<PageSuspense><TaraConfig /></PageSuspense>} />
          <Route path="workspace" element={<PageSuspense><WorkspaceAdmin /></PageSuspense>} />
          <Route path="team/members" element={<PageSuspense><TeamMembers /></PageSuspense>} />
          <Route path="team/projects" element={<PageSuspense><TeamProjects /></PageSuspense>} />
          <Route path="admin/users" element={<PageSuspense><AdminUsers /></PageSuspense>} />
          <Route path="admin/sso" element={<PageSuspense><AdminSso /></PageSuspense>} />
          <Route path="employees" element={<PageSuspense><HyperAgents /></PageSuspense>} />
          {/* Legacy direct roster path — kept for back-compat */}
          <Route path="employees/roster" element={<PageSuspense><DigitalEmployees /></PageSuspense>} />
          <Route path="hermes" element={<PageSuspense><HermesAgents /></PageSuspense>} />
          <Route path="connect/claude-code/callback" element={<PageSuspense><ClaudeCodeConnectCallback /></PageSuspense>} />
          <Route path="connect/mcp/callback" element={<PageSuspense><McpConnectCallback /></PageSuspense>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="app/overview" replace />} />
      </Routes>
    </AuthProvider>
  );
}
