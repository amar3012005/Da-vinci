import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Globe2 } from 'lucide-react';

const Features = () => {
  return (
    <div className="bg-[#111] text-white">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#222]">
        
        {/* Section 1: Context-savvy accuracy */}
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
                  Context-savvy accuracy<br />
                  <span className="text-white/40">for the real-world</span>
                </h2>
                <button className="px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-colors">
                  Try for free
                </button>
              </div>

              {/* Right Content - Navigation arrows */}
              <div className="flex justify-end gap-3">
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Feature showcase with annotation lines */}
            <div className="mt-20 relative">
              {/* Number label */}
              <div className="text-white/30 font-mono text-sm mb-8">[02]</div>
              
              {/* Annotation line and label */}
              <div className="relative mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-px bg-white/30"></div>
                  <span className="text-xs uppercase tracking-widest text-white/50">Accurately Retrieved</span>
                </div>
              </div>

              {/* Large text with highlights */}
              <div className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight">
                <span className="text-[#bdf213]">Should I review again what I analyzed</span>{' '}
                <span className="text-white/30">yesterday?</span>
              </div>

              {/* Bottom annotation */}
              <div className="flex justify-end mt-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest text-white/30">Distinguishes Context</span>
                  <div className="w-16 h-px bg-white/20"></div>
                </div>
              </div>

              {/* Feature description */}
              <div className="mt-16 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-medium mb-3">Heteronyms</h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Retrieves contextually relevant memories based on your current task, not just keyword matches.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Speed/Latency */}
        <section className="relative border-t border-[#222]">
          {/* Vertical striped separator */}
          <div 
            className="h-20 w-full border-b border-[#222]" 
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
          />

          <div className="px-10 lg:px-20 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 mb-20">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
                  HIVEMIND responds faster<br />
                  than you can blink
                </h2>
                <div className="flex items-center gap-2">
                  <button className="px-5 py-2.5 rounded-full bg-white/10 text-sm font-medium border border-white/10">
                    Human speed
                  </button>
                  <button className="px-5 py-2.5 rounded-full border border-white/10 text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                    Competitive advantage
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-lg font-light text-white/60 leading-relaxed max-w-md">
                  At #1, HIVEMIND sets the standard for ultra-low latency memory retrieval. It's contextual AI that's fast, fluid—and virtually human.
                </p>
                <button className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors">
                  Try for free
                </button>
              </div>
            </div>

            {/* Speed visualization */}
            <div className="grid lg:grid-cols-2 gap-8 mb-24 relative">
              {/* Left side - Arc visualization */}
              <div className="h-[300px] relative flex items-center justify-center">
                <div className="relative w-full max-w-[400px]">
                  {/* Arc bars */}
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="h-16 rounded-full bg-gradient-to-r from-transparent via-[#bdf213]/30 to-[#bdf213] flex items-center justify-end pr-6" style={{ width: '40%' }}>
                        <span className="text-sm font-medium text-white">40ms</span>
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-white/60"></div>
                        <span className="text-sm text-white/60">HIVEMIND</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-16 rounded-full bg-gradient-to-r from-transparent via-white/10 to-white/30 flex items-center justify-end pr-6" style={{ width: '70%' }}>
                        <span className="text-sm font-medium text-white/60">100ms</span>
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4">
                        <span className="text-sm text-white/40">Blink of an eye</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-16 rounded-full bg-gradient-to-r from-transparent via-white/5 to-white/20 flex items-center justify-end pr-6" style={{ width: '90%' }}>
                        <span className="text-sm font-medium text-white/40">150ms</span>
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4">
                        <span className="text-sm text-white/30">Human conversational threshold</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Labels */}
              <div className="flex flex-col justify-center space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#bdf213]"></div>
                  <span className="text-white/60">HIVEMIND Core</span>
                </div>
                <div className="h-px bg-white/10 w-full"></div>
                <div className="text-white/40">Sub-50ms retrieval</div>
                <div className="h-px bg-white/10 w-full"></div>
                <div className="text-white/30">Edge cached responses</div>
              </div>
            </div>

            {/* Three column features */}
            <div className="grid md:grid-cols-3 gap-8 pt-10 border-t border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5v14M7 5v14M22 9v6M2 9v6" />
                  </svg>
                  <h4 className="font-medium text-sm">Real-time responses</h4>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">
                  Speed designed for real-time interactions means conversations feel seamless, not laggy.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe2 className="w-4 h-4 text-white/60" />
                  <h4 className="font-medium text-sm">Proven at scale, worldwide</h4>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">
                  From Frankfurt to Tokyo, HIVEMIND leads in latency at P50 to P99 consistently and reliably.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <h4 className="font-medium text-sm">Performance budget</h4>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">
                  Low-latency memory retrieval creates affordances across the rest of your AI stack.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Powering agents across industries */}
        <section className="relative border-t border-[#222]">
          {/* Vertical striped separator */}
          <div 
            className="h-20 w-full border-b border-[#222]" 
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
          />

          <div className="px-10 lg:px-20 py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8">
                Powering agents across<br />
                industries and personas
              </h2>
              <button className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors">
                Build with HIVEMIND
              </button>
            </div>

            {/* Three column grid */}
            <div className="grid md:grid-cols-3 border-t border-[#222] divide-y md:divide-y-0 md:divide-x divide-[#222]">
              {/* Column 1 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center relative">
                  <div className="w-32 h-32 relative">
                    <div className="absolute inset-0 bg-[#4f00ff]/40 rounded-full blur-xl mix-blend-screen" style={{ transform: 'translate(10px, -10px)' }} />
                    <div className="absolute inset-0 bg-[#bdf213]/30 rounded-full blur-xl mix-blend-screen" style={{ transform: 'translate(-10px, 10px)' }} />
                    <div className="absolute inset-4 bg-gradient-to-br from-[#4f00ff] to-[#bdf213] rounded-full opacity-60" />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Engineering</h3>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-8 flex-1">
                  Simplify code reviews, clarify architecture decisions, and enhance developer experiences with contextual memory.
                </p>
                <a href="#" className="flex items-center text-sm text-white/70 hover:text-white transition-colors group-hover:translate-x-1 duration-300">
                  Learn more <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </div>

              {/* Column 2 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center">
                  <div className="bg-[#1a1a1c] border border-white/10 rounded-2xl w-full max-w-[240px] p-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f00ff] to-indigo-900 border border-white/10" />
                      <div>
                        <div className="text-xs font-medium text-[#bdf213]">AI Assistant</div>
                        <div className="text-xs text-white/50">"Find that PR from last week"</div>
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full w-3/4"></div>
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-4">Curated context for teams</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-8 flex-1">
                  From junior devs to senior architects, our memory spans every persona, helping you build knowledgeable and engaging AI agents.
                </p>
              </div>

              {/* Column 3 */}
              <div className="p-8 pb-12 flex flex-col group">
                <div className="h-[200px] w-full mb-8 flex items-center justify-center gap-3">
                  <div className="w-20 h-28 border border-[#4f00ff]/30 bg-[#16161a] rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-2">
                    <div className="w-8 h-10 bg-white/5 rounded flex items-center justify-center text-[8px] text-white/30">Raw</div>
                    <div className="absolute bottom-2 text-[8px] text-[#4f00ff]">Input</div>
                  </div>
                  <span className="text-[10px] text-white/40">→</span>
                  <div className="w-20 h-28 border border-[#bdf213]/30 bg-[#16161a] rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-2 shadow-[0_0_15px_rgba(189,242,19,0.1)]">
                    <div className="w-8 h-10 bg-[#bdf213]/10 border border-[#bdf213]/20 rounded-full flex items-center justify-center" />
                    <div className="absolute bottom-2 text-[8px] text-[#bdf213] w-full text-center">Insight</div>
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-4">Instant Knowledge Synthesis</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-8 flex-1">
                  Instantly create contextual insights in seconds—or generate deep memory graphs, fine-tuned and tailored to your business.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom vertical striped separator */}
          <div 
            className="h-20 w-full border-t border-[#222]" 
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
          />
        </section>

      </div>
    </div>
  );
};

export default Features;
