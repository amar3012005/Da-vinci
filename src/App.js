import Seo from './components/Seo';
import PublicProduct from './components/PublicProduct';
import PublicPageLoading from './components/PublicPageLoading';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import UpdateBanner from './components/hivemind/UpdateBanner';
import CookieConsent from './components/CookieConsent';
import { measureHarnessBoot } from './components/hivemind/app/shared/harness-boot-timing';
const FoundingHyperagents = React.lazy(() => import('./components/FoundingHyperagents'));
const MobileHomepage = React.lazy(() => import('./components/mobile/MobileHomepage'));

// Hivemind
const HivemindRedirect = React.lazy(() => import('./components/hivemind/HivemindRedirect'));
const HiveMindApp = React.lazy(() => measureHarnessBoot('outer-workspace-import', () => import(/* webpackPreload: true */ './components/hivemind/app/HiveMindApp')));
const PlatformAdmin = React.lazy(() => import('./components/hivemind/app/pages/PlatformAdmin'));
const HivemindLogin = React.lazy(() => import('./components/hivemind/app/auth/HivemindLogin'));

// Research pages (three.js hero scenes → lazy)
const ResearchIndex = React.lazy(() => import('./components/ResearchIndex'));
const BenchmarkResearch = React.lazy(() => import('./components/BenchmarkResearch'));
const AccountDeletion = React.lazy(() => import('./components/AccountDeletion'));
const GetRuntime = React.lazy(() => import('./components/GetRuntime'));
const RuntimeProduct = React.lazy(() => import('./components/RuntimeProduct'));
const RuntimeResearch = React.lazy(() => import('./components/RuntimeResearch'));
const IcarusResearch = React.lazy(() => import('./components/IcarusResearch'));
const CsiResearch = React.lazy(() => import('./components/CsiResearch'));
const PostQuantumResearch = React.lazy(() => import('./components/research/PostQuantumResearch'));
const PrivacySecurity = React.lazy(() => import('./components/PrivacySecurity'));
const CookiePolicy = React.lazy(() => import('./components/CookiePolicy'));

const HIVEMIND_SITE_HOST = process.env.REACT_APP_HIVEMIND_SITE_HOST || 'hivemind.davinciai.eu';
const PLATFORM_ADMIN_HOST = 'admin.hivemind.singulancelabs.com';
const RUNTIME_RUNNER_HOST = 'runtime-runner.singulancelabs.com';
// Preview is a first-class authenticated product origin. The production build
// still embeds the production canonical host, so it must be allowed explicitly
// instead of being redirected to production by HivemindExternalRedirect.
const HIVEMIND_PREVIEW_HOSTS = new Set(['next.preview.singulancelabs.com']);

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
    <Seo canonical="https://singulancelabs.com/" />
    <React.Suspense fallback={<PublicPageLoading />}><MobileHomepage /></React.Suspense>
  </>
);

// The public company homepage stays visible; sign-in is an explicit action.
const ReturningUserMarketingHomepage = MarketingHomepage;

