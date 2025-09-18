
import React from 'react';

const TermsPage = () => {
  return (
    <div className="bg-black min-h-screen p-8 pb-32 relative">
      <div className="max-w-4xl mx-auto text-white">
        <h1 className="text-3xl font-mono font-bold mb-8">Terms & Policies</h1>
        <section className="text-white/70 space-y-4">
          <h2 className="text-xl font-mono mb-2">Terms & Conditions</h2>
          <p className="text-sm">// ...your terms text goes here...</p>
        </section>
        <section className="text-white/70 space-y-4 mt-6">
          <h2 className="text-xl font-mono mb-2">Policies</h2>
          <p className="text-sm">// ...your policy text goes here...</p>
        </section>
        <section className="text-white/70 space-y-4 mt-6">
          <h2 className="text-xl font-mono mb-2">Contact Info</h2>
          <p className="text-sm">// ...contact information goes here...</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;