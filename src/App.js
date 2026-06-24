import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DavinciHomepage from './components/DavinciHomepage';
import AboutPage from './components/AboutPage';
import UnderProgress from './components/UnderProgress';
import Terms from './components/Terms';
import PrivacyPage from './pages/PrivacyPage';
import Navbar from './components/Navbar';
import DemoPage from './components/DemoPage';
import ResearchPage from './components/ResearchPage';
import IcarusResearch from './components/IcarusResearch';
import BenchmarkPage from './components/BenchmarkPage';
import VoiceAgentTestPage from './components/testing/VoiceAgentTestPage';
import TestingIndexPage from './components/testing/TestingIndexPage';
import { bundbTestConfig, davinciTestConfig } from './components/testing/testConfigs';

// Portal Component for Iframe Persistence
import PortalLayout from './components/PortalLayout';

// Hivemind
import HivemindRedirect from './components/hivemind/HivemindRedirect';
const HiveMindApp = React.lazy(() => import('./components/hivemind/app/HiveMindApp'));

const HIVEMIND_SITE_HOST = process.env.REACT_APP_HIVEMIND_SITE_HOST || 'hivemind.davinciai.eu';

/**
 * Hard-redirect any /hivemind* hit on a non-HIVEMIND host (e.g. singulancelabs.com,
 * davinciai.eu) to the canonical HIVEMIND subdomain, preserving the full path,
 * query, and hash. The HIVEMIND app is never served from the marketing domain —
 * it only runs on HIVEMIND_SITE_HOST.
 */
const HivemindExternalRedirect = () => {
  React.useEffect(() => {
    const { pathname, search, hash } = window.location;
    window.location.replace(`https://${HIVEMIND_SITE_HOST}${pathname}${search}${hash}`);
  }, []);
  return <div className="min-h-screen bg-[#0a0a0a]" />;
};

const Layout = ({ children }) => (
  <div className="min-h-screen bg-black text-white">
    <Navbar />
    <div className="pt-24">
      {children}
    </div>
  </div>
);

function App() {
  const isHivemindHost =
    typeof window !== 'undefined' && (
      window.location.hostname === HIVEMIND_SITE_HOST ||
      window.location.protocol === 'file:'
    );

  return (
    <Router>
      <Routes>
        <Route path="/" element={isHivemindHost ? <HivemindRedirect /> : <DavinciHomepage />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/underprogress" element={<UnderProgress />} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/research/icarus" element={<IcarusResearch />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
        <Route path="/test" element={<TestingIndexPage />} />
        <Route
          path="/test/davinci"
          element={<VoiceAgentTestPage config={davinciTestConfig.config} brand={davinciTestConfig.brand} />}
        />
        <Route
          path="/test/bundb"
          element={<VoiceAgentTestPage config={bundbTestConfig.config} brand={bundbTestConfig.brand} />}
        />

        {/* HIVEMIND — only served on the HIVEMIND subdomain; every /hivemind* hit
            on the marketing domain hard-redirects to HIVEMIND_SITE_HOST. */}
        <Route path="/hivemind">
          <Route index element={isHivemindHost
            ? <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><HiveMindApp /></React.Suspense>
            : <HivemindExternalRedirect />
          } />
          <Route
            path="*"
            element={isHivemindHost
              ? <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><HiveMindApp /></React.Suspense>
              : <HivemindExternalRedirect />
            }
          />
        </Route>

        {/* PORTAL ROUTES */}
        <Route
          path="/enterprise/*"
          element={<PortalLayout targetUrl="https://enterprise.davinciai.eu" />}
        />
        <Route
          path="/prometheus/*"
          element={<PortalLayout targetUrl="https://prometheus.davinciai.eu" />}
        />

        {/* Catch all */}
        <Route path="*" element={<DavinciHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;
