import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DavinciHomepage from './components/DavinciHomepage';
import AboutPage from './components/AboutPage';
import UnderProgress from './components/UnderProgress';
import Terms from './components/Terms';
import Navbar from './components/Navbar';
import DemoPage from './components/DemoPage';

const Layout = ({ children }) => (
  <div className="min-h-screen bg-black text-white">
    <Navbar />
    <div className="pt-24">
      {children}
    </div>
  </div>
);

// Portal Component for Iframe Persistence
import PortalLayout from './components/PortalLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DavinciHomepage />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/underprogress" element={<UnderProgress />} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/demo" element={<DemoPage />} />

        {/* 
            PORTAL ROUTES 
            These load the other apps (enterprise, prometheus) inside the iframe wrapper
            while keeping the TARA widget persistent on top.
        */}
        <Route
          path="/enterprise/*"
          element={<PortalLayout targetUrl="https://enterprise.davinciai.eu" />}
        />
        <Route
          path="/prometheus/*"
          element={<PortalLayout targetUrl="https://prometheus.davinciai.eu" />}
        />

        {/* Catch all route - redirect to home if needed, or just let users know */}
        <Route path="*" element={<DavinciHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;