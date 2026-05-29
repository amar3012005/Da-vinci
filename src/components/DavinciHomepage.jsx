import React from "react";
import Seo from "./Seo";
import MainHomepageMobile from "./MainHomepageMobile";

const DavinciHomepage = () => {
  return (
    <>
      <Seo
        title="Da'vinci Solutions — Sovereign AI Voice Agents & Memory Engine for European SMEs"
        description="TARA conversational voice AI and HIVEMIND graph memory engine. Sovereign, GDPR-compliant AI automation for small and medium European enterprises."
        canonical="https://www.davinciai.eu/"
      />
      {/* sr-only h1 for crawlers — no visible h1 exists in MobileHomepage */}
      <h1 className="sr-only">
        Da&apos;vinci Solutions — Sovereign AI Voice Agents &amp; Memory Engine for European SMEs
      </h1>
      <MainHomepageMobile />
    </>
  );
};

export default DavinciHomepage;
