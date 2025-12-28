import React from 'react';
import Navbar from './Navbar';

const UnderProgress = () => {
  return (
    <div className="bg-black min-h-screen relative">
      <Navbar />
      
      {/* Grid Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.05)_1px)] bg-[size:25px_25px]" />
      </div>

      <div className="max-w-4xl mx-auto pt-32 p-8 relative z-10">
        <div className="space-y-8 text-white">
          <h1 className="text-3xl font-mono font-bold">
            <span className="opacity-100">YOUR</span>{' '}
            <span className="relative">
              ORDERS
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h1>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Work in Progress</h2>
            <div className="space-y-4 text-white/70">
              <p>This section is currently under development...</p>
             
            </div>
          </section>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Coming Soon</h2>
            <div className="space-y-4 text-white/70">
              <p>We're working hard to bring you new features...</p>
              <p>Thank you for your patience!</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UnderProgress;
