import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DavinciHomepage from './components/DavinciHomepage';
import Menu from './components/Menu';
import AboutPage from './components/AboutPage';
  // Add AboutPage2 import
import UnderProgress from './components/UnderProgress';
import PreReserve from './components/PreReserve';
import OffersPage from './components/OffersPage';

import Navbar from './components/Navbar';
import Checkout from './components/Checkout';
import WaitingRoom from './components/WaitingRoom';
import PersonalInfo from './components/PersonalInfo';
import FuturisticOrderConfirmation from './components/FuturisticOrderConfirmation';
import CashfreeResponse from './components/CashfreeResponse';
import Terms from './components/Terms';
import CampusSelection from './components/campus';


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
        <Route path="/offers" element={<Layout><OffersPage /></Layout>} />
        <Route path="/pre-reserve" element={<PreReserve />} />
        <Route path="/menu/:restaurantId" element={<Layout><Menu /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
 

        <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
        <Route path="/personal-info" element={<Layout><PersonalInfo /></Layout>} />
        <Route path="/waiting-room" element={<Layout><WaitingRoom /></Layout>} />
        <Route path="/order-confirmation" element={<Layout><FuturisticOrderConfirmation /></Layout>} />
        
        {/* Cashfree response handlers - multiple patterns to catch different response formats */}
        <Route path="/forms/response/:responseToken" element={<CashfreeResponse />} />
        <Route path="/forms/response/*" element={<CashfreeResponse />} />
        <Route path="/cashfree-response" element={<CashfreeResponse />} />
        <Route path="/payment-success" element={<CashfreeResponse />} />
        
        <Route path="/underprogress" element={<UnderProgress />} />
        <Route path="/campus" element={<Layout><CampusSelection /></Layout>} />

        <Route path="/terms" element={<Layout><Terms /></Layout>} />
      </Routes>
    
    </Router>
  );
}

export default App;