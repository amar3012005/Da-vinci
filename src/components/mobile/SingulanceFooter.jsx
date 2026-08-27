import React from 'react';
import { Instagram, Linkedin, Twitter, Youtube, Github, MessageCircle, Apple, Play } from 'lucide-react';
import { HIVEMIND_URL, hivemindHref } from './hivemindLinks';

/**
 * SINGULANCE footer — Mistral footer layout, pixel-faithful, in the dark skin.
 * Four link columns with vertical dividers, a horizontal rule, then a bottom row:
 * social icons (left) + "Get HIVEMIND" + App Store / Google Play badges (right).
 */

const COLS = [
  {
    title: 'Products',
    links: [
      ['HIVEMIND', HIVEMIND_URL],
      ['TARA', '/products/tara'],
      ['HYPERAGENTS', hivemindHref('/app/employees')],
      ['Memory Graph', HIVEMIND_URL],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Solutions',
    links: [
      ['Sovereign Memory', '/products/hivemind'],
      ['Voice Agents', '/products/tara'],
      ['Agent Swarm', '/products/hyperagents'],
      ['Document AI', '/solutions/document-ai'],
      ['Custom Training', '/solutions/custom-model-training'],
      ['Finance', '/industry/finance'],
      ['Public Sector', '/industry/public-sector'],
      ['Manufacturing', '/industry/manufacturing'],
    ],
  },
  {
    title: 'Why SINGULANCE',
    links: [
      ['About us', '/about'],
      ['Careers', '/careers'],
      ['Partners', '/partners'],
      ['Our customers', '/customers'],
      ['Research', '/research'],
      ['Brand', '/brand'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Terms of Service', '/terms'],
      ['Privacy Policy', '/privacy'],
      ['Privacy choices', '/privacy'],
      ['Data processing agreement', '/legal'],
      ['Legal notice', '/legal'],
    ],
  },
];

const SOCIALS = [
  [Linkedin, 'https://linkedin.com/company/singulance-ai', 'LinkedIn'],
  [Twitter, 'https://x.com/singulanceai', 'X'],
  [Instagram, 'https://instagram.com/singulancelabs', 'Instagram'],
  [Youtube, 'https://youtube.com', 'YouTube'],
  [MessageCircle, 'https://discord.com', 'Discord'],
  [Github, 'https://github.com', 'GitHub'],
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
      {/* link columns — fallback anchor for nav's "Solutions" scroll-to on phone
          widths, where SubProducts (the real #solutions section) isn't mounted.
          Named distinctly (not "solutions") to avoid a duplicate id on wider
          viewports where SubProducts IS mounted — see MobileNavigation's
          handleNavClick fallback lookup. */}
      <div id="solutions-footer" className="mx-auto max-w-[1200px] px-6 py-16 md:py-20 scroll-mt-20">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-y-0">
          {COLS.map((col, i) => (
            <div key={col.title} className={i > 0 ? 'md:border-l md:border-white/8 md:pl-8' : 'md:pr-8'}>
              <h3 className="text-sm font-medium text-white/45">{col.title}</h3>
              <ul className="mt-6 space-y-4">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-[15px] text-white/80 no-underline transition-colors hover:text-white">
                      {label}
                    </a>
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
          <span className="text-sm text-white/45">Get HIVEMIND</span>
          <div className="flex gap-3">
            <StoreBadge icon={Apple} top="Download on the" big="App Store" />
            <StoreBadge icon={Play} top="Get it on" big="Google Play" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SingulanceFooter;
