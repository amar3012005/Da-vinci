import React from 'react';
import { Instagram, Linkedin, Twitter, ArrowUpRight } from 'lucide-react';
import { HIVEMIND_URL, hivemindHref } from './hivemindLinks';
import { openCookiePreferences } from '../../privacy/consent';

/**
 * SINGULANCE footer — Mistral footer layout, pixel-faithful, in the dark skin.
 * Four link columns with vertical dividers, a horizontal rule, then a bottom row:
 * social icons (left) + "Get HIVEMIND" + App Store / Google Play badges (right).
 */

const COLS = [
  { title: 'Products', links: [['HIVEMIND', HIVEMIND_URL], ['Voice', hivemindHref('/app/tara')], ['HyperAgents', hivemindHref('/app/employees')], ['Pricing', 'https://next.singulancelabs.com/#pricing']] },
  { title: 'Research', links: [['All research', '/research'], ['ICARUS', '/research/icarus'], ['Cognitive Swarm Intelligence', '/research/cognitive-swarm-intelligence'], ['Post-Quantum Cryptography', '/research/post-quantum-cryptography'], ['Memory benchmarks', '/benchmark']] },
  { title: 'Company', links: [['Contact', 'mailto:enterprise@singulancelabs.com'], ['Talk to founder', 'https://cal.com/amar-sai-gadde-eluoct/30min']] },
  { title: 'Trust', links: [['Security', '/security'], ['Privacy Policy', '/privacy'], ['Cookie Policy', '/cookies']] },
];

const SOCIALS = [
  [Linkedin, 'https://linkedin.com/company/singulance-ai', 'LinkedIn'],
  [Twitter, 'https://x.com/singulanceai', 'X'],
  [Instagram, 'https://instagram.com/singulancelabs', 'Instagram'],
];

const StoreBadge = ({ icon: Icon, top, big }) => (
  <a
    href={HIVEMIND_URL}
    className="flex items-center gap-2.5 rounded-lg bg-black px-4 py-2 no-underline ring-1 ring-white/15 transition-colors hover:ring-white/30"
  >
    <Icon size={22} className="text-white" />
    <span className="flex flex-col leading-tight text-white">
      <span className="text-[9px] font-light uppercase tracking-wide text-white/70">{top}</span>
      <span className="text-sm font-semibold">{big}</span>
    </span>
  </a>
);

const SingulanceFooter = () => {
  return (
    <footer className="relative" style={{ background: '#05070f' }}>
      <h2 className="sr-only">Explore SINGULANCE</h2>
      {/* link columns — fallback anchor for nav's "Solutions" scroll-to on phone
          widths, where SubProducts (the real #solutions section) isn't mounted.
          Named distinctly (not "solutions") to avoid a duplicate id on wider
          viewports where SubProducts IS mounted — see MobileNavigation's
          handleNavClick fallback lookup. */}
      <div id="solutions-footer" className="mx-auto max-w-[1200px] px-6 py-16 md:py-20 scroll-mt-20">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-y-0">
          {COLS.map((col, i) => (
            <div key={col.title} className={i > 0 ? 'md:border-l md:border-white/8 md:pl-8' : 'md:pr-8'}>
              <h3 className="text-sm font-medium text-white/65">{col.title}</h3>
              <ul className="mt-6 space-y-4">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {label === 'Cookie Policy' ? <><a href={href} className="text-[15px] text-white/80 no-underline transition-colors hover:text-white">{label}</a><button type="button" onClick={openCookiePreferences} className="mt-4 block text-left text-[15px] text-white/80 transition-colors hover:text-white">Privacy choices</button></> : <a href={href} className="text-[15px] text-white/80 no-underline transition-colors hover:text-white">{label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* divider */}
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="h-px w-full bg-white/8" />
      </div>

      {/* bottom row — fallback anchor for nav's "Contact" scroll-to on phone
          widths, where MobileAboutSection (the real #cta-section) isn't
          mounted. Named distinctly to avoid a duplicate id on wider viewports. */}
      <div id="cta-section-footer" className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-10 scroll-mt-20 md:flex-row md:items-center md:justify-between">
        {/* socials */}
        <div className="flex items-center gap-5">
          {SOCIALS.map(([Icon, href, label]) => (
            <a key={label} href={href} aria-label={label} className="text-white/60 transition-colors hover:text-white">
              <Icon size={20} />
            </a>
          ))}
        </div>

        {/* get app */}
        <div className="flex flex-col items-start gap-3 md:items-end">
          <span className="text-sm text-white/65">Get HIVEMIND</span>
          <div className="flex gap-3">
            <StoreBadge icon={ArrowUpRight} top="Your AI workspace" big="Open HIVEMIND" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SingulanceFooter;
