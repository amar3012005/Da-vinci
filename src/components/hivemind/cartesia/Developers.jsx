import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Layers, Code2, Shield } from 'lucide-react';

const StripedSeparator = () => (
  <div
    className="h-16 w-full border-b border-[#e3e0db]"
    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
  />
);

const Developers = () => {
  const navigate = useNavigate();
  return (
    <div id="developers" className="bg-[#faf9f4] text-[#0a0a0a]">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">

        {/* Developer-first section */}
        <section className="relative">
          <StripedSeparator />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left Content */}
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-['Space_Grotesk']">
                  Developer-first,<br />
                  enterprise-ready
                </h2>
                <p className="text-lg text-[#525252] leading-relaxed max-w-md">
                  HIVEMIND is built for rapid prototyping and seamless integration. Developers trust it for secure, compliant, production-ready performance.
                </p>
                <button onClick={() => navigate('/hivemind/login')} className="px-6 py-3 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors text-sm uppercase tracking-[0.075em] cursor-pointer border-none">
                  Build with HIVEMIND
                </button>

                {/* Feature list */}
                <div className="space-y-6 mt-12">
                  <div className="flex items-start gap-4 pb-6 border-b border-[#e3e0db]">
                    <div className="w-10 h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <Cpu className="w-5 h-5 text-[#117dff]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 font-['Space_Grotesk']">API</h3>
                      <p className="text-[#525252] text-sm">REST API and MCP Protocol — integrate HIVEMIND directly into your product with simple, well-documented endpoints.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pb-6 border-b border-[#e3e0db]">
                    <div className="w-10 h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <Layers className="w-5 h-5 text-[#117dff]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 font-['Space_Grotesk']">SDK</h3>
                      <p className="text-[#525252] text-sm">JavaScript SDK available now, Python SDK coming soon. Plus Knowledge Base Upload and Gmail Connector built-in.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pb-6 border-b border-[#e3e0db]">
                    <div className="w-10 h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <Code2 className="w-5 h-5 text-[#117dff]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 font-['Space_Grotesk']">Playground</h3>
                      <p className="text-[#525252] text-sm">Experiment with real memory interactions instantly in your browser. Test queries, customize your context, and see results in real time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <Shield className="w-5 h-5 text-[#117dff]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 font-['Space_Grotesk']">Enterprise Grade</h3>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {['GDPR Compliant', 'EU Data Residency', 'ISO 27001 Ready', 'Reliable uptime'].map((cert) => (
                          <div key={cert} className="flex items-center gap-2 text-sm text-[#525252]">
                            <div className="w-5 h-5 rounded bg-[#117dff]/[0.08] flex items-center justify-center">
                              <Shield className="w-3 h-3 text-[#117dff]" />
                            </div>
                            {cert}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content - Bento Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Compliance Card */}
                <div className="bg-white rounded-xl border border-[#e3e0db] p-6 aspect-square flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="text-[11px] uppercase tracking-widest text-[#a3a3a3] font-mono mb-4">Compliance</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-[#117dff]/20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-[#117dff]/30 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#117dff]/[0.15]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Playground Card */}
                <div className="bg-white rounded-xl border border-[#e3e0db] p-6 row-span-2 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="text-[11px] uppercase tracking-widest text-[#a3a3a3] font-mono mb-4">Playground</div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-[#faf9f4] rounded-xl p-4 border border-[#e3e0db] flex-1">
                      <div className="flex gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-[#e3e0db] rounded w-3/4"></div>
                        <div className="h-2 bg-[#e3e0db] rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-[#faf9f4] rounded-xl p-4 border border-[#e3e0db] flex-1">
                      <div className="flex gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#e3e0db]"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-[#e3e0db] rounded w-2/3"></div>
                        <div className="h-2 bg-[#e3e0db] rounded w-4/5"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Card */}
                <div className="bg-white rounded-xl border border-[#e3e0db] p-6 aspect-square flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="text-[11px] uppercase tracking-widest text-[#117dff] font-mono mb-4">API</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(16)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full ${i % 3 === 0 ? 'bg-[#117dff]/30' : 'bg-[#e3e0db]'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SDK Card */}
                <div className="bg-white rounded-xl border border-[#117dff]/20 p-6 aspect-square flex flex-col shadow-[0_0_20px_rgba(17,125,255,0.08)]">
                  <div className="text-[11px] uppercase tracking-widest text-[#117dff] font-mono mb-4">SDK</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 border border-[#117dff]/30 rotate-45 rounded-md"></div>
                      <div className="w-20 h-20 border border-[#117dff]/20 rotate-45 rounded-md absolute top-2 left-2"></div>
                      <div className="w-20 h-20 border border-[#117dff]/10 rotate-45 rounded-md absolute top-4 left-4"></div>
                    </div>
                  </div>
                </div>

                {/* Security Card */}
                <div className="bg-white rounded-xl border border-[#e3e0db] p-6 aspect-square flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="text-[11px] uppercase tracking-widest text-[#a3a3a3] font-mono mb-4">Security</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-24 h-12 border border-[#e3e0db] rounded-t-full"></div>
                      <div className="w-20 h-10 border border-[#e3e0db] rounded-t-full absolute top-2 left-2"></div>
                      <div className="w-16 h-8 border border-[#eae7e1] rounded-t-full absolute top-4 left-4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="relative border-t border-[#e3e0db]">
          <StripedSeparator />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 font-['Space_Grotesk']">
                Pricing crafted for<br />
                <span className="text-[#a3a3a3]">individuals and teams.</span>
              </h2>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Individual */}
              <div className="bg-white rounded-xl border border-[#e3e0db] p-8 flex flex-col hover:border-[#d4d0ca] transition-colors duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-2xl font-bold mb-2 font-['Space_Grotesk']">Individual</h3>
                <div className="text-4xl font-bold mb-6 text-[#0a0a0a]">Free</div>
                <p className="text-[#525252] mb-8 border-b border-[#e3e0db] pb-8 flex-1 text-sm">
                  Perfect for getting started with your personal memory graph.
                </p>
                <ul className="space-y-4 text-sm text-[#525252] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> 1M tokens/month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> 1 Connector
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> Community Support
                  </li>
                </ul>
                <button onClick={() => navigate('/hivemind/login')} className="w-full py-3 rounded-lg border border-[#e3e0db] hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors font-medium text-[#0a0a0a] bg-white cursor-pointer text-sm">
                  Get Started
                </button>
              </div>

              {/* Pro - Most Popular */}
              <div className="bg-white rounded-xl border-2 border-[#117dff] p-8 flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(17,125,255,0.08)]">
                <div className="absolute top-0 right-0 bg-[#117dff] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2 font-['Space_Grotesk']">Pro</h3>
                <div className="text-4xl font-bold mb-6 text-[#0a0a0a]">$19<span className="text-lg font-normal text-[#a3a3a3]">/mo</span></div>
                <p className="text-[#525252] mb-8 border-b border-[#e3e0db] pb-8 flex-1 text-sm">
                  For professionals who need their AI stack seamlessly synced.
                </p>
                <ul className="space-y-4 text-sm text-[#525252] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> 80M tokens/month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> All Connectors + Team Workspace
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> Priority Support
                  </li>
                </ul>
                <button onClick={() => navigate('/hivemind/login')} className="w-full py-3 rounded-[4px] bg-[#117dff] hover:bg-[#0066e0] transition-colors font-semibold text-white text-sm uppercase tracking-[0.075em] cursor-pointer border-none">
                  Subscribe Now
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-white rounded-xl border border-[#e3e0db] p-8 flex flex-col hover:border-[#117dff]/30 transition-colors duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-2xl font-bold mb-2 font-['Space_Grotesk']">Enterprise</h3>
                <div className="text-4xl font-bold mb-6 text-[#0a0a0a]">Custom</div>
                <p className="text-[#525252] mb-8 border-b border-[#e3e0db] pb-8 flex-1 text-sm">
                  For teams requiring strict compliance and sovereign deployment.
                </p>
                <ul className="space-y-4 text-sm text-[#525252] mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> HYOK + Dedicated HSM
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> DPA + Custom SLA
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#16a34a] font-bold">&#10003;</span> On-Premise & Team Scoping
                  </li>
                </ul>
                <button onClick={() => window.location.href = 'mailto:enterprise@davinciai.eu'} className="w-full py-3 rounded-lg border border-[#e3e0db] hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors font-medium text-[#0a0a0a] bg-white cursor-pointer text-sm">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#e3e0db] px-10 lg:px-20 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#117dff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                 <polyline points="2 17 12 22 22 17"></polyline>
                 <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span className="text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">HIVEMIND</span>
            </div>
            <div className="flex gap-8 text-sm text-[#a3a3a3]">
              <button onClick={() => navigate('/hivemind/app/connectors')} className="hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">Documentation</button>
              <button onClick={() => navigate('/hivemind/app/connectors')} className="hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">API Reference</button>
              <button onClick={() => navigate('/hivemind/app/settings')} className="hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">Trust Center</button>
            </div>
            <div className="text-sm text-[#a3a3a3] text-center md:text-right">
              Davinci AI Startup | Built in Europe, for the World.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Developers;
