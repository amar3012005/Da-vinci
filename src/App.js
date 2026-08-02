import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import UpdateBanner from './components/hivemind/UpdateBanner';
import MobileHomepage from './components/mobile/MobileHomepage';

// Hivemind
const HivemindRedirect = React.lazy(() => import('./components/hivemind/HivemindRedirect'));
const HiveMindApp = React.lazy(() => import('./components/hivemind/app/HiveMindApp'));
const HivemindLogin = React.lazy(() => import('./components/hivemind/app/auth/HivemindLogin'));

// Research pages (three.js hero scenes → lazy)
const ResearchIndex = React.lazy(() => import('./components/ResearchIndex'));
const BenchmarkResearch = React.lazy(() => import('./components/BenchmarkResearch'));
const IcarusResearch = React.lazy(() => import('./components/IcarusResearch'));
const CsiResearch = React.lazy(() => import('./components/CsiResearch'));
const PostQuantumResearch = React.lazy(() => import('./components/research/PostQuantumResearch'));

const HIVEMIND_SITE_HOST = process.env.REACT_APP_HIVEMIND_SITE_HOST || 'hivemind.davinciai.eu';

// PRODUCT_HOST — this domain serves the WHOLE product on ONE host (singulancelabs.com):
//   /              → SINGULANCE marketing cover (DavinciHomepage)
//   /hivemind      → HIVEMIND product cover (CartesiaReplica via HivemindRedirect)
//   /hivemind/app  → HIVEMIND dashboard (HiveMindApp), served locally — never redirected away
// Default false preserves the legacy davinciai multi-subdomain split (marketing host vs the
// dedicated hivemind.davinciai.eu subdomain), so the Vercel deploy is unaffected.
const PRODUCT_HOST = process.env.REACT_APP_PRODUCT_HOST === 'true';

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

const MarketingHomepage = () => (
  <>
    <Helmet>
      <title>SINGULANCE — AI Workforce That Runs Inside Memory</title>
      <meta
        name="description"
        content="SINGULANCE — the AI operating layer for regulated Europe. Run your institution as an AI company: a sovereign, GDPR-compliant AI workforce that runs inside memory."
      />
      <link rel="canonical" href="https://singulancelabs.com/" />
    </Helmet>
    <h1 className="sr-only">
      SINGULANCE — AI workforce that runs inside memory. The AI operating layer for regulated Europe.
    </h1>
    <MobileHomepage />
  </>
);

function App() {
  const isHivemindHost =
    typeof window !== 'undefined' && (
      window.location.hostname === HIVEMIND_SITE_HOST ||
      window.location.protocol === 'file:'
    );

  return (
    <Router>
      <UpdateBanner />
      <Routes>
        <Route path="/" element={PRODUCT_HOST ? <MarketingHomepage /> : (isHivemindHost ? <React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><HivemindRedirect /></React.Suspense> : <MarketingHomepage />)} />

        {/* HIVEMIND — only served on the HIVEMIND subdomain; every /hivemind* hit
            on the marketing domain hard-redirects to HIVEMIND_SITE_HOST. */}
        <Route path="/hivemind">
          {/* /hivemind index — PRODUCT_HOST (singulancelabs) shows the HIVEMIND product cover;
              the dedicated hivemind subdomain opens the app; marketing host redirects away. */}
          <Route index element={PRODUCT_HOST
            ? <React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><HivemindRedirect /></React.Suspense>
            : (isHivemindHost
              ? <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><HiveMindApp /></React.Suspense>
              : <HivemindExternalRedirect />)
          } />
          {/* Public auth has its own small entry point. Do not load the dashboard
              shell merely to show a sign-in form. */}
          <Route
            path="login"
            element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><HivemindLogin /></React.Suspense>}
          />
          {/* /hivemind/app, /hivemind/login, … — served locally on PRODUCT_HOST + hivemind subdomain. */}
          <Route
            path="*"
            element={(PRODUCT_HOST || isHivemindHost)
              ? <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><HiveMindApp /></React.Suspense>
              : <HivemindExternalRedirect />
            }
          />
        </Route>

        {/* Research pages */}
        <Route path="/research" element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><ResearchIndex /></React.Suspense>} />
        <Route path="/research/icarus" element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><IcarusResearch /></React.Suspense>} />
        <Route path="/research/cognitive-swarm-intelligence" element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><CsiResearch /></React.Suspense>} />
        <Route path="/research/post-quantum-cryptography" element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><PostQuantumResearch /></React.Suspense>} />
        <Route path="/benchmark" element={<React.Suspense fallback={<div className="min-h-screen bg-[#FBFBF8]" />}><BenchmarkResearch /></React.Suspense>} />

        {/* Catch all */}
        <Route path="*" element={<MarketingHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;
