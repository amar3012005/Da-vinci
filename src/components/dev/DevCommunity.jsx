import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, BookOpen, Check, Github, GraduationCap, Loader2, LogIn, Mail, MessageSquare, Plus, Rocket,
  Search, Trash2, Wrench,
} from 'lucide-react';
import apiClient from '../hivemind/app/shared/api-client';
import EmailTurnstile from '../hivemind/app/auth/EmailTurnstile';
import CopyBlock from '../icarus/CopyBlock';
import { GITHUB, ICARUS_INSTALL, PRODUCTS } from '../icarus/products';
import { CHANNELS, ROLES, devApi, errorMessage, timeAgo } from './dev-api';

/**
 * dev.singulancelabs.com — the SINGULANCE developer community. Members sign in with their
 * SINGULANCE identity, keep a public profile, use the open ICARUS tools and research, and
 * talk in the forum. Community data lives in the hivemind-web Worker (cloudflare/dev-community.mjs).
 */
const ORIGIN = 'https://dev.singulancelabs.com';
// Flip once Core can admit brand-new identities from this origin (HIVEMIND PR #756 released).
const BROWSER_SIGNUP = false;
const INK = '#0a0a0a';
const PAPER = '#FBFBF8';
const BORDER = '#E4E3DE';
const EMBER = '#FF5229';
const MUTED = '#525252';

const RESEARCH = [
  { title: 'ICARUS: the .amr memory filesystem', href: 'https://singulancelabs.com/research/icarus', tag: 'Memory' },
  { title: 'Cognitive Swarm Intelligence', href: 'https://singulancelabs.com/research/cognitive-swarm-intelligence', tag: 'Architecture' },
  { title: 'Runtime: intelligence with continuity', href: 'https://singulancelabs.com/research/runtime', tag: 'Agents' },
  { title: 'Post-Quantum Cryptography', href: 'https://singulancelabs.com/research/post-quantum-cryptography', tag: 'Security' },
  { title: '87.2% on LongMemEval', href: 'https://singulancelabs.com/benchmark', tag: 'Benchmark' },
];

const Session = createContext(null);
const useSession = () => useContext(Session);

