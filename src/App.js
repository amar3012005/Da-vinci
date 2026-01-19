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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DavinciHomepage />} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/underprogress" element={<UnderProgress />} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/demo" element={<DemoPage />} />

        {/* Catch all route - redirect to home if needed, or just let users know */}
        <Route path="*" element={<DavinciHomepage />} />
      </Routes>
    </Router>
  );
}

export default App;