import React from 'react';
import { Cpu, Layers, Code2, Shield } from 'lucide-react';

const Developers = () => {
  return (
    <div className="bg-[#111] text-white">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#222]">
        
        {/* Developer-first section */}
        <section className="relative">
          {/* Vertical striped separator */}
          <div 
            className="h-20 w-full border-b border-[#222]" 
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
          />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left Content */}
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
                  Developer-first,<br />
                  enterprise-ready
                </h2>
                <p className="text-lg text-white/50 font-light leading-relaxed max-w-md">
                  HIVEMIND is built for rapid prototyping and seamless integration. Developers trust it for secure, compliant, production-ready performance.
                </p>
                <button className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors">
                  Build with HIVEMIND
                </button>

                {/* Feature list */}
                <div className="space-y-6 mt-12">
                  <div className="flex items-start gap-4 pb-6 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">API</h3>
                      <p className="text-white/50 text-sm">Integrate HIVEMIND directly into your product with simple, well-documented endpoints.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pb-6 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">SDK</h3>
                      <p className="text-white/50 text-sm">Speed up development with pre-built SDKs in your favorite languages.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pb-6 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Code2 className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">Playground</h3>
                      <p className="text-white/50 text-sm">Experiment with real memory interactions instantly in your browser. Test queries, customize your context, and see results in real time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-1">Enterprise Grade</h3>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                            <Shield className="w-3 h-3" />
                          </div>
                          SOC 2 Type II
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                            <Shield className="w-3 h-3" />
                          </div>
                          HIPAA
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                            <Shield className="w-3 h-3" />
                          </div>
                          PCI Level 1
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                            <Shield className="w-3 h-3" />
                          </div>
                          Reliable uptime
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content - Bento Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Compliance Card */}
                <div className="bg-[#161616] rounded-3xl border border-white/10 p-6 aspect-square flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Compliance</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-[#4f00ff]/30 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-[#4f00ff]/50 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#4f00ff]/30"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Playground Card */}
                <div className="bg-[#161616] rounded-3xl border border-white/10 p-6 row-span-2 flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Playground</div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5 flex-1">
                      <div className="flex gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-white/10 rounded w-3/4"></div>
                        <div className="h-2 bg-white/10 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5 flex-1">
                      <div className="flex gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                        <div className="w-3 h-3 rounded-full bg-white/20"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-white/10 rounded w-2/3"></div>
                        <div className="h-2 bg-white/10 rounded w-4/5"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Card */}
                <div className="bg-[#161616] rounded-3xl border border-white/10 p-6 aspect-square flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-[#bdf213] mb-4">API</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(16)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-4 h-4 rounded-full ${i % 3 === 0 ? 'bg-[#bdf213]/40' : 'bg-white/10'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SDK Card */}
                <div className="bg-[#161616] rounded-3xl border border-[#bdf213]/30 p-6 aspect-square flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-[#bdf213] mb-4">SDK</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 border border-[#bdf213]/30 rotate-45"></div>
                      <div className="w-20 h-20 border border-[#bdf213]/20 rotate-45 absolute top-2 left-2"></div>
                      <div className="w-20 h-20 border border-[#bdf213]/10 rotate-45 absolute top-4 left-4"></div>
                    </div>
                  </div>
                </div>

                {/* Security Card */}
                <div className="bg-[#161616] rounded-3xl border border-white/10 p-6 aspect-square flex flex-col">
                  <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Security</div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-24 h-12 border border-white/20 rounded-t-full"></div>
                      <div className="w-20 h-10 border-white/20 rounded-t-full absolute top-2 left-2"></div>
                      <div className="w-16 h-8 border-white/20 rounded-t-full absolute top-4 left-4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="relative border-t border-[#222]">
          {/* Vertical striped separator */}
          <div 
            className="h-20 w-full border-b border-[#222]" 
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
          />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
                Pricing crafted for<br />
                <span className="text-white/40">individuals and teams.</span>
              </h2>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Individual */}
              <div className="bg-[#161616] rounded-[32px] border border-white/10 p-8 flex flex-col hover:border-white/20 transition-colors duration-300">
                <h3 className="text-2xl font-medium mb-2">Individual</h3>
                <div className="text-4xl font-bold mb-6">Free</div>
                <p className="text-white/50 mb-8 border-b border-white/10 pb-8 flex-1">
                  Perfect for getting started with your personal memory graph.
                </p>
                <ul className="space-y-4 text-sm font-light text-white/80 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> 100 Memories
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> 1 Platform Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> Standard Support
                  </li>
                </ul>
                <button className="w-full py-3 rounded-full border border-white/20 hover:bg-white/5 transition-colors font-medium">
                  Get Started
                </button>
              </div>

              {/* Pro - Most Popular */}
              <div className="bg-[#1a1a1c] rounded-[32px] border-[#4f00ff]/50 p-8 flex flex relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#4f00ff] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  Most Popular
                </div>
                <h3 className="text-2xl font-medium mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-6">$19<span className="text-lg font-light text-white/40">/mo</span></div>
                <p className="text-white/50 mb-8 border-b border-white/10 pb-8 flex-1">
                  For professionals who need their AI stack seamlessly synced.
                </p>
                <ul className="space-y-4 text-sm font-light text-white/80 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> Unlimited Memories
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> Full Meta-MCP
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> Priority Support
                  </li>
                </ul>
                <button className="w-full py-3 rounded-full bg-[#4f00ff] hover:bg-[#5b14ff] transition-colors font-medium text-white">
                  Subscribe Now
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-[#161616] rounded-[32px] border border-white/10 p-8 flex flex-col hover:border-[#bdf213]/50 transition-colors duration-300">
                <h3 className="text-2xl font-medium mb-2">Enterprise</h3>
                <div className="text-4xl font-bold mb-6">Custom</div>
                <p className="text-white/50 mb-8 border-b border-white/10 pb-8 flex-1">
                  For teams requiring strict compliance and sovereign deployment.
                </p>
                <ul className="space-y-4 text-sm font-light text-white/80 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> On-Premise Support
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> Managed HSMs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#bdf213]">✓</span> SLA & Team Scoping
                  </li>
                </ul>
                <button className="w-full py-3 rounded-full border border-white/20 hover:bg-white/5 transition-colors font-medium">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#222] px-10 lg:px-20 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#bdf213]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                 <polyline points="2 17 12 22 22 17"></polyline>
                 <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span className="text-lg font-bold tracking-tight text-white">HIVEMIND</span>
            </div>
            <div className="flex gap-8 text-sm text-white/40">
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">API Reference</a>
              <a href="#" className="hover:text-white transition-colors">Trust Center</a>
            </div>
            <div className="text-sm text-white/50 text-center md:text-right">
              Davinci AI Startup | Built in Europe, for the World.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Developers;