function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, signedIn: false, email: null, member: null, error: false });
  const refresh = useCallback(async () => {
    try {
      const me = await devApi.me();
      setState({ loading: false, error: false, ...me });
    } catch {
      setState({ loading: false, signedIn: false, email: null, member: null, error: true });
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo(() => ({ ...state, refresh, setMember: (member) => setState((s) => ({ ...s, member })) }), [state, refresh]);
  return <Session.Provider value={value}>{children}</Session.Provider>;
}

const Mark = () => (
  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black font-['Space_Grotesk'] text-[13px] font-bold text-white">S</span>
);

function Nav({ dark = false }) {
  const session = useSession();
  const link = ({ isActive }) => `text-[13px] font-medium transition-colors ${isActive ? (dark ? 'text-white' : 'text-black') : (dark ? 'text-white/60 hover:text-white' : 'text-[#525252] hover:text-black')}`;
  return (
    <nav className={`sticky top-0 z-40 border-b backdrop-blur-md ${dark ? 'border-white/10 bg-[#0b0b0d]/80' : 'bg-[#FBFBF8]/85'}`} style={dark ? undefined : { borderColor: BORDER }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark />
          <span className={`font-['Space_Grotesk'] text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-black'}`}>SINGULANCE <span className={dark ? 'text-white/50' : 'text-[#8a8a82]'}>Developers</span></span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-7">
          <div className="hidden items-center gap-7 sm:flex">
            {NAV_LINKS.map(([to, label]) => <NavLink key={to} to={to} className={link}>{label}</NavLink>)}
          </div>
          {session.member ? (
            <Link to="/profile" className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] font-semibold ${dark ? 'bg-white/10 text-white hover:bg-white/15' : 'border bg-white text-black hover:bg-[#f6f5ef]'}`} style={dark ? undefined : { borderColor: BORDER }}>
              <Avatar member={session.member} size={24} /> @{session.member.handle}
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              {!session.loading && !session.signedIn && <Link to="/join" className={`hidden text-[13px] font-medium sm:inline ${dark ? 'text-white/70 hover:text-white' : 'text-[#525252] hover:text-black'}`}>Sign in</Link>}
              <Link to="/join" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white" style={{ background: EMBER }}>
                Join free
              </Link>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 pb-2.5 sm:hidden">
        {NAV_LINKS.map(([to, label]) => <NavLink key={to} to={to} className={link}>{label}</NavLink>)}
      </div>
    </nav>
  );
}

const NAV_LINKS = [['/forum', 'Forum'], ['/tools', 'Tools & research']];

const FOOTER = [
  ['Community', [['Forum', '/forum'], ['Join free', '/join'], ['Your profile', '/profile']]],
  ['Build', [['ICARUS tools', '/tools'], ['Research', 'https://singulancelabs.com/research'], ['GitHub', GITHUB]]],
  ['SINGULANCE', [['singulancelabs.com', 'https://singulancelabs.com'], ['Privacy', 'https://singulancelabs.com/privacy'], ['Contact', 'mailto:support@singulancelabs.com']]],
];

const Footer = () => (
  <footer className="border-t bg-white" style={{ borderColor: BORDER }}>
    <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="col-span-2 min-w-0 md:col-span-1">
        <div className="flex items-center gap-2.5"><Mark /><span className="font-['Space_Grotesk'] text-[15px] font-semibold tracking-tight">SINGULANCE <span className="text-[#8a8a82]">Developers</span></span></div>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: MUTED }}>An open community for people who build with frontier research: students, researchers, open-source maintainers and founders.</p>
      </div>
      {FOOTER.map(([heading, links]) => (
        <div key={heading} className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a3a3a3]">{heading}</p>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {links.map(([label, href]) => (
              <li key={label}>{href.startsWith('/') ? <Link to={href} className="hover:text-black" style={{ color: MUTED }}>{label}</Link> : <a href={href} className="hover:text-black" style={{ color: MUTED }}>{label}</a>}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t" style={{ borderColor: BORDER }}>
      <p className="mx-auto max-w-[1200px] px-4 py-5 text-[12px] text-[#8a8a82] sm:px-6">© {new Date().getFullYear()} Singulance UG (haftungsbeschränkt) in formation, Hannover, Germany.</p>
    </div>
  </footer>
);

const Page = ({ title, children }) => (
  <div style={{ background: PAPER, color: INK }} className="flex min-h-screen flex-col font-['Inter']">
    <Helmet><title>{title ? `${title} · SINGULANCE Developers` : 'SINGULANCE Developers'}</title></Helmet>
    <Nav />
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 md:py-14">{children}</main>
    <Footer />
  </div>
);

const Eyebrow = ({ children, color = '#8a8a82' }) => (
  <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color }}>{children}</p>
);

const Avatar = ({ member, size = 40 }) => {
  const letters = (member?.name || member?.handle || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(member?.handle || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-['Space_Grotesk'] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 55% 38%)` }} aria-hidden="true">{letters}</span>
  );
};

const SectionHead = ({ eyebrow, title, body, action }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0 max-w-2xl">
      <Eyebrow color={EMBER}>{eyebrow}</Eyebrow>
      <h2 className="font-['Space_Grotesk'] mt-3 text-[32px] font-semibold leading-[1.08] tracking-tight md:text-[44px]">{title}</h2>
      {body && <p className="mt-4 text-[16px] leading-7" style={{ color: MUTED }}>{body}</p>}
    </div>
    {action}
  </div>
);

/* ───────────────────────── Home ───────────────────────── */

const AUDIENCES = [
  { icon: GraduationCap, title: 'Students and universities', body: 'Learn on real research systems, start reading groups across campuses and turn coursework into open source.' },
  { icon: BookOpen, title: 'Researchers', body: 'Reproduce our results, extend the methods and publish with people who will actually run your code.' },
  { icon: Wrench, title: 'Open-source builders', body: 'Build on ICARUS Memory, Harness and Agent Bus, ship integrations and get reviews from the people who wrote them.' },
  { icon: Rocket, title: 'Founders', body: 'Meet co-founders and first users, and build companies on open infrastructure you can inspect.' },
];

const PRINCIPLES = [
  ['Build in the open', 'Share code, data and failures. Work that others can run moves everyone forward.'],
  ['Credit generously', 'Name the people and papers you build on. Link the source.'],
  ['Be specific and kind', 'Critique the work, never the person. Help newcomers the way you were helped.'],
  ['No spam, no hype', 'No cold sales, no undisclosed promotion, no claims you cannot back up.'],
];

const FAQ = [
  ['Is it really free?', 'Yes. The developer account, the open ICARUS tools, the research and the forum are free. No card, no trial.'],
  ['Do I need a company or a HIVEMIND workspace?', 'No. A developer account is personal. If you already use HIVEMIND, the same identity signs you in and your workspace stays as it is.'],
  ['What do other members see?', 'Only your public profile: name, handle, role, affiliation, interests, links and your posts. Your email is never shown.'],
  ['Who runs the community?', 'The SINGULANCE team in Hannover moderates the forum and answers questions about the tools and research.'],
];

const TERMINAL = [
  ['$', 'curl -fsSL https://…/ICARUS/main/install.sh | bash'],
  ['', '✓ icarus installed'],
  ['$', 'icarus connect'],
  ['', '→ Browser opened. Signed in as @you'],
  ['', '✓ Memory · Harness · Agent Bus unlocked'],
  ['$', 'icarus recall "reading group notes"'],
];

function HeroVisual({ posts }) {
  const sample = posts[0];
  return (
    <div className="relative min-w-0">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]/90 shadow-[0_40px_120px_-40px_rgba(255,82,41,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
          <span className="ml-3 font-mono text-[11px] text-white/40">~/research</span>
        </div>
        <pre className="overflow-x-auto px-5 pb-12 pt-5 font-mono text-[12.5px] leading-[1.9]">
          {TERMINAL.map(([prompt, text], i) => (
            <div key={i} className={prompt ? 'text-white/90' : text.startsWith('✓') ? 'text-emerald-400/90' : 'text-white/50'}>
              {prompt && <span style={{ color: '#ff8a6b' }}>{prompt} </span>}{text}
            </div>
          ))}
        </pre>
      </div>
      <div className="relative -mt-6 ml-6 mr-2 rounded-xl border border-white/10 bg-[#1a1a1f]/95 p-4 backdrop-blur md:-mt-10 md:ml-12">
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <MessageSquare size={12} /> <span className="font-mono uppercase tracking-wider">{sample ? (CHANNELS.find((c) => c.id === sample.channel)?.label || 'Forum') : 'Research'}</span>
          <span>·</span><span>{sample ? timeAgo(sample.lastActivity) : 'today'}</span>
        </div>
        <p className="mt-2 truncate text-[14px] font-semibold text-white">{sample ? sample.title : 'Reading group: the .amr byte layout'}</p>
        <p className="mt-1 truncate text-[12px] text-white/55">{sample ? `@${sample.author.handle} · ${sample.replyCount} ${sample.replyCount === 1 ? 'reply' : 'replies'}` : 'Weekly, open to every member'}</p>
      </div>
    </div>
  );
}

function Home() {
  const session = useSession();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  useEffect(() => {
    devApi.stats().then(setStats).catch(() => {});
    devApi.posts().then((d) => setPosts(d.posts.slice(0, 5))).catch(() => {});
    devApi.members(12).then((d) => setMembers(d.members)).catch(() => {});
  }, []);
  const cta = session.member ? { to: '/forum', label: 'Open the forum' } : { to: '/join', label: 'Create your free account' };
  // Small numbers read as an empty room; show live counts only once the community has grown.
  const showStats = (stats?.members || 0) >= 50;
  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter']">
      <Helmet>
        <title>SINGULANCE Developers: build the future in the open</title>
        <meta name="description" content="Join the SINGULANCE developer community. Use frontier research and open ICARUS tools for free, collaborate across universities and labs, and build startups together." />
        <link rel="canonical" href={`${ORIGIN}/`} />
      </Helmet>
      <section className="relative overflow-hidden bg-[#0b0b0d] text-white">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 78% 8%, rgba(255,82,41,0.32), transparent 70%), radial-gradient(45% 40% at 8% 92%, rgba(17,125,255,0.18), transparent 70%)' }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(80% 70% at 50% 30%, #000, transparent)' }} />
        <Nav dark />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/75">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMBER }} /> The official SINGULANCE developer account
            </span>
            <h1 className="font-['Space_Grotesk'] mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-6xl md:text-[76px]">
              Build the future<br />in the open.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-white/70">
              One free account for our frontier research and open-source tools, and a community of people from universities, labs and startups building what comes next.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to={cta.to} className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[14px] font-semibold text-white transition-transform hover:translate-y-[-1px]" style={{ background: EMBER }}>
                {cta.label} <ArrowRight size={16} />
              </Link>
              <Link to="/tools" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-white/10">
                Explore tools and research
              </Link>
            </div>
            {showStats ? (
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7">
                {[['Members', stats.members], ['Institutions', stats.affiliations], ['Threads', stats.threads]].map(([label, n]) => (
                  <div key={label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</dt>
                    <dd className="font-['Space_Grotesk'] mt-1 text-3xl font-semibold">{n.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-7 text-[13px] text-white/60">
                {['Free forever', 'No card, no company needed', 'Open source on GitHub', 'Moderated by the SINGULANCE team'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={14} style={{ color: '#ff8a6b' }} /> {t}</li>
                ))}
              </ul>
            )}
          </div>
          <HeroVisual posts={posts} />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
        <SectionHead eyebrow="Open source" title="Tools you can install today." body="The ICARUS family powers SINGULANCE's own agents. Every tool is free with your developer account, and the source is on GitHub."
          action={<Link to="/tools" className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold hover:underline">All tools and docs <ArrowRight size={15} /></Link>} />
        <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-2xl border bg-white sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: BORDER }}>
          {PRODUCTS.map((p, i) => (
            <div key={p.name} className={`flex min-w-0 flex-col p-6 ${i ? 'border-t sm:border-t-0' : ''} ${i % 2 ? 'sm:border-l' : ''} ${i >= 2 ? 'sm:border-t lg:border-t-0' : ''} ${i ? 'lg:border-l' : ''}`} style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#a3a3a3]">ICARUS</span>
                <span className="rounded-full bg-[#f3f2ec] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#737367]">{p.status}</span>
              </div>
              <h3 className="font-['Space_Grotesk'] mt-2 text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: MUTED }}>{p.line}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 max-w-2xl"><CopyBlock text={ICARUS_INSTALL} label="install command" /></div>
      </section>

      <section className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
          <SectionHead eyebrow="Who it's for" title="One community, across campuses, labs and startups." />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border sm:grid-cols-2" style={{ borderColor: BORDER, background: BORDER }}>
            {AUDIENCES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white p-7 md:p-9">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff1ec]" style={{ color: EMBER }}><Icon size={19} /></span>
                <h3 className="font-['Space_Grotesk'] mt-5 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-md text-[14.5px] leading-relaxed" style={{ color: MUTED }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
        <SectionHead eyebrow="Research" title="Read the work. Run it yourself." body="Our papers and benchmarks are open to every member. Discuss them in the forum and build on them."
          action={<a href="https://singulancelabs.com/research" className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold hover:underline">All research <ArrowRight size={15} /></a>} />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RESEARCH.map((r, i) => (
            <a key={r.href} href={r.href} className={`group flex min-w-0 flex-col justify-between rounded-2xl border p-6 transition-colors ${i === 0 ? 'bg-[#0b0b0d] text-white lg:row-span-2' : 'bg-white hover:bg-[#f6f5ef]'}`} style={i === 0 ? { borderColor: '#0b0b0d' } : { borderColor: BORDER }}>
              <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${i === 0 ? 'text-[#ff8a6b]' : 'text-[#a3a3a3]'}`}>{r.tag}</span>
              <span className={`font-['Space_Grotesk'] mt-6 block font-semibold leading-tight tracking-tight ${i === 0 ? 'text-3xl md:text-4xl' : 'text-lg'}`}>{r.title}</span>
              <span className={`mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold ${i === 0 ? 'text-white/80' : ''}`}>Read <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
            </a>
          ))}
        </div>
      </section>

      <section className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <SectionHead eyebrow="Playground" title="Happening in the forum."
              action={<Link to="/forum" className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold hover:underline">All threads <ArrowRight size={15} /></Link>} />
            <div className="mt-10 divide-y overflow-hidden rounded-2xl border" style={{ borderColor: BORDER }}>
              {posts.length ? posts.map((p) => <ThreadRow key={p.id} post={p} />) : (
                <div className="px-6 py-10">
                  <p className="font-semibold">The first threads are waiting to be written.</p>
                  <p className="mt-1 text-[14px]" style={{ color: MUTED }}>Start a reading group, ask about the tools or pitch what you want to build.</p>
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8a8a82] lg:mt-[86px]">New members</p>
            <div className="mt-4 rounded-2xl border p-5" style={{ borderColor: BORDER }}>
              {members.length ? (
                <ul className="space-y-4">
                  {members.slice(0, 6).map((m) => (
                    <li key={m.handle}>
                      <Link to={`/u/${m.handle}`} className="flex items-center gap-3">
                        <Avatar member={m} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold">{m.name}</span>
                          <span className="block truncate text-[12px]" style={{ color: MUTED }}>{[ROLES.find((r) => r.id === m.role)?.label, m.affiliation].filter(Boolean).join(' · ')}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[14px]" style={{ color: MUTED }}>Be one of the first members.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2">
        <div className="min-w-0">
          <Eyebrow color={EMBER}>Community principles</Eyebrow>
          <h2 className="font-['Space_Grotesk'] mt-3 text-[28px] font-semibold leading-tight tracking-tight md:text-4xl">How we work together.</h2>
          <dl className="mt-8 space-y-6">
            {PRINCIPLES.map(([title, body], i) => (
              <div key={title} className="flex gap-5">
                <span className="font-mono text-[12px] text-[#a3a3a3]">0{i + 1}</span>
                <div><dt className="font-semibold">{title}</dt><dd className="mt-1 text-[14px] leading-relaxed" style={{ color: MUTED }}>{body}</dd></div>
              </div>
            ))}
          </dl>
        </div>
        <div className="min-w-0">
          <Eyebrow color={EMBER}>Questions</Eyebrow>
          <h2 className="font-['Space_Grotesk'] mt-3 text-[28px] font-semibold leading-tight tracking-tight md:text-4xl">Before you join.</h2>
          <div className="mt-8 divide-y border-y" style={{ borderColor: BORDER }}>
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4" style={{ borderColor: BORDER }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<Plus size={16} className="shrink-0 transition-transform group-open:rotate-45" /></summary>
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#0b0b0d] px-6 py-16 text-center text-white md:py-24">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 80% at 50% 0%, rgba(255,82,41,0.32), transparent 70%)' }} />
          <div className="relative">
            <h2 className="font-['Space_Grotesk'] mx-auto max-w-2xl text-[32px] font-semibold leading-[1.05] tracking-tight md:text-[56px]">Bring your university.<br />Bring your idea.</h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] text-white/65">Let&apos;s start working for a better future, together and in the open.</p>
            <Link to={cta.to} className="mt-9 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-[14px] font-semibold text-white" style={{ background: EMBER }}>{cta.label} <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

/* ───────────────────────── Join ───────────────────────── */

function SignIn() {
  const session = useSession();
  const [config, setConfig] = useState(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [token, setToken] = useState('');
  const [, setTurnstileStatus] = useState('checking');
  const [state, setState] = useState({ busy: false, message: '', error: false });
  const returnTo = `${ORIGIN}/join`;

  useEffect(() => {
    apiClient.getEmailIdentityConfig().then(setConfig).catch(() => setConfig({ enabled: false }));
  }, []);

  const start = async (event) => {
    event.preventDefault();
    if (!email.trim() || state.busy) return;
    setState({ busy: true, message: '', error: false });
    try {
      const result = await apiClient.startEmailSignIn({ email: email.trim().toLowerCase(), returnTo, intent: 'login', turnstileToken: token });
      setChallenge(result.challenge_id);
      setState({ busy: false, message: 'If this address can sign in, a 6-digit code is on its way.', error: false });
    } catch (error) {
      setState({ busy: false, message: error?.response?.data?.error || 'Could not send a code. Try again.', error: true });
    } finally {
      setToken('');
    }
  };
  const verify = async (event) => {
    event.preventDefault();
    if (code.length !== 6 || state.busy) return;
    setState({ busy: true, message: '', error: false });
    try {
      await apiClient.verifyEmailSignIn({ challengeId: challenge, code });
      await session.refresh();
      setState({ busy: false, message: '', error: false });
    } catch (error) {
      setCode('');
      setState({ busy: false, message: error?.response?.data?.error || 'That code is invalid or expired.', error: true });
    }
  };
  const needsTurnstile = Boolean(config?.turnstile_site_key);

  return (
    <div className="rounded-2xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
      <Eyebrow>Step 1 of 2</Eyebrow>
      <h2 className="font-['Space_Grotesk'] mt-3 text-2xl font-semibold tracking-tight">Sign in or create your account</h2>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>Your SINGULANCE identity works across every product. Already use ICARUS or HIVEMIND? You&apos;re one step from your profile.</p>
      <a href={apiClient.getGoogleLoginUrl(returnTo)} className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-lg border text-[14px] font-semibold hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </a>
      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#a3a3a3]"><span className="h-px flex-1 bg-[#E4E3DE]" />or email<span className="h-px flex-1 bg-[#E4E3DE]" /></div>
      {config && !config.enabled ? (
        <p className="text-[14px]" style={{ color: MUTED }}>Email sign-in is unavailable right now. Use Google, or try again later.</p>
      ) : !challenge ? (
        <form onSubmit={start} className="space-y-3">
          <label className="block">
            <span className="sr-only">Email address</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu"
              className="h-12 w-full rounded-lg border bg-white px-4 text-[14px] outline-none focus:border-black" style={{ borderColor: BORDER }} />
          </label>
          {needsTurnstile && <EmailTurnstile siteKey={config.turnstile_site_key} onToken={setToken} onStatus={setTurnstileStatus} />}
          <button type="submit" disabled={state.busy || (needsTurnstile && !token)} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-[14px] font-semibold text-white disabled:opacity-50">
            {state.busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">6-digit code sent to {email}</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 w-full rounded-lg border bg-white px-4 font-mono text-[18px] tracking-[0.4em] outline-none focus:border-black" style={{ borderColor: BORDER }} />
          </label>
          <button type="submit" disabled={state.busy || code.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-[14px] font-semibold text-white disabled:opacity-50">
            {state.busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Verify and continue
          </button>
          <button type="button" onClick={() => { setChallenge(''); setCode(''); setState({ busy: false, message: '', error: false }); }} className="w-full text-[13px] font-medium" style={{ color: MUTED }}>Use a different email</button>
        </form>
      )}
      {state.message && <p role="status" className={`mt-4 text-[13px] ${state.error ? 'text-red-600' : ''}`} style={state.error ? undefined : { color: MUTED }}>{state.message}</p>}
      {!BROWSER_SIGNUP && (
        <div className="mt-6 rounded-lg bg-[#f6f5ef] p-4">
          <p className="text-[13px] font-semibold">New to SINGULANCE?</p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>Browser sign-up for new accounts opens shortly. Until then, create your free account from a terminal; your browser signs in as part of it, and then you come back here.</p>
          <div className="mt-3"><CopyBlock text={`${ICARUS_INSTALL}\nicarus connect`} label="account command" /></div>
        </div>
      )}
    </div>
  );
}

function ProfileForm({ initial, onSaved, submitLabel = 'Create my profile' }) {
  const session = useSession();
  const [form, setForm] = useState(() => ({
    handle: initial?.handle || (session.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 24),
    name: initial?.name || '', role: initial?.role || 'student', affiliation: initial?.affiliation || '', bio: initial?.bio || '',
    interests: (initial?.interests || []).join(', '), links: (initial?.links || []).join('\n'),
  }));
  const [state, setState] = useState({ busy: false, error: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const me = await devApi.saveProfile({
        handle: form.handle.trim().toLowerCase(), name: form.name, role: form.role, affiliation: form.affiliation, bio: form.bio,
        interests: form.interests.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
        links: form.links.split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 3),
      });
      session.setMember(me.member);
      setState({ busy: false, error: '' });
      onSaved?.(me.member);
    } catch (error) {
      setState({ busy: false, error: errorMessage(error) });
    }
  };
  const field = 'mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-black';
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="block"><span className="text-[13px] font-medium">Name</span>
        <input required maxLength={60} value={form.name} onChange={set('name')} className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Handle</span>
        <div className="relative"><span className="pointer-events-none absolute left-3.5 top-[17px] text-[14px] text-[#a3a3a3]">@</span>
          <input required minLength={3} maxLength={24} pattern="[a-z0-9][a-z0-9-]{2,23}" value={form.handle} onChange={set('handle')} className={`${field} pl-8`} style={{ borderColor: BORDER }} /></div></label>
      <label className="block"><span className="text-[13px] font-medium">I am a</span>
        <select value={form.role} onChange={set('role')} className={field} style={{ borderColor: BORDER }}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select></label>
      <label className="block"><span className="text-[13px] font-medium">University, lab or company</span>
        <input maxLength={80} value={form.affiliation} onChange={set('affiliation')} placeholder="e.g. Leibniz Universität Hannover" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block sm:col-span-2"><span className="text-[13px] font-medium">About you</span>
        <textarea maxLength={400} rows={3} value={form.bio} onChange={set('bio')} placeholder="What are you working on? What would you like to build?" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Interests <span className="font-normal text-[#a3a3a3]">(comma separated)</span></span>
        <input value={form.interests} onChange={set('interests')} placeholder="agents, memory, robotics" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Links <span className="font-normal text-[#a3a3a3]">(up to 3, https)</span></span>
        <input value={form.links} onChange={set('links')} placeholder="https://github.com/you" className={field} style={{ borderColor: BORDER }} /></label>
      {state.error && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state.busy} className="inline-flex h-12 items-center gap-2 rounded-lg px-6 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: EMBER }}>
          {state.busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Join() {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => { if (session.member) navigate('/profile', { replace: true }); }, [session.member, navigate]);
  return (
    <Page title="Join">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <Eyebrow color={EMBER}>Join SINGULANCE Developers</Eyebrow>
          <h1 className="font-['Space_Grotesk'] mt-3 text-[40px] font-semibold leading-[1.05] tracking-tight md:text-6xl">Your seat at the lab.</h1>
          <p className="mt-5 text-[16px] leading-7" style={{ color: MUTED }}>Free forever for developers, students and researchers. Your account opens the open ICARUS tools, our research, and a forum full of people building the same future.</p>
          <ul className="mt-7 space-y-3 text-[14px]">
            {['Public member profile', 'Memory, Harness, Agent Bus and Computer Use', 'Forum and playground for research and startups', 'No card, no company workspace'].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><Check size={15} style={{ color: EMBER }} /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          {session.loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>
            : !session.signedIn ? <SignIn />
              : (
                <div className="rounded-2xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
                  <Eyebrow>Step 2 of 2</Eyebrow>
                  <h2 className="font-['Space_Grotesk'] mt-3 text-2xl font-semibold tracking-tight">Create your member profile</h2>
                  <p className="mb-6 mt-2 text-[14px]" style={{ color: MUTED }}>Signed in as {session.email}. Your email is never shown to other members.</p>
                  <ProfileForm onSaved={() => navigate('/profile')} />
                </div>
              )}
        </div>
      </div>
    </Page>
  );
}

/* ───────────────────────── Profiles ───────────────────────── */

function MemberCard({ member, children }) {
  return (
    <div className="rounded-2xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
      <div className="flex items-start gap-4">
        <Avatar member={member} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-['Space_Grotesk'] truncate text-2xl font-semibold tracking-tight md:text-3xl">{member.name}</h1>
          <p className="mt-1 text-[14px]" style={{ color: MUTED }}>@{member.handle} · {[ROLES.find((r) => r.id === member.role)?.label, member.affiliation].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {member.bio && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed">{member.bio}</p>}
      {member.interests?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">{member.interests.map((t) => <span key={t} className="rounded-full bg-[#f3f2ec] px-3 py-1 text-[12px] text-[#525252]">{t}</span>)}</div>
      )}
      {member.links?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-[13px] font-medium">{member.links.map((l) => <a key={l} href={l} rel="noopener noreferrer nofollow ugc" target="_blank" className="truncate hover:underline">{l.replace(/^https:\/\//, '')}</a>)}</div>
      )}
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#a3a3a3]">Member since {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
      {children}
    </div>
  );
}

function MyProfile() {
  const session = useSession();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!session.loading && !session.member) navigate('/join', { replace: true }); }, [session.loading, session.member, navigate]);
  if (!session.member) return <Page title="Profile"><div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div></Page>;
  return (
    <Page title="Your profile">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-4">
          {editing ? (
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: BORDER }}>
              <h2 className="font-['Space_Grotesk'] mb-5 text-xl font-semibold">Edit profile</h2>
              <ProfileForm initial={session.member} submitLabel="Save profile" onSaved={() => setEditing(false)} />
            </div>
          ) : (
            <MemberCard member={session.member}>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => setEditing(true)} className="rounded-lg border px-4 py-2 text-[13px] font-semibold hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>Edit profile</button>
                <Link to={`/u/${session.member.handle}`} className="rounded-lg border px-4 py-2 text-[13px] font-semibold hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>View public page</Link>
              </div>
            </MemberCard>
          )}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: BORDER }}>
            <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Connect your terminal</h2>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>Link this account once and every ICARUS tool on that machine uses it.</p>
            <div className="mt-4"><CopyBlock text="icarus connect" label="connect command" /></div>
          </div>
        </div>
        <div className="min-w-0">
          <Eyebrow color={EMBER}>Your access</Eyebrow>
          <h2 className="font-['Space_Grotesk'] mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Everything is unlocked.</h2>
          <ToolGrid compact />
          <h3 className="font-['Space_Grotesk'] mt-10 text-lg font-semibold">Research</h3>
          <ResearchList />
        </div>
      </div>
    </Page>
  );
}

function MemberPage() {
  const { handle } = useParams();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => { setData(null); devApi.member(handle).then(setData).catch(() => setMissing(true)); }, [handle]);
  return (
    <Page title={data ? data.member.name : 'Member'}>
      {missing ? <p style={{ color: MUTED }}>No member called @{handle}.</p> : !data ? <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div> : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="min-w-0"><MemberCard member={data.member} /></div>
          <div className="min-w-0">
            <h2 className="font-['Space_Grotesk'] text-xl font-semibold">Threads</h2>
            <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
              {data.posts.length ? data.posts.map((p) => <ThreadRow key={p.id} post={p} />) : <p className="px-5 py-6 text-[14px]" style={{ color: MUTED }}>No threads yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

/* ───────────────────────── Tools & research ───────────────────────── */

function ToolGrid({ compact = false }) {
  return (
    <div className={`mt-6 grid grid-cols-1 gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
      {PRODUCTS.map((p) => (
        <article key={p.name} className="flex min-w-0 flex-col rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-['Space_Grotesk'] text-lg font-semibold tracking-tight"><span className="text-[#8a8a82]">ICARUS</span> {p.name}</h3>
            <span className="shrink-0 rounded bg-[#f3f2ec] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#737367]">{p.status}</span>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>{p.line}</p>
          {p.command && !compact && <div className="mt-4"><CopyBlock text={p.command} label={`ICARUS ${p.name} commands`} /></div>}
          <div className="mt-auto flex flex-wrap gap-4 pt-4 text-[13px] font-semibold">
            {p.docs && <a href={p.docs} className="inline-flex items-center gap-1 hover:underline">Docs <ArrowRight size={14} /></a>}
            {p.repo ? <a href={p.repo} className="inline-flex items-center gap-1.5 text-[#525252] hover:text-black"><Github size={14} /> Source</a> : <span className="text-[#a3a3a3]">Source opens with the public release</span>}
          </div>
        </article>
      ))}
    </div>
  );
}

const ResearchList = () => (
  <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
    {RESEARCH.map((r) => (
      <a key={r.href} href={r.href} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#f6f5ef]">
        <span className="min-w-0"><span className="block font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{r.tag}</span><span className="block truncate text-[15px] font-semibold">{r.title}</span></span>
        <ArrowRight size={16} className="shrink-0 text-[#8a8a82]" />
      </a>
    ))}
  </div>
);

function Tools() {
  return (
    <Page title="Tools & research">
      <Eyebrow color={EMBER}>Open source · free with your account</Eyebrow>
      <h1 className="font-['Space_Grotesk'] mt-3 text-[38px] font-semibold leading-tight tracking-tight md:text-6xl">Tools and research.</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-7" style={{ color: MUTED }}>Everything SINGULANCE publishes for developers. Install a tool, read the paper behind it, then tell the forum what you built.</p>
      <ToolGrid />
      <h2 className="font-['Space_Grotesk'] mt-14 text-2xl font-semibold tracking-tight md:text-3xl">Research</h2>
      <ResearchList />
    </Page>
  );
}

/* ───────────────────────── Forum ───────────────────────── */

function ThreadRow({ post }) {
  const channel = CHANNELS.find((c) => c.id === post.channel);
  return (
    <Link to={`/forum/${post.id}`} className="flex gap-4 bg-white px-5 py-4 transition-colors hover:bg-[#f9f8f4]">
      <Avatar member={post.author} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#8a8a82]">
          <span className="font-semibold text-[#3a3a3a]">{post.author.name || `@${post.author.handle}`}</span>
          <span>in</span>
          <span className="rounded-full bg-[#f3f2ec] px-2 py-0.5 text-[11px] font-medium text-[#525252]">{channel?.label || post.channel}</span>
          <span>·</span><span>{timeAgo(post.lastActivity)}</span>
        </div>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>{post.excerpt}</p>
      </div>
      <span className="hidden shrink-0 flex-col items-end text-right sm:flex">
        <span className="font-['Space_Grotesk'] text-[18px] font-semibold leading-none">{post.replyCount}</span>
        <span className="mt-1 text-[11px] text-[#8a8a82]">{post.replyCount === 1 ? 'reply' : 'replies'}</span>
      </span>
    </Link>
  );
}

function Composer({ channel, onCreated }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ channel: channel || 'research', title: '', body: '' });
  const [state, setState] = useState({ busy: false, error: '' });
  useEffect(() => { if (channel) setForm((f) => ({ ...f, channel })); }, [channel]);
  if (!session.member) {
    return (
      <Link to="/join" className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-white px-5 py-4 text-[14px] font-medium hover:bg-[#f6f5ef]" style={{ borderColor: '#cfcdc5' }}>
        <span>Join free to start a thread or reply</span><ArrowRight size={16} />
      </Link>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl border bg-white px-5 py-4 text-left text-[14px] hover:bg-[#f6f5ef]" style={{ borderColor: BORDER, color: MUTED }}>
        <Avatar member={session.member} size={30} /> Share research, ask a question or pitch an idea…<Plus size={16} className="ml-auto" />
      </button>
    );
  }
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const { post } = await devApi.createPost(form);
      setState({ busy: false, error: '' });
      setOpen(false); setForm((f) => ({ ...f, title: '', body: '' }));
      onCreated(post);
    } catch (error) { setState({ busy: false, error: errorMessage(error) }); }
  };
  const field = 'w-full rounded-lg border bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-black';
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <button key={c.id} type="button" onClick={() => setForm((f) => ({ ...f, channel: c.id }))}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${form.channel === c.id ? 'border-black bg-black text-white' : ''}`} style={form.channel === c.id ? undefined : { borderColor: BORDER }}>{c.label}</button>
        ))}
      </div>
      <input required minLength={4} maxLength={140} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className={`${field} font-semibold`} style={{ borderColor: BORDER }} />
      <textarea required maxLength={8000} rows={6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Say more. Links, papers and repos welcome." className={field} style={{ borderColor: BORDER }} />
      {state.error && <p role="alert" className="text-[13px] text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ color: MUTED }}>Cancel</button>
        <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {state.busy && <Loader2 size={14} className="animate-spin" />} Post thread
        </button>
      </div>
    </form>
  );
}

function ForumList({ channel }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ posts: [], next: null, loading: true, error: false });
  const [query, setQuery] = useState('');
  const load = useCallback(async (before = '') => {
    try {
      const d = await devApi.posts({ channel: channel || '', before });
      setData((prev) => ({ posts: before ? [...prev.posts, ...d.posts] : d.posts, next: d.next, loading: false, error: false }));
    } catch { setData((prev) => ({ ...prev, loading: false, error: true })); }
  }, [channel]);
  useEffect(() => { setData({ posts: [], next: null, loading: true, error: false }); load(); }, [load]);
  const active = CHANNELS.find((c) => c.id === channel);
  const needle = query.trim().toLowerCase();
  const shown = needle ? data.posts.filter((p) => `${p.title} ${p.excerpt} ${p.author.handle} ${p.author.name}`.toLowerCase().includes(needle)) : data.posts;
  const tab = (on) => `shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${on ? 'bg-black text-white' : 'text-[#3a3a3a] hover:bg-[#f0efe9]'}`;
  return (
    <Page title={active ? `${active.label} · Forum` : 'Forum'}>
      <header className="flex flex-col gap-5 border-b pb-8 md:flex-row md:items-end md:justify-between" style={{ borderColor: BORDER }}>
        <div className="min-w-0">
          <Eyebrow color={EMBER}>Playground</Eyebrow>
          <h1 className="font-['Space_Grotesk'] mt-2 text-[36px] font-semibold leading-tight tracking-tight md:text-5xl">{active ? active.label : 'Forum'}</h1>
          <p className="mt-2 text-[15px]" style={{ color: MUTED }}>{active ? active.blurb : 'Share research, ask for help, find collaborators and show what you built.'}</p>
        </div>
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Search threads</span>
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search threads" className="h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-[14px] outline-none focus:border-black" style={{ borderColor: BORDER }} />
        </label>
      </header>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="min-w-0">
          <p className="mb-2 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-[#a3a3a3] md:block">Channels</p>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible">
            <Link to="/forum" className={tab(!channel)}>All threads</Link>
            {CHANNELS.map((c) => (
              <Link key={c.id} to={`/forum/${c.id}`} className={tab(channel === c.id)}>
                {c.label}<span className={`hidden text-[11px] font-normal md:block ${channel === c.id ? 'text-white/60' : 'text-[#8a8a82]'}`}>{c.blurb}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 space-y-4">
          <Composer channel={channel} onCreated={(post) => navigate(`/forum/${post.id}`)} />
          <div className="divide-y overflow-hidden rounded-xl border" style={{ borderColor: BORDER }}>
            {data.loading ? <div className="flex h-40 items-center justify-center bg-white"><Loader2 className="animate-spin" /></div>
              : data.error ? <p className="bg-white px-5 py-8 text-[14px]" style={{ color: MUTED }}>The forum is briefly unavailable. Refresh in a moment.</p>
                : shown.length ? shown.map((p) => <ThreadRow key={p.id} post={p} />)
                  : <div className="bg-white px-6 py-12 text-center"><p className="font-semibold">{needle ? 'No threads match that search.' : 'No threads here yet.'}</p><p className="mt-1 text-[14px]" style={{ color: MUTED }}>{needle ? 'Try another word, or start the thread yourself.' : 'Start the first one. Good first threads say who you are and what you want to build.'}</p></div>}
          </div>
          {data.next && !needle && <button type="button" onClick={() => load(data.next)} className="w-full rounded-lg border bg-white py-3 text-[13px] font-semibold hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>Load more</button>}
        </section>
        <aside className="hidden min-w-0 xl:block">
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <p className="font-['Space_Grotesk'] text-[15px] font-semibold">Community principles</p>
            <ul className="mt-3 space-y-3">
              {PRINCIPLES.map(([title, body]) => (
                <li key={title}><p className="text-[13px] font-semibold">{title}</p><p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>{body}</p></li>
              ))}
            </ul>
          </div>
          <Link to="/tools" className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-white p-5 hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>
            <span><span className="block text-[13px] font-semibold">New to ICARUS?</span><span className="mt-0.5 block text-[12px]" style={{ color: MUTED }}>Install the tools in one line.</span></span>
            <ArrowRight size={15} className="shrink-0" />
          </Link>
        </aside>
      </div>
    </Page>
  );
}

function Thread({ id }) {
  const session = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [body, setBody] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  useEffect(() => { setData(null); devApi.post(id).then(setData).catch(() => setMissing(true)); }, [id, session.member]);
  const send = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try { setData(await devApi.reply(id, body)); setBody(''); setState({ busy: false, error: '' }); }
    catch (error) { setState({ busy: false, error: errorMessage(error) }); }
  };
  const removeReply = async (replyId) => {
    try { await devApi.removeReply(replyId); setData(await devApi.post(id)); } catch (error) { setState({ busy: false, error: errorMessage(error) }); }
  };
  const removePost = async () => {
    try { await devApi.removePost(id); navigate('/forum'); } catch (error) { setState({ busy: false, error: errorMessage(error) }); }
  };
  if (missing) return <Page title="Thread"><p style={{ color: MUTED }}>This thread does not exist or was removed. <Link to="/forum" className="font-semibold underline">Back to the forum</Link></p></Page>;
  if (!data) return <Page title="Thread"><div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div></Page>;
  const { post, replies } = data;
  const channel = CHANNELS.find((c) => c.id === post.channel);
  return (
    <Page title={post.title}>
      <div className="mx-auto max-w-3xl">
        <Link to={`/forum/${post.channel}`} className="text-[13px] font-medium hover:underline" style={{ color: MUTED }}>← {channel?.label || 'Forum'}</Link>
        <article className="mt-4 rounded-2xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
          <h1 className="font-['Space_Grotesk'] text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{post.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <Link to={`/u/${post.author.handle}`} className="flex items-center gap-2.5"><Avatar member={post.author} size={32} /><span className="text-[14px] font-semibold">{post.author.name}</span></Link>
            <span className="text-[12px] text-[#8a8a82]">{timeAgo(post.createdAt)}</span>
            {post.mine && <button type="button" onClick={removePost} aria-label="Delete thread" className="ml-auto text-[#a3a3a3] hover:text-red-600"><Trash2 size={15} /></button>}
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7">{post.body}</p>
        </article>
        <h2 className="font-['Space_Grotesk'] mt-8 text-lg font-semibold">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</h2>
        <div className="mt-4 space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2.5">
                <Link to={`/u/${r.author.handle}`} className="flex items-center gap-2"><Avatar member={r.author} size={26} /><span className="text-[13px] font-semibold">{r.author.name}</span></Link>
                <span className="text-[12px] text-[#8a8a82]">{timeAgo(r.createdAt)}</span>
                {r.mine && <button type="button" onClick={() => removeReply(r.id)} aria-label="Delete reply" className="ml-auto text-[#a3a3a3] hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          {session.member ? (
            <form onSubmit={send} className="space-y-3 rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <textarea required maxLength={4000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" className="w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none focus:border-black" style={{ borderColor: BORDER }} />
              {state.error && <p role="alert" className="text-[13px] text-red-600">{state.error}</p>}
              <div className="flex justify-end"><button type="submit" disabled={state.busy || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{state.busy && <Loader2 size={14} className="animate-spin" />} Reply</button></div>
            </form>
          ) : <Composer />}
        </div>
      </div>
    </Page>
  );
}

function ForumRoute() {
  const { slug } = useParams();
  if (!slug || CHANNELS.some((c) => c.id === slug)) return <ForumList channel={slug || ''} />;
  return <Thread id={slug} />;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function DevCommunity() {
  return (
    <SessionProvider>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/forum" element={<ForumRoute />} />
        <Route path="/forum/:slug" element={<ForumRoute />} />
        <Route path="/u/:handle" element={<MemberPage />} />
        <Route path="*" element={<Page title="Not found"><p style={{ color: MUTED }}>That page does not exist. <Link to="/" className="font-semibold underline">Go home</Link></p></Page>} />
      </Routes>
    </SessionProvider>
  );
}

