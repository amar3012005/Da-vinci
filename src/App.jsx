import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import DavinciHomepage from './components/DavinciHomepage';  // New AI solutions homepage
import AboutPage from './components/AboutPage';  // Changed from About
import ContactForm from './components/ContactForm';  // Contact form component
import PaymentFailure from './components/PaymentFailure';
import UnderProgress from './components/UnderProgress';
import Terms from './components/Terms';
import Navbar from './components/Navbar';
import InstallPrompt from './components/InstallPrompt';
import { RestaurantStatusProvider } from './context/RestaurantStatusContext';
import { useEffect } from "react";
import ReactGA from "react-gtag";
import CampusSelection from './components/campus';

const Layout = ({ children }) => (
  <div className="min-h-screen bg-black text-white">
    <Navbar />
    <div className="pt-24">
      {children}
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.pageview(location.pathname + location.search);
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search
      });
    }
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<DavinciHomepage />} />
      <Route path="/campus" element={<Layout><CampusSelection /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/contact" element={<Layout><ContactForm /></Layout>} />
      <Route path="/payment-failure" element={<PaymentFailure />} />
      <Route path="/underprogress" element={<UnderProgress />} />
      <Route path="/terms" element={<Layout><Terms /></Layout>} />
    </Routes>
  );
}

function App() {
  return (
    <RestaurantStatusProvider>
      <Router>
        <AppContent />
        <InstallPrompt />
      </Router>
    </RestaurantStatusProvider>
  );
}

export default App;
