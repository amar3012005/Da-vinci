import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const StripedSeparator = () => (
  <div
    className="h-12 sm:h-16 w-full border-b border-[#e3e0db]"
    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
  />
);

const Features = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const solutions = [
    {
      icon: (
        <div className="w-32 h-32 relative">
          <div className="absolute inset-0 bg-[#117dff]/20 rounded-full blur-xl" style={{ transform: 'translate(10px, -10px)' }} />
          <div className="absolute inset-0 bg-[#117dff]/10 rounded-full blur-xl" style={{ transform: 'translate(-10px, 10px)' }} />
          <div className="absolute inset-4 bg-gradient-to-br from-[#117dff] to-[#0066e0] rounded-full opacity-60" />
        </div>
      ),
      title: 'Engineering',
      desc: 'Simplify code reviews, clarify architecture decisions, and enhance developer experiences with contextual memory.',
    },
    {
      icon: (
        <div className="bg-white border border-[#e3e0db] rounded-xl w-full max-w-[200px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#117dff] to-[#0066e0] border border-[#117dff]/20" />
            <div>
              <div className="text-[10px] font-semibold text-[#117dff]">AI Assistant</div>
              <div className="text-[9px] text-[#a3a3a3]">"Find that PR"</div>
            </div>
          </div>
          <div className="h-1.5 bg-[#f3f1ec] rounded-full w-3/4"></div>
        </div>
      ),
      title: 'Curated Context',
      desc: 'From junior devs to senior architects, our memory spans every persona, helping you build knowledgeable AI agents.',
    },
    {
      icon: (
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-24 border border-[#e3e0db] bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="w-6 h-8 bg-[#f3f1ec] rounded flex items-center justify-center text-[6px] text-[#a3a3a3]">Raw</div>
            <div className="absolute bottom-1 text-[6px] text-[#525252] font-medium">Input</div>
          </div>
          <span className="text-[8px] text-[#a3a3a3]">→</span>
          <div className="w-16 h-24 border border-[#117dff]/20 bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-1 shadow-[0_0_15px_rgba(17,125,255,0.08)]">
            <div className="w-6 h-6 bg-[#117dff]/[0.08] border border-[#117dff]/20 rounded-full flex items-center justify-center" />
            <div className="absolute bottom-1 text-[6px] text-[#117dff] w-full text-center font-medium">Insight</div>
          </div>
        </div>
      ),
      title: 'Knowledge Synthesis',
      desc: 'Instantly create contextual insights in seconds—or generate deep memory graphs, fine-tuned and tailored to your business.',
    },
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % 3);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + 3) % 3);

  return (
    <div id="features" className="bg-[#faf9f4] text-[#0a0a0a]">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">

        {/* Section 1: Context-savvy accuracy */}
        <section className="relative">
          <StripedSeparator />

          <div className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left Content */}
              <div className="space-y-4 sm:space-y-6">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight font-['Space_Grotesk']"
                >
                  Context-savvy accuracy<br />
                  <span className="text-[#a3a3a3]">for the real-world</span>
                </motion.h2>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/hivemind/login')}
                  className="px-5 py-2.5 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
                >
                  Try for free
                </motion.button>
              </div>

              {/* Right Content - Navigation arrows */}
              <div className="flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 text-[#525252]" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white"
                >
                  <ArrowRight className="w-4 h-4 text-[#525252]" />
                </motion.button>
              </div>
            </div>

            {/* Feature showcase with annotation lines */}
            <div className="mt-12 sm:mt-16 relative">
              {/* Number label */}
              <div className="text-[#a3a3a3] font-mono text-xs sm:text-sm mb-6">[02]</div>

              {/* Annotation line and label */}
              <div className="relative mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 sm:w-16 h-px bg-[#d4d0ca]"></div>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#a3a3a3] font-mono">Accurately Retrieved</span>
                </div>
              </div>

              {/* Large text with highlights - Smaller on mobile */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light leading-tight font-['Space_Grotesk']"
              >
                <span className="text-[#117dff]">"What was the deployment fix</span>{' '}
                <span className="text-[#d4d0ca]">from last Tuesday?"</span>
              </motion.div>

              {/* Bottom annotation */}
              <div className="flex justify-end mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#a3a3a3] font-mono text-right">3 Relevant Memories Found</span>
                  <div className="w-8 sm:w-12 h-px bg-[#d4d0ca]"></div>
                </div>
              </div>

              {/* Feature description - Stack on mobile */}
              <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 font-['Space_Grotesk']">Context-Aware Recall</h3>
                  <p className="text-[#525252] text-xs sm:text-sm leading-relaxed">
                    Retrieves contextually relevant memories based on your current task, not just keyword matches.
                  </p>
                </motion.div>
                <div className="flex justify-start md:justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 45 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center hover:bg-[#117dff]/[0.12] transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 text-[#117dff]" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Section 3: Powering agents across industries */}
        <section id="solutions" className="relative border-t border-[#e3e0db]">
          <StripedSeparator />

          <div className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16">
            <div className="text-center mb-10 sm:mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-6 lg:mb-8 font-['Space_Grotesk'] px-2"
              >
                Powering agents across<br />
                industries and personas
              </motion.h2>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/hivemind/login')}
                className="px-5 py-2.5 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
              >
                Build with HIVEMIND
              </motion.button>
            </div>

            {/* Three column grid - Swipeable on mobile */}
            <div className="relative">
              {/* Desktop/Tablet view */}
              <div className="hidden md:grid md:grid-cols-3 border-t border-[#e3e0db] divide-y md:divide-y-0 md:divide-x divide-[#e3e0db]">
                {solutions.map((sol, i) => (
                  <motion.div
                    key={sol.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 lg:p-8 pb-8 lg:pb-12 flex flex-col group"
                  >
                    <div className="h-[160px] lg:h-[200px] w-full mb-6 lg:mb-8 flex items-center justify-center relative">
                      {sol.icon}
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base lg:text-lg font-semibold font-['Space_Grotesk']">{sol.title}</h3>
                    </div>
                    <p className="text-[#525252] text-xs sm:text-sm leading-relaxed mb-6 lg:mb-8 flex-1">
                      {sol.desc}
                    </p>
                    <motion.button
                      whileHover={{ x: 4 }}
                      className="flex items-center text-xs sm:text-sm text-[#117dff] hover:text-[#0066e0] transition-colors group-hover:translate-x-1 duration-300 bg-transparent border-none cursor-pointer font-medium"
                    >
                      Learn more <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Mobile swipeable view */}
              <div className="md:hidden">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-[#e3e0db] p-6"
                >
                  <div className="h-[180px] w-full mb-6 flex items-center justify-center">
                    {solutions[currentSlide].icon}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold font-['Space_Grotesk']">{solutions[currentSlide].title}</h3>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={prevSlide}
                        className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors bg-white"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180 text-[#a3a3a3]" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={nextSlide}
                        className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors bg-white"
                      >
                        <ArrowRight className="w-4 h-4 text-[#a3a3a3]" />
                      </motion.button>
                    </div>
                  </div>
                  <p className="text-[#525252] text-sm leading-relaxed mb-6">
                    {solutions[currentSlide].desc}
                  </p>
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="flex items-center text-sm text-[#117dff] hover:text-[#0066e0] transition-colors bg-transparent border-none cursor-pointer font-medium"
                  >
                    Learn more <ArrowRight className="w-4 h-4 ml-1" />
                  </motion.button>

                  {/* Dots indicator */}
                  <div className="flex justify-center gap-2 mt-6">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentSlide ? 'bg-[#117dff] w-6' : 'bg-[#d4d0ca]'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
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
