import React from 'react';
import Seo from './Seo';

const Terms = () => {
  return (
    <>
      <Seo
        title="Terms of Service — Da'vinci Solutions"
        canonical="https://www.davinciai.eu/terms"
      />
    <div className="terms-content">
      {/* Grid Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.05)_1px)] bg-[size:25px_25px]" />
      </div>

      <div className="max-w-4xl mx-auto pt-32 p-8 relative z-10">
        <div className="space-y-8 text-white">
          <h1 className="text-3xl font-mono font-bold">
            <span className="opacity-100">TERMS</span>{' '}
            <span className="relative">
              & CONDITIONS
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h1>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Terms of Service</h2>
            <div className="space-y-4 text-white/70">
              <p>By using Da'vinci Solutions products and services, you agree to the following terms:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>Services are provided on a subscription basis with tiered pricing plans</li>
                <li>API usage is subject to rate limits and fair-use policies per your subscription tier</li>
                <li>You retain ownership of all data you provide to our systems</li>
                <li>Service availability targets are defined in your service-level agreement (SLA)</li>
                <li>Account credentials must not be shared or transferred without authorization</li>
                <li>We reserve the right to suspend accounts that violate these terms or engage in abusive usage</li>
              </ul>
            </div>
          </section>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Data & Privacy</h2>
            <div className="space-y-4 text-white/70">
              <p>Da'vinci Solutions is committed to data sovereignty and privacy:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>EU customer data is processed and stored exclusively within the European Union (Hannover, Germany)</li>
                <li>India customer data is processed in compliance with the Digital Personal Data Protection Act (DPDP)</li>
                <li>All data is encrypted at rest and in transit using industry-standard protocols</li>
                <li>We do not sell, share, or use your data for training AI models without explicit consent</li>
                <li>You may request data export or deletion at any time in accordance with GDPR Article 17</li>
                <li>Our memory engine (HIVEMIND) stores knowledge graphs with full audit trails for compliance</li>
              </ul>
            </div>
          </section>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Acceptable Use</h2>
            <div className="space-y-4 text-white/70">
              <p>When using our AI services (TARA, HIVEMIND), you agree not to:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>Use the services for illegal activities or to cause harm</li>
                <li>Attempt to reverse-engineer, extract, or replicate our AI models</li>
                <li>Exceed API rate limits or circumvent usage restrictions</li>
                <li>Store or transmit malicious content through our systems</li>
                <li>Misrepresent AI-generated outputs as human-created when disclosure is required</li>
              </ul>
            </div>
          </section>

          <section className="border border-white/10 bg-black/90 p-6">
            <h2 className="text-xl font-mono text-green-400 mb-4">Contact Information</h2>
            <div className="space-y-4 text-white/70">
              <p>For support and inquiries:</p>
              <ul className="list-none space-y-2">
                <li>Enterprise: enterprise@davinciai.eu</li>
                <li>General: admin@da-vinci.ai</li>
                <li>Website: www.davinciai.eu</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
    </>
  );
};

export default Terms;
