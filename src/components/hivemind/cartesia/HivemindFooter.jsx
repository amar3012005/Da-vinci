import React from 'react';
import { ArrowUpRight, Github, Linkedin, Mail } from 'lucide-react';

const groups = [
  {
    title: 'Operating system',
    links: [
      ['BRAIN', '#chapter-1'],
      ['HYPERAGENTS', '#chapter-5'],
      ['VOICE', '#chapter-6'],
      ['Pricing', '#pricing'],
    ],
  },
  {
    title: 'Research',
    links: [
      ['Research library', '/research'],
      ['ICARUS', '/research/icarus'],
      ['Swarm intelligence', '/research/cognitive-swarm-intelligence'],
      ['Benchmark', '/benchmark'],
    ],
  },
  {
    title: 'Build',
    links: [
      ['Documentation', '/hivemind/docs'],
      ['Developer tools', '#developers'],
      ['Connectors', '/hivemind/app/connectors'],
      ['Open HIVEMIND', '/hivemind/login'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Careers', '/careers'],
      ['Partners', '/partners'],
      ['Contact', 'mailto:support@singulancelabs.com'],
    ],
  },
];

const legal = [
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Cookies', '/cookies'],
  ['Legal notice', '/legal'],
];

const FooterLink = ({ href, children }) => (
  <a href={href} className="group inline-flex items-center gap-1.5 text-[13px] text-[#A8A5A0] no-underline transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#75B7FF]">
    {children}
    <ArrowUpRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
  </a>
);

export default function HivemindFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0A0A0A] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{
        backgroundImage: 'radial-gradient(rgba(117,183,255,.8) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        maskImage: 'linear-gradient(to bottom, black, transparent 62%)',
      }} />
      <div className="relative mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-16 lg:py-24">
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <img src="/singulance-mark.svg" alt="" className="h-9 w-9 rounded-[9px]" />
              <span className="font-['Space_Grotesk'] text-[18px] font-semibold tracking-[.12em]">SINGULANCE</span>
            </div>
            <h2 className="mt-10 max-w-3xl font-['Space_Grotesk'] text-[clamp(2.7rem,7vw,6.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
              Your company.<br /><span className="text-[#75B7FF]">One intelligent system.</span>
            </h2>
          </div>

          <div className="border-l border-white/15 pl-5 sm:pl-7">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-[#77746E]">Talk to SINGULANCE</p>
            <a href="mailto:support@singulancelabs.com" className="mt-4 block break-all font-['Space_Grotesk'] text-[21px] font-medium text-white no-underline hover:text-[#75B7FF] sm:text-[26px]">support@singulancelabs.com</a>
            <a href="mailto:research@singulancelabs.com?subject=HIVEMIND%20research%20request" className="mt-3 inline-flex items-center gap-2 text-[13px] text-[#A8A5A0] no-underline hover:text-white"><Mail size={15} /> Request a research briefing</a>
            <p className="mt-5 max-w-md text-[12px] leading-relaxed text-[#77746E]">Product questions, enterprise deployment, partnerships, research and technical evaluation.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-4">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="font-mono text-[9px] uppercase tracking-[.18em] text-[#77746E]">{group.title}</h3>
              <ul className="mt-5 space-y-3.5">
                {group.links.map(([label, href]) => <li key={label}><FooterLink href={href}>{label}</FooterLink></li>)}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-7 border-t border-white/10 pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#77746E]">Sovereign operating intelligence</p>
            <p className="mt-2 text-[12px] text-[#A8A5A0]">Built in Europe · EU-hosted · Self-hostable · BYOK</p>
          </div>

          <div className="flex items-center gap-3">
            <a href="https://linkedin.com/company/singulance-ai" target="_blank" rel="noreferrer" aria-label="SINGULANCE on LinkedIn" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#A8A5A0] transition-colors hover:border-[#75B7FF] hover:text-white"><Linkedin size={17} /></a>
            <a href="https://x.com/singulanceai" target="_blank" rel="noreferrer" aria-label="SINGULANCE on X" className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/15 px-3 font-mono text-[12px] text-[#A8A5A0] no-underline transition-colors hover:border-[#75B7FF] hover:text-white">X</a>
            <a href="https://github.com/amar3012005/HIVEMIND" target="_blank" rel="noreferrer" aria-label="HIVEMIND on GitHub" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#A8A5A0] transition-colors hover:border-[#75B7FF] hover:text-white"><Github size={17} /></a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-[10px] text-[#77746E] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SINGULANCE Labs. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map(([label, href]) => <a key={label} href={href} className="text-[#77746E] no-underline hover:text-white">{label}</a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
