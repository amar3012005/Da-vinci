import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Crosshair = ({ className = '' }) => (
  <div className={`absolute w-4 h-4 ${className}`}>
    <div className="absolute top-1/2 left-0 w-4 h-px bg-[#525252]/85 -translate-y-1/2" />
    <div className="absolute left-1/2 top-0 h-4 w-px bg-[#525252]/85 -translate-x-1/2" />
  </div>
);

const MeetTaraSection = () => {
  const fadeUp = {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  const stagger = (delay = 0) => ({
    ...fadeUp,
    transition: { duration: 0.5, delay },
  });

  return (
    <section
      id="meet-tara-section"
      className="min-h-screen bg-[#080808] relative overflow-hidden"
    >
      {/* Grid overlay lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-[#525252]/80" />
        <div className="absolute right-6 top-0 bottom-0 w-px bg-[#525252]/80" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        {/* 2-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left side -- Text content */}
          <div>
            <motion.p
              {...stagger(0)}
              className="text-[11px] font-mono text-[#E7E7ED]/45 uppercase tracking-widest mb-4"
            >
              [01] Meet TARA
            </motion.p>

            <motion.h2
              {...stagger(0.1)}
              className="text-4xl md:text-5xl font-light text-white leading-[0.9] font-['Montserrat'] mb-6"
            >
              Your AI-Powered{' '}
              <span className="italic font-serif">Assistant</span>
            </motion.h2>

            <motion.p
              {...stagger(0.2)}
              className="text-base text-[#9E9E9E] leading-relaxed mb-6 max-w-md"
            >
              TARA is an enterprise-grade AI assistant built on DA'VINCI
              infrastructure. She handles voice calls, visual processing, and
              real-time chat with sub-second latency and carrier-grade
              reliability.
            </motion.p>

            <motion.div
              {...stagger(0.3)}
              className="flex flex-wrap gap-2 mb-8"
            >
              {['Visual Co-Pilot', 'Telephony', 'Webcalls', 'Chat'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="bg-[#262626] text-[#E7E7ED]/65 py-1 px-4 text-sm"
                  >
                    {tag}
                  </span>
                )
              )}
            </motion.div>

            <motion.a
              {...stagger(0.4)}
              href="#"
              className="text-[#E7E7ED] text-base hover:text-[#0064FD] transition-colors inline-flex items-center gap-2"
            >
              Learn More <ArrowRight size={16} />
            </motion.a>
          </div>

          {/* Right side -- Visual / Metrics card */}
          <motion.div
            {...stagger(0.2)}
            className="relative bg-[#181818] border border-[#525252]/80 p-6"
          >
            {/* Corner crosshairs */}
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />

            <div className="flex flex-col items-center justify-center py-8 space-y-8">
              {/* DA'VINCI logo */}
              <img
                src="/images/davinci-logo.svg"
                alt="DA'VINCI"
                width={56}
                height={56}
                className="filter brightness-0 invert opacity-40"
              />

              {/* TARA_X1 logo */}
              <img
                src="/TARA_X1.svg"
                alt="TARA_X1"
                className="w-[220px] md:w-[300px] h-auto filter brightness-0 invert opacity-90"
              />

              {/* Metrics */}
              <div className="flex gap-12 items-center pt-4">
                <div className="text-center">
                  <div className="text-white text-xl font-light">99.9%</div>
                  <div className="text-[#676767] font-mono text-[10px] uppercase tracking-widest mt-1">
                    Uptime
                  </div>
                </div>
                <div className="w-px h-10 bg-[#525252]/80" />
                <div className="text-center">
                  <div className="text-white text-xl font-light">&lt;800ms</div>
                  <div className="text-[#676767] font-mono text-[10px] uppercase tracking-widest mt-1">
                    Latency
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom: 3-column feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 mt-16 border-t border-[#525252]/80">
          {[
            {
              title: 'Voice Intelligence',
              description:
                'Real-time speech processing with natural language understanding. Handles inbound and outbound calls with human-level conversation quality and instant context retrieval.',
            },
            {
              title: 'Visual Processing',
              description:
                'Multimodal perception pipeline that interprets screenshots, documents, and live video feeds. Acts as a visual co-pilot for complex workflows and decision-making.',
            },
            {
              title: 'Enterprise Ready',
              description:
                'SOC 2 compliant infrastructure with 99.9% uptime SLA. Role-based access, audit logging, and seamless integration with existing enterprise tool chains.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              {...stagger(0.1 * i)}
              className="relative pt-12 pb-8 px-6 hover:bg-white/[0.02] transition-colors"
            >
              {/* Gradient divider between cards */}
              {i > 0 && (
                <div className="hidden md:block absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#525252]/30 to-[#525252]" />
              )}
              <h3 className="text-[#E7E7ED] text-xl font-light mb-4">
                {feature.title}
              </h3>
              <p className="text-[#9E9E9E] text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MeetTaraSection;
