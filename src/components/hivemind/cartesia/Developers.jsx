import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Layers, Code2, Shield, ArrowRight } from 'lucide-react';

const StripedSeparator = () => (
  <div
    className="h-12 sm:h-16 w-full border-b border-[#e3e0db]"
    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
  />
);

const BentoCard = ({ title, children, highlight }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={`rounded-xl border p-4 sm:p-6 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
      highlight
        ? 'border-[#117dff]/20 shadow-[0_0_20px_rgba(17,125,255,0.08)]'
        : 'border border-[#e3e0db]'
    }`}
  >
    <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#a3a3a3] font-mono mb-3 sm:mb-4">{title}</div>
    <div className="flex-1 flex items-center justify-center">{children}</div>
  </motion.div>
);

const Developers = () => {
  const navigate = useNavigate();
  const [activeBento, setActiveBento] = useState(0);

  const bentoCards = [
    {
      title: 'Compliance',
      content: (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#117dff]/20 flex items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#117dff]/30 flex items-center justify-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#117dff]/[0.15]"></div>
          </div>
        </div>
      ),
    },
    {
      title: 'Playground',
      content: (
        <div className="flex flex-col gap-2 w-full">
          <div className="bg-[#faf9f4] rounded-lg p-3 border border-[#e3e0db] flex-1">
            <div className="flex gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-[#e3e0db] rounded w-3/4"></div>
              <div className="h-1.5 bg-[#e3e0db] rounded w-1/2"></div>
            </div>
          </div>
          <div className="bg-[#faf9f4] rounded-lg p-3 border border-[#e3e0db] flex-1">
            <div className="flex gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#e3e0db]"></div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-[#e3e0db] rounded w-2/3"></div>
              <div className="h-1.5 bg-[#e3e0db] rounded w-4/5"></div>
            </div>
          </div>
        </div>
      ),
      tall: true,
    },
    {
      title: 'API',
      content: (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${i % 3 === 0 ? 'bg-[#117dff]/30' : 'bg-[#e3e0db]'}`}
            ></div>
          ))}
        </div>
      ),
    },
    {
      title: 'SDK',
      content: (
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border border-[#117dff]/30 rotate-45 rounded-md"></div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 border border-[#117dff]/20 rotate-45 rounded-md absolute top-1.5 sm:top-2 left-1.5 sm:left-2"></div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 border border-[#117dff]/10 rotate-45 rounded-md absolute top-3 sm:top-4 left-1.5 sm:left-3"></div>
        </div>
      ),
      highlight: true,
    },
    {
      title: 'Security',
      content: (
        <div className="relative">
          <div className="w-20 h-10 sm:w-24 sm:h-12 border border-[#e3e0db] rounded-t-full"></div>
          <div className="w-16 h-8 sm:w-20 sm:h-10 border border-[#e3e0db] rounded-t-full absolute top-1.5 sm:top-2 left-1.5 sm:left-2"></div>
          <div className="w-12 h-6 sm:w-16 sm:h-8 border border-[#eae7e1] rounded-t-full absolute top-3 sm:top-4 left-2 sm:left-4"></div>
        </div>
      ),
    },
  ];

  return (
    <div id="developers" className="bg-[#faf9f4] text-[#0a0a0a]">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">

        {/* Developer-first section */}
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
                  Developer-first,<br />
                  <span className="text-[#a3a3a3]">enterprise-ready</span>
                </motion.h2>
                <p className="text-sm sm:text-base text-[#525252] leading-relaxed">
                  HIVEMIND is built for rapid prototyping and seamless integration. Developers trust it for secure, compliant, production-ready performance.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/hivemind/login')}
                  className="px-5 py-2.5 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors text-xs sm:text-sm uppercase tracking-[0.075em] cursor-pointer border-none shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
                >
                  Build with HIVEMIND
                </motion.button>

                {/* Feature list */}
                <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
                  {[
                    { icon: Cpu, title: 'API', desc: 'REST API and MCP Protocol — integrate HIVEMIND directly into your product with simple, well-documented endpoints.' },
                    { icon: Layers, title: 'SDK', desc: 'JavaScript SDK available now, Python SDK coming soon. Plus Knowledge Base Upload and Gmail Connector built-in.' },
                    { icon: Code2, title: 'Playground', desc: 'Experiment with real memory interactions instantly in your browser. Test queries, customize your context, and see results in real time.' },
                  ].map((feature) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-[#e3e0db]"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#117dff]" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-1 font-['Space_Grotesk']">{feature.title}</h3>
                        <p className="text-[#525252] text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Enterprise Grade */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3 sm:gap-4"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#e3e0db] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#117dff]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 font-['Space_Grotesk']">Enterprise Grade</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {['GDPR Compliant', 'EU Data Residency', 'ISO 27001 Ready', 'Reliable uptime'].map((cert) => (
                          <div key={cert} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#525252]">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-[#117dff]/[0.08] flex items-center justify-center">
                              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#117dff]" />
                            </div>
                            {cert}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right Content - Bento Grid */}
              <div>
                {/* Desktop: Full bento grid */}
                <div className="hidden lg:grid grid-cols-2 gap-4">
                  <BentoCard title="Compliance">{bentoCards[0].content}</BentoCard>
                  <BentoCard title="Playground">{bentoCards[1].content}</BentoCard>
                  <BentoCard title="API">{bentoCards[2].content}</BentoCard>
                  <BentoCard title="SDK" highlight>{bentoCards[3].content}</BentoCard>
                  <BentoCard title="Security">{bentoCards[4].content}</BentoCard>
                </div>

                {/* Mobile/Tablet: Swipeable bento */}
                <div className="lg:hidden">
                  <motion.div
                    key={activeBento}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-xl border border-[#e3e0db] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase tracking-widest text-[#a3a3a3] font-mono">
                        {['Compliance', 'Playground', 'API', 'SDK', 'Security'][activeBento]}
                      </span>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveBento((p) => (p - 1 + 5) % 5)}
                          className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 rotate-180 text-[#a3a3a3]" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActiveBento((p) => (p + 1) % 5)}
                          className="w-8 h-8 rounded-lg border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 text-[#a3a3a3]" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="h-48 sm:h-56 flex items-center justify-center">
                      {bentoCards[activeBento].content}
                    </div>
                  </motion.div>

                  {/* Dots indicator */}
                  <div className="flex justify-center gap-2 mt-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <button
                        key={i}
                        onClick={() => setActiveBento(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === activeBento ? 'bg-[#117dff] w-6' : 'bg-[#d4d0ca] w-2'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#e3e0db] px-4 sm:px-8 lg:px-16 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#117dff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">HIVEMIND</span>
            </div>
            <div className="flex gap-6 sm:gap-8 text-xs sm:text-sm text-[#a3a3a3]">
              {['Documentation', 'API Reference', 'Trust Center'].map((item) => (
                <button
                  key={item}
                  onClick={() => navigate('/hivemind/app/connectors')}
                  className="hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="text-xs sm:text-sm text-[#a3a3a3] text-center md:text-right">
              Davinci AI Startup | Built in Europe, for the World.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Developers;
