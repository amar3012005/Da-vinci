import React from 'react';

const TermsPage = () => {
  return (
    <div className="bg-black min-h-screen p-8 pb-32 relative">
      <div className="max-w-4xl mx-auto text-white">
        <h1 className="text-3xl font-mono font-bold mb-8">Terms & Policies</h1>
        <section className="text-white/70 space-y-4">
          <h2 className="text-xl font-mono mb-2">Terms & Conditions</h2>
          <p className="text-sm">
            By using Da'vinci Solutions products, you agree to our terms of service.
            See the full terms at <a href="/terms" className="text-green-400 hover:underline">davinciai.eu/terms</a>.
          </p>
        </section>
        <section className="text-white/70 space-y-4 mt-6">
          <h2 className="text-xl font-mono mb-2">Privacy Policy</h2>
          <p className="text-sm">
            Da'vinci Solutions processes EU data in Germany (GDPR) and India data in Hyderabad (DPDP).
            All data is encrypted at rest and in transit.
          </p>
        </section>
        <section className="text-white/70 space-y-4 mt-6">
          <h2 className="text-xl font-mono mb-2">Contact</h2>
          <p className="text-sm">Enterprise: enterprise@davinciai.eu | General: admin@da-vinci.ai</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
