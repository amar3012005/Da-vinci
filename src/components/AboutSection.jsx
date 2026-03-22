import React from 'react';

const AboutSection = () => {
  return (
    <div className="bg-black relative p-4 sm:p-8 pb-32 max-w-4xl mx-auto min-h-screen">
      {/* Background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.05)_1px)] bg-[size:25px_25px]" />
      </div>

      <div className="relative z-10 space-y-12 text-white">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-mono font-bold">
            <span className="opacity-100">ABOUT</span>{' '}
            <span className="relative">
              DA'VINCI SOLUTIONS
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h1>
          <div className="w-16 h-0.5 bg-green-400" />
        </div>

        {/* Mission */}
        <section className="border border-white/10 bg-black/90 p-6 space-y-4">
          <h2 className="text-xl font-mono text-green-400">Our Mission</h2>
          <p className="text-white/70 leading-relaxed">
            Da'vinci Solutions builds AI-powered enterprise automation systems for small and medium enterprises.
            We bridge the gap between cutting-edge AI and practical business operations through sovereign,
            GDPR-compliant agentic intelligence that businesses can trust and control.
          </p>
        </section>

        {/* Products */}
        <section className="border border-white/10 bg-black/90 p-6 space-y-6">
          <h2 className="text-xl font-mono text-green-400">Our Products</h2>

          <div className="space-y-4">
            <div className="border-l-2 border-green-400/50 pl-4">
              <h3 className="text-lg font-mono text-white mb-2">TARA — Conversational AI Agent</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                A multilingual voice AI agent that handles customer interactions, scheduling, and support
                with natural language understanding. Sub-500ms first-chunk latency for human-like conversations.
              </p>
            </div>

            <div className="border-l-2 border-green-400/50 pl-4">
              <h3 className="text-lg font-mono text-white mb-2">HIVEMIND — Enterprise Memory Engine</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Sovereign graph-based knowledge storage with semantic recall and cross-agent memory sharing.
                GDPR and DPDP compliant. Deployed on EU infrastructure for data sovereignty.
              </p>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="border border-white/10 bg-black/90 p-6 space-y-4">
          <h2 className="text-xl font-mono text-green-400">Infrastructure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/70">
            <div className="space-y-1">
              <div className="text-white font-mono text-xs">EU REGION</div>
              <div>Hannover, Germany</div>
              <div>GDPR-compliant hosting</div>
            </div>
            <div className="space-y-1">
              <div className="text-white font-mono text-xs">INDIA REGION</div>
              <div>Hyderabad, India</div>
              <div>DPDP-compliant hosting</div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="border border-white/10 bg-black/90 p-6 space-y-4">
          <h2 className="text-xl font-mono text-green-400">Contact</h2>
          <div className="text-white/70 space-y-2 text-sm">
            <p>Enterprise inquiries: <a href="mailto:enterprise@davinciai.eu" className="text-green-400 hover:underline">enterprise@davinciai.eu</a></p>
            <p>General: <a href="mailto:admin@da-vinci.ai" className="text-green-400 hover:underline">admin@da-vinci.ai</a></p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutSection;
