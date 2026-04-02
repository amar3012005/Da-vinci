import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DavinciHomepage from './components/DavinciHomepage';
import AboutPage from './components/AboutPage';
import UnderProgress from './components/UnderProgress';
import Terms from './components/Terms';
import Navbar from './components/Navbar';
import DemoPage from './components/DemoPage';
import ResearchPage from './components/ResearchPage';
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
    typeof window !== 'undefined' && window.location.hostname === HIVEMIND_SITE_HOST;

  return (
    <Router>
      <Routes>
        <Route path="/" element={isHivemindHost ? <HivemindRedirect /> : <DavinciHomepage />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/underprogress" element={<UnderProgress />} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/research" element={<ResearchPage />} />
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

        {/* HIVEMIND — consolidated parent route */}
        <Route path="/hivemind">
          {/* Exact /hivemind → landing on localhost, app on production */}
          <Route index element={isHivemindHost
            ? <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><HiveMindApp /></React.Suspense>
            : <HivemindRedirect />
          } />
          {/* /hivemind/login, /hivemind/app/* → dashboard app */}
          <Route
            path="*"
            element={
              <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
                <HiveMindApp />
              </React.Suspense>
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
