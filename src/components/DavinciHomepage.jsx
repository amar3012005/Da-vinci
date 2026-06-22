import React from "react";
import Seo from "./Seo";
import MainHomepageMobile from "./MainHomepageMobile";

const DavinciHomepage = () => {
  return (
    <>
      <Seo
        title="SINGULANCE — AI Workforce That Runs Inside Memory"
        description="SINGULANCE — the AI operating layer for regulated Europe. Run your institution as an AI company: a sovereign, GDPR-compliant AI workforce that runs inside memory."
        canonical="https://singulancelabs.com/"
      />
      {/* sr-only h1 for crawlers — visible wordmark is rendered in the cinematic hero */}
      <h1 className="sr-only">
        SINGULANCE — AI workforce that runs inside memory. The AI operating layer for regulated Europe.
      </h1>
      <MainHomepageMobile />
    </>
  );
};

export default DavinciHomepage;
