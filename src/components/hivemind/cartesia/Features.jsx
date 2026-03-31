import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const StripedSeparator = () => (
  <div
    className="h-16 w-full border-b border-[#e3e0db]"
    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
  />
);

const Features = () => {
  const navigate = useNavigate();
  return (
    <div id="features" className="bg-[#faf9f4] text-[#0a0a0a]">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">

        {/* Section 1: Context-savvy accuracy */}
        <section className="relative">
          <StripedSeparator />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left Content */}
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-['Space_Grotesk']">
                  Context-savvy accuracy<br />
                  <span className="text-[#a3a3a3]">for the real-world</span>
                </h2>
                <button onClick={() => navigate('/hivemind/login')} className="px-6 py-3 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-sm uppercase tracking-[0.075em]">
                  Try for free
                </button>
              </div>

              {/* Right Content - Navigation arrows */}
              <div className="flex justify-end gap-3">
                <button className="w-12 h-12 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white">
                  <ArrowRight className="w-5 h-5 rotate-180 text-[#525252]" />
                </button>
                <button className="w-12 h-12 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white">
                  <ArrowRight className="w-5 h-5 text-[#525252]" />
                </button>
              </div>
            </div>

            {/* Feature showcase with annotation lines */}
            <div className="mt-20 relative">
              {/* Number label */}
              <div className="text-[#a3a3a3] font-mono text-sm mb-8">[02]</div>

              {/* Annotation line and label */}
              <div className="relative mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-px bg-[#d4d0ca]"></div>
                  <span className="text-xs uppercase tracking-widest text-[#a3a3a3] font-mono">Accurately Retrieved</span>
                </div>
              </div>

              {/* Large text with highlights */}
              <div className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight font-['Space_Grotesk']">
                <span className="text-[#117dff]">"What was the deployment fix</span>{' '}
                <span className="text-[#d4d0ca]">from last Tuesday?"</span>
              </div>

              {/* Bottom annotation */}
              <div className="flex justify-end mt-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest text-[#a3a3a3] font-mono">3 Relevant Memories Found</span>
                  <div className="w-16 h-px bg-[#d4d0ca]"></div>
                </div>
              </div>

              {/* Feature description */}
              <div className="mt-16 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3 font-['Space_Grotesk']">Context-Aware Recall</h3>
                  <p className="text-[#525252] text-sm leading-relaxed">
                    Retrieves contextually relevant memories based on your current task, not just keyword matches.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button className="w-14 h-14 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center hover:bg-[#117dff]/[0.12] transition-colors">
                    <ArrowRight className="w-5 h-5 text-[#117dff]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Section 3: Powering agents across industries */}
        <section id="solutions" className="relative border-t border-[#e3e0db]">
          <StripedSeparator />

          <div className="px-10 lg:px-20 py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 font-['Space_Grotesk']">
                Powering agents across<br />
                industries and personas
              </h2>
              <button onClick={() => navigate('/hivemind/login')} className="px-6 py-3 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-sm uppercase tracking-[0.075em]">
                Build with HIVEMIND
              </button>
            </div>

            {/* Three column grid */}
            <div className="grid md:grid-cols-3 border-t border-[#e3e0db] divide-y md:divide-y-0 md:divide-x divide-[#e3e0db]">
              {/* Column 1 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center relative">
                  <div className="w-32 h-32 relative">
                    <div className="absolute inset-0 bg-[#117dff]/20 rounded-full blur-xl" style={{ transform: 'translate(10px, -10px)' }} />
                    <div className="absolute inset-0 bg-[#117dff]/10 rounded-full blur-xl" style={{ transform: 'translate(-10px, 10px)' }} />
                    <div className="absolute inset-4 bg-gradient-to-br from-[#117dff] to-[#0066e0] rounded-full opacity-60" />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold font-['Space_Grotesk']">Engineering</h3>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors bg-white">
                      <ArrowRight className="w-4 h-4 rotate-180 text-[#a3a3a3]" />
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors bg-white">
                      <ArrowRight className="w-4 h-4 text-[#a3a3a3]" />
                    </button>
                  </div>
                </div>
                <p className="text-[#525252] text-sm leading-relaxed mb-8 flex-1">
                  Simplify code reviews, clarify architecture decisions, and enhance developer experiences with contextual memory.
                </p>
                <button className="flex items-center text-sm text-[#117dff] hover:text-[#0066e0] transition-colors group-hover:translate-x-1 duration-300 bg-transparent border-none cursor-pointer font-medium">
                  Learn more <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              {/* Column 2 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center">
                  <div className="bg-white border border-[#e3e0db] rounded-xl w-full max-w-[240px] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#117dff] to-[#0066e0] border border-[#117dff]/20" />
                      <div>
                        <div className="text-xs font-semibold text-[#117dff]">AI Assistant</div>
                        <div className="text-xs text-[#a3a3a3]">"Find that PR from last week"</div>
                      </div>
                    </div>
                    <div className="h-2 bg-[#f3f1ec] rounded-full w-3/4"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-4 font-['Space_Grotesk']">Curated context for teams</h3>
                <p className="text-[#525252] text-sm leading-relaxed mb-8 flex-1">
                  From junior devs to senior architects, our memory spans every persona, helping you build knowledgeable and engaging AI agents.
                </p>
              </div>

              {/* Column 3 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center gap-3">
                  <div className="w-20 h-28 border border-[#e3e0db] bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="w-8 h-10 bg-[#f3f1ec] rounded flex items-center justify-center text-[8px] text-[#a3a3a3]">Raw</div>
                    <div className="absolute bottom-2 text-[8px] text-[#525252] font-medium">Input</div>
                  </div>
                  <span className="text-[10px] text-[#a3a3a3]">&rarr;</span>
                  <div className="w-20 h-28 border border-[#117dff]/20 bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-2 shadow-[0_0_15px_rgba(17,125,255,0.08)]">
                    <div className="w-8 h-10 bg-[#117dff]/[0.08] border border-[#117dff]/20 rounded-full flex items-center justify-center" />
                    <div className="absolute bottom-2 text-[8px] text-[#117dff] w-full text-center font-medium">Insight</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-4 font-['Space_Grotesk']">Instant Knowledge Synthesis</h3>
                <p className="text-[#525252] text-sm leading-relaxed mb-8 flex-1">
                  Instantly create contextual insights in seconds—or generate deep memory graphs, fine-tuned and tailored to your business.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom separator */}
          <StripedSeparator />
        </section>

      </div>
    </div>
  );
};

export default Features;
