import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, t } from './ThemeContext';

const ShieldIcon = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const GlobeIcon = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LockIcon = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SolutionEnterprise = () => {
  const { isDark } = useTheme();
  const c = t(isDark);

  const features = [
    { title: 'Sovereign Hosting', desc: 'EU data centers, GDPR compliant by design' },
    { title: 'Custom Integration', desc: 'Connect to your existing tools and workflows' },
    { title: 'Managed Platform', desc: 'We handle infrastructure, you handle innovation' },
  ];

  const iconColor = isDark ? '#E7E7ED' : '#0a0a0a';

  const complianceRows = [
    { Icon: ShieldIcon, label: 'SOC 2 Compliant' },
    { Icon: GlobeIcon, label: 'EU Data Residency' },
    { Icon: LockIcon, label: 'End-to-End Encryption' },
  ];

  return (
    <section className={`${c.bg} border-t ${c.border}`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border} px-6 md:px-10 lg:px-20 py-20 lg:py-32`}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className={`text-xs font-mono uppercase tracking-widest ${c.textMuted} mb-4`}>
              Solutions / 03
            </p>
            <h2 className={`text-4xl md:text-5xl font-bold tracking-tight leading-tight ${c.text} font-['Space_Grotesk'] mb-6`}>
              <span className={c.accent}>Enterprise</span>
              <br />
              Deployment
            </h2>
            <p className={`text-lg ${c.textSecondary} leading-relaxed mb-6`}>
              Deploy sovereign AI infrastructure on your terms. Full control over data residency, compliance, and operational policies with Da Vinci's managed platform.
            </p>

            <div className="space-y-0">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <span className={`w-1.5 h-1.5 mt-2 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} shrink-0`} />
                  <p className={`text-sm ${c.textSecondary} leading-relaxed`}>
                    <span className={`${c.text} font-medium`}>{f.title}</span> — {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Visual card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          >
            <div className={`${c.bgCard} border ${c.border} p-8 ${c.shadow}`}>
              {complianceRows.map(({ Icon, label }, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-3 ${
                    i < complianceRows.length - 1 ? `border-b ${c.border}` : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 ${isDark ? 'bg-[#1a1a1a]' : 'bg-black/[0.04]'} flex items-center justify-center`}
                  >
                    <Icon color={iconColor} />
                  </div>
                  <span className={`${c.text} text-sm font-medium`}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SolutionEnterprise;