function App() {
  const isPublicProductHost = typeof window !== 'undefined' && ['singulancelabs.com', 'www.singulancelabs.com', 'next.singulancelabs.com'].includes(window.location.hostname);
  const isPlatformAdminHost =
    typeof window !== 'undefined' && window.location.hostname === PLATFORM_ADMIN_HOST;
  const isHivemindHost =
    typeof window !== 'undefined' && (
      window.location.hostname === HIVEMIND_SITE_HOST ||
      window.location.hostname === RUNTIME_RUNNER_HOST ||
      HIVEMIND_PREVIEW_HOSTS.has(window.location.hostname) ||
      window.location.protocol === 'file:' ||
      window.Capacitor?.isNativePlatform?.() === true
    );

  if (isPlatformAdminHost) {
    return (
      <Router>
        <Helmet>
          <title>HIVEMIND Admin — Commercial</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Routes>
          <Route
            path="*"
            element={<React.Suspense fallback={<PublicPageLoading />}><PlatformAdmin /></React.Suspense>}
          />
        </Routes>
      </Router>
    );
  }

  if (window.location.hostname === 'getruntime.singulancelabs.com') return <Router><CookieConsent/><React.Suspense fallback={<PublicPageLoading/>}><GetRuntime/></React.Suspense></Router>;

  return (
    <Router>
      <UpdateBanner />
      <CookieConsent />
      <Routes>
        <Route path="/" element={window.location.hostname === "icarus.singulancelabs.com" ? <React.Suspense fallback={<PublicPageLoading />}><IcarusResearch productHome /></React.Suspense> : window.location.hostname === "runtime.singulancelabs.com" ? <React.Suspense fallback={<PublicPageLoading />}><RuntimeProduct /></React.Suspense> : PRODUCT_HOST ? <ReturningUserMarketingHomepage /> : (isHivemindHost ? <React.Suspense fallback={<PublicPageLoading />}><HivemindRedirect /></React.Suspense> : <ReturningUserMarketingHomepage />)} />

        {/* HIVEMIND — only served on the HIVEMIND subdomain; every /hivemind* hit
            on the marketing domain hard-redirects to HIVEMIND_SITE_HOST. */}
        <Route path="/hivemind">
          {/* /hivemind index — PRODUCT_HOST (singulancelabs) shows the HIVEMIND product cover;
              the dedicated hivemind subdomain opens the app; marketing host redirects away. */}
          <Route index element={(PRODUCT_HOST || isPublicProductHost)
            ? <React.Suspense fallback={<PublicPageLoading />}><HivemindRedirect /></React.Suspense>
            : (isHivemindHost
              ? <React.Suspense fallback={<PublicPageLoading />}><HiveMindApp /></React.Suspense>
              : <HivemindExternalRedirect />)
          } />
          {/* Public auth has its own small entry point. Do not load the dashboard
              shell merely to show a sign-in form. */}
          <Route
            path="login"
            element={<React.Suspense fallback={<PublicPageLoading />}><HivemindLogin /></React.Suspense>}
          />
          {/* /hivemind/app, /hivemind/login, … — served locally on PRODUCT_HOST + hivemind subdomain. */}
          <Route
            path="*"
            element={(PRODUCT_HOST || isHivemindHost)
              ? <React.Suspense fallback={<PublicPageLoading />}><HiveMindApp /></React.Suspense>
              : <HivemindExternalRedirect />
            }
          />
        </Route>

        <Route path="/tara" element={<PublicProduct path="/tara" />} />
        <Route path="/hyperagents" element={<PublicProduct path="/hyperagents" />} />

        {/* Research pages */}
        <Route path="/founding-hyperagents" element={<React.Suspense fallback={<PublicPageLoading />}><FoundingHyperagents /></React.Suspense>} />
        <Route path="/research" element={<React.Suspense fallback={<PublicPageLoading />}><ResearchIndex /></React.Suspense>} />
        <Route path="/account-deletion" element={<React.Suspense fallback={<PublicPageLoading />}><AccountDeletion /></React.Suspense>} />
        <Route path="/getruntime" element={<React.Suspense fallback={<PublicPageLoading />}><GetRuntime /></React.Suspense>} />
        <Route path="/runtime" element={<React.Suspense fallback={<PublicPageLoading />}><RuntimeProduct /></React.Suspense>} />
        <Route path="/research/runtime" element={<React.Suspense fallback={<PublicPageLoading />}><RuntimeResearch /></React.Suspense>} />
        <Route path="/icarus" element={<React.Suspense fallback={<PublicPageLoading />}><IcarusResearch productHome /></React.Suspense>} />
        <Route path="/research/icarus" element={<React.Suspense fallback={<PublicPageLoading />}><IcarusResearch /></React.Suspense>} />
        <Route path="/research/cognitive-swarm-intelligence" element={<React.Suspense fallback={<PublicPageLoading />}><CsiResearch /></React.Suspense>} />
        <Route path="/research/post-quantum-cryptography" element={<React.Suspense fallback={<PublicPageLoading />}><PostQuantumResearch /></React.Suspense>} />
        <Route path="/privacy" element={<React.Suspense fallback={<PublicPageLoading />}><PrivacySecurity mode="privacy" /></React.Suspense>} />
        <Route path="/security" element={<React.Suspense fallback={<PublicPageLoading />}><PrivacySecurity mode="security" /></React.Suspense>} />
        <Route path="/cookies" element={<React.Suspense fallback={<PublicPageLoading />}><CookiePolicy /></React.Suspense>} />
        <Route path="/benchmark" element={<React.Suspense fallback={<PublicPageLoading />}><BenchmarkResearch /></React.Suspense>} />

        {/* Catch all */}
        <Route path="*" element={<MarketingHomepage />} />
      </Routes>
      {isPublicProductHost && ['/', '/hivemind'].includes(window.location.pathname) && <nav aria-label="Explore SINGULANCE products" style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:24,padding:'24px',background:'#05070f',color:'#dce8ff',font:'600 14px system-ui'}}>
        <a href="https://singulancelabs.com/hivemind" style={{color:'inherit'}}>HIVEMIND</a>
        <a href="https://singulancelabs.com/runtime" style={{color:'inherit'}}>Runtime</a>
        <a href="https://singulancelabs.com/tara" style={{color:'inherit'}}>TARA</a>
        <a href="https://singulancelabs.com/hyperagents" style={{color:'inherit'}}>HyperAgents</a>
        <a href="https://singulancelabs.com/icarus" style={{color:'inherit'}}>ICARUS</a>
      </nav>}
    </Router>
  );
}

export default App;
