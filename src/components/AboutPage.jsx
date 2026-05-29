// AboutPage.jsx
import React from 'react';
import Seo from './Seo';
import AboutSection from './AboutSection'; // Import the AboutSection component

const AboutPage = () => {
  return (
    <>
      <Seo
        title="About Da'vinci Solutions — Sovereign AI for European Enterprises"
        description="Da'vinci Solutions builds GDPR-compliant conversational AI and memory systems for SMEs."
        canonical="https://www.davinciai.eu/about"
      />
      <div className="min-h-screen bg-black text-white pt-65">
        <AboutSection />
      </div>
    </>
  );
};

export default AboutPage;