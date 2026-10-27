import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, ArrowUpRight, Check, Github, Loader2, LogIn, Mail, Plus,
  Search, Trash2,
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
const INK = '#ECEBE7';
const PAPER = '#060606';
const BORDER = 'rgba(255,255,255,0.09)';
const EMBER = '#FF5229';
const MUTED = '#9C9B96';
const SERIF = "font-['Newsreader'] font-normal tracking-[-0.025em]";
const MONO = "font-['JetBrains_Mono'] uppercase tracking-[0.16em]";
// Film grain, layered over gradients so they read as printed light rather than flat CSS.
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

const Mark = ({ dark = false }) => (
  <span className={`flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-bold ${dark ? 'bg-black text-white' : 'bg-white text-black'}`}>S</span>
);

const NAV_LINKS = [['/forum', 'Forum'], ['/tools', 'Tools & research']];

function Nav({ overlay = false }) {
  const session = useSession();
  // overlay: sits on the light top of the ember hero, so it uses dark ink.
  const ink = overlay ? { on: 'text-black', off: 'text-black/60 hover:text-black', sub: 'text-black/50' } : { on: 'text-white', off: 'text-white/55 hover:text-white', sub: 'text-white/45' };
  const link = ({ isActive }) => `text-[13px] transition-colors ${isActive ? ink.on : ink.off}`;
  return (
    <nav className={`${overlay ? 'absolute inset-x-0 top-0' : 'sticky top-0 border-b bg-[#060606]/80 backdrop-blur-md'} z-40`} style={overlay ? undefined : { borderColor: BORDER }}>
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark dark={overlay} />
          <span className={`text-[15px] font-semibold tracking-tight ${ink.on}`}>SINGULANCE <span className={`font-normal ${ink.sub}`}>Developers</span></span>
        </Link>
        <div className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map(([to, label]) => <NavLink key={to} to={to} className={link}>{label}</NavLink>)}
          <a href="https://singulancelabs.com/research" className={`text-[13px] ${ink.off}`}>Research</a>
        </div>
        {session.member ? (
          <Link to="/profile" className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12px] font-medium ${overlay ? 'border-black/15 bg-black/5 text-black hover:bg-black/10' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}>
            <Avatar member={session.member} size={24} /> @{session.member.handle}
          </Link>
        ) : (
          <span className="flex items-center gap-4">
            {!session.loading && !session.signedIn && <Link to="/join" className={`hidden text-[13px] sm:inline ${ink.off}`}>Sign in</Link>}
            <Link to="/join" className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[12px] font-semibold ${overlay ? 'bg-black text-white hover:bg-black/85' : 'bg-white text-black hover:bg-white/90'}`}>
              Join free <ArrowRight size={13} />
            </Link>
          </span>
        )}
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 pb-3 sm:hidden">
        {NAV_LINKS.map(([to, label]) => <NavLink key={to} to={to} className={link}>{label}</NavLink>)}
      </div>
    </nav>
  );
}

const FOOTER = [
  ['Community', [['Forum', '/forum'], ['Join free', '/join'], ['Your profile', '/profile']]],
  ['Build', [['ICARUS tools', '/tools'], ['Research', 'https://singulancelabs.com/research'], ['GitHub', GITHUB]]],
  ['SINGULANCE', [['singulancelabs.com', 'https://singulancelabs.com'], ['Privacy', 'https://singulancelabs.com/privacy'], ['Contact', 'mailto:support@singulancelabs.com']]],
];

const Footer = () => (
  <footer className="relative overflow-hidden border-t" style={{ borderColor: BORDER }}>
    <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="col-span-2 min-w-0 md:col-span-1">
        <div className="flex items-center gap-2.5"><Mark /><span className="text-[15px] font-semibold tracking-tight text-white">SINGULANCE <span className="font-normal text-white/45">Developers</span></span></div>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: MUTED }}>An open community for people who build with frontier research: students, researchers, open-source maintainers and founders.</p>
      </div>
      {FOOTER.map(([heading, links]) => (
        <div key={heading} className="min-w-0">
          <p className={`${MONO} text-[10px] text-white/35`}>{heading}</p>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {links.map(([label, href]) => (
              <li key={label}>{href.startsWith('/') ? <Link to={href} className="text-white/60 hover:text-white">{label}</Link> : <a href={href} className="text-white/60 hover:text-white">{label}</a>}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t" style={{ borderColor: BORDER }}>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[12px] text-white/35 sm:flex-row sm:justify-between sm:px-6">
        <span>© {new Date().getFullYear()} Singulance UG (haftungsbeschränkt) in formation, Hannover, Germany.</span>
        <span className={`${MONO} text-[10px]`}>Built in the open</span>
      </div>
    </div>
  </footer>
);

const Page = ({ title, children }) => (
  <div style={{ background: PAPER, color: INK }} className="flex min-h-screen flex-col font-['Inter'] [color-scheme:dark]">
    <Helmet><title>{title ? `${title} · SINGULANCE Developers` : 'SINGULANCE Developers'}</title></Helmet>
    <Nav />
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-10 sm:px-6 md:py-16">{children}</main>
    <Footer />
  </div>
);

const Eyebrow = ({ children, color = 'rgba(255,255,255,0.45)' }) => (
  <p className={`${MONO} text-[11px]`} style={{ color }}>{children}</p>
);

const Avatar = ({ member, size = 40 }) => {
  const letters = (member?.name || member?.handle || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(member?.handle || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 45% 32%)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }} aria-hidden="true">{letters}</span>
  );
};

const SectionHead = ({ eyebrow, title, body, action, center = false }) => (
  <div className={`flex flex-col gap-5 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
    <div className={`min-w-0 ${center ? 'max-w-3xl' : 'max-w-2xl'}`}>
      <Eyebrow>[ {eyebrow} ]</Eyebrow>
      <h2 className={`${SERIF} mt-4 text-[40px] leading-[1.02] text-white md:text-[60px]`}>{title}</h2>
      {body && <p className="mt-5 text-[16px] leading-7" style={{ color: MUTED }}>{body}</p>}
    </div>
    {action}
  </div>
);

const TextLink = ({ to, href, children }) => {
  const cls = 'inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-white/80 hover:text-white';
  return to ? <Link to={to} className={cls}>{children} <ArrowRight size={14} /></Link> : <a href={href} className={cls}>{children} <ArrowUpRight size={14} /></a>;
};

/* ───────────────────────── Artwork ───────────────────────── */

// Vertical light streaks over an ember gradient, with grain: the hero and closing bands.
function EmberField({ flip = false, className = '' }) {
  const streaks = 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.22) 23px, rgba(0,0,0,0) 61px, rgba(0,0,0,0.32) 97px, rgba(0,0,0,0) 131px, rgba(0,0,0,0.18) 173px, rgba(0,0,0,0) 211px)';
  const glow = flip
    ? 'linear-gradient(0deg, #060606 0%, #4a1506 12%, #ffb866 30%, #ff8a2b 40%, #e2470f 55%, #6e1a05 74%, #060606 100%)'
    : 'linear-gradient(180deg, #fff3dc 0%, #ffd79b 12%, #ff9a3a 30%, #ee5615 46%, #8a2507 64%, #1a0702 82%, #060606 100%)';
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute inset-0" style={{ background: glow }} />
      <div className="absolute inset-0" style={{ background: streaks, filter: 'blur(10px)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #060606 0%, transparent 18%, transparent 82%, #060606 100%)', opacity: 0.55 }} />
      <div className="absolute inset-0 opacity-[0.32] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

// Halftone pixel field: a grid of squares whose size follows a pattern function.
function Halftone({ pattern, color, cols = 30, rows = 20 }) {
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const v = Math.max(0, Math.min(1, pattern((x + 0.5) / cols - 0.5, ((y + 0.5) / rows - 0.5) * (rows / cols))));
      if (v > 0.08) {
        const s = 0.25 + v * 0.75;
        cells.push(<rect key={`${x}-${y}`} x={x + (1 - s) / 2} y={y + (1 - s) / 2} width={s} height={s} />);
      }
    }
  }
  return <svg viewBox={`0 0 ${cols} ${rows}`} className="block h-full w-full" preserveAspectRatio="xMidYMid slice" fill={color} aria-hidden="true">{cells}</svg>;
}

const PATTERNS = {
  rays: (x, y) => 0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 8 + Math.hypot(x, y) * 4),
  spiral: (x, y) => 0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 3 - Math.hypot(x, y) * 22),
  orb: (x, y) => { const r = Math.hypot(x, y); return r < 0.07 ? 0.2 : r < 0.32 ? 1 - r * 1.2 : 0.5 + 0.5 * Math.sin(r * 30); },
};

// Isometric stack of layers, for ICARUS Memory.
const IsoStack = ({ color, labels }) => (
  <svg viewBox="0 0 320 240" className="h-full w-full" fill="none" aria-hidden="true">
    {labels.map((label, i) => {
      const y = 70 + i * 46;
      return (
        <g key={label} opacity={1 - i * 0.15}>
          <path d={`M160 ${y - 44} L280 ${y + 6} L160 ${y + 56} L40 ${y + 6} Z`} fill={color} fillOpacity={0.06 + (labels.length - i) * 0.04} stroke={color} strokeWidth="1.2" />
          <path d={`M40 ${y + 6} L40 ${y + 18} L160 ${y + 68} L280 ${y + 18} L280 ${y + 6}`} stroke={color} strokeOpacity="0.6" />
          <text x="214" y={y + 50} fill={color} fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="2" transform={`rotate(-22 214 ${y + 50})`}>{label}</text>
          {[0, 1, 2, 3].map((k) => <circle key={k} cx={[160, 280, 160, 40][k]} cy={[y - 44, y + 6, y + 56, y + 6][k]} r="2.5" fill={color} />)}
        </g>
      );
    })}
  </svg>
);

// Cascading panes, for ICARUS Harness.
const Panes = ({ color, names }) => (
  <svg viewBox="40 15 270 215" className="h-full w-full" fill="none" aria-hidden="true">
    {names.map((name, i) => {
      const x = 60 + i * 48; const y = 40 + i * 30;
      return (
        <g key={name} transform={`skewY(-14) translate(${x} ${y + x * 0.25})`}>
          <rect width="150" height="96" fill="#130804" stroke={color} strokeOpacity={0.5 + i * 0.15} />
          <rect width="150" height="18" fill={color} fillOpacity="0.14" stroke={color} strokeOpacity="0.5" />
          <text x="8" y="12.5" fill={color} fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1">{name}</text>
          {[0, 1, 2, 3].map((k) => <rect key={k} x="8" y={28 + k * 15} width={[110, 84, 120, 64][k]} height="5" fill={color} fillOpacity="0.22" />)}
        </g>
      );
    })}
  </svg>
);

// Isometric hex field, for ICARUS Agent Bus.
const HexField = ({ color }) => {
  const hexes = [];
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const cx = 40 + c * 58 + (r % 2) * 29; const cy = 40 + r * 40;
      const lit = (r * 5 + c) % 3 === 0;
      hexes.push(
        <g key={`${r}-${c}`} transform={`translate(${cx} ${cy}) scale(1 0.62)`}>
          <path d="M0 -26 L23 -13 L23 13 L0 26 L-23 13 L-23 -13 Z" fill={lit ? color : '#05070d'} fillOpacity={lit ? 0.22 : 1} stroke={color} strokeWidth="1.4" />
          {lit && <circle r="5" fill={color} />}
        </g>,
      );
    }
  }
  return <svg viewBox="0 0 330 200" className="h-full w-full" aria-hidden="true">{hexes}</svg>;
};

/* ───────────────────────── Home ───────────────────────── */

const AUDIENCES = [
  { pattern: 'rays', title: 'Students and universities', body: 'Learn on real research systems, start reading groups across campuses and turn coursework into open source.' },
  { pattern: 'spiral', title: 'Researchers and labs', body: 'Reproduce our results, extend the methods and publish with people who will actually run your code.' },
  { pattern: 'orb', title: 'Builders and founders', body: 'Ship integrations, meet co-founders and first users, and build companies on infrastructure you can inspect.' },
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

const FACTS = [
  ['4', 'Open ICARUS tools'],
  ['87.2%', 'LongMemEval accuracy'],
  ['€0', 'Free, forever'],
  ['1', 'Identity for everything'],
];

const BENTO = {
  Memory: { color: '#4ADE80', tint: 'rgba(74,222,128,0.06)', art: <IsoStack color="#4ADE80" labels={['RECALL', 'SAVE', 'SEAL']} /> },
  Harness: { color: '#FF7A3D', tint: 'rgba(255,122,61,0.06)', art: <Panes color="#FF7A3D" names={['contract.md', 'context.pack', 'receipt.json']} /> },
  'Agent Bus': { color: '#5B8CFF', tint: 'rgba(91,140,255,0.06)', art: <HexField color="#5B8CFF" /> },
  'Computer Use': { color: '#E9A8F0', tint: 'rgba(233,168,240,0.06)', art: <Halftone pattern={PATTERNS.rays} color="#E9A8F0" cols={64} rows={16} /> },
};

function ToolTile({ product, large = false }) {
  const look = BENTO[product.name];
  return (
    <article className={`relative flex min-w-0 flex-col overflow-hidden border p-6 md:p-7 ${large ? 'lg:row-span-2' : ''}`} style={{ borderColor: `${look.color}55`, background: look.tint }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${MONO} text-[10px]`} style={{ color: look.color }}>ICARUS · {product.status}</p>
          <h3 className="mt-2 text-[22px] font-medium tracking-tight text-white">{product.name}</h3>
          <p className="mt-2 max-w-sm text-[14px] leading-relaxed" style={{ color: MUTED }}>{product.line}</p>
        </div>
      </div>
      <div className="mt-5">
        {product.docs || product.repo ? (
          <a href={product.docs || product.repo} className={`${MONO} inline-flex items-center gap-2 border px-3 py-2 text-[10px]`} style={{ borderColor: look.color, color: look.color }}>
            Get started <ArrowUpRight size={12} />
          </a>
        ) : <span className={`${MONO} inline-flex border border-dashed px-3 py-2 text-[10px] text-white/40`} style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Opens with the public release</span>}
      </div>
      <div className={`pointer-events-none mt-6 flex items-center ${large ? 'h-[300px] md:h-auto md:min-h-[340px] md:flex-1' : 'h-[160px]'}`}>{look.art}</div>
    </article>
  );
}

function ConnectorFlow() {
  return (
    <div className="relative overflow-hidden border" style={{ borderColor: BORDER, backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      <div className="relative grid grid-cols-1 gap-10 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-24 md:p-12">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 1000 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wire" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.9" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.35" /><stop offset="1" stopColor="#fff" stopOpacity="0.9" /></linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
          </defs>
          <path d="M455 150 C 520 150, 480 270, 545 270" stroke="url(#wire)" strokeWidth="6" fill="none" filter="url(#glow)" opacity="0.6" />
          <path d="M455 150 C 520 150, 480 270, 545 270" stroke="url(#wire)" strokeWidth="1.4" fill="none" />
          <path d="M455 146 C 515 140, 490 262, 545 274" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />
        </svg>
        <FlowCard label="Your terminal" lines={[
          ['$ ', 'icarus connect', ''],
          ['', 'browser opened · signed in as ', '@you'],
          ['', 'memory · harness · agent bus ', 'unlocked'],
          ['$ ', 'icarus recall ', '"reading group"'],
        ]} meta="CET · local first" />
        <div className="md:mt-24">
          <FlowCard label="Your profile & forum" lines={[
            ['if ', 'a thread mentions ', '.amr layout'],
            ['', 'reply with what you ', 'measured'],
            ['then ', 'invite your lab to ', 'review'],
          ]} meta="dev.singulancelabs.com" />
        </div>
      </div>
    </div>
  );
}

const FlowCard = ({ label, lines, meta }) => (
  <div className="relative min-w-0">
    <p className={`${MONO} mb-3 text-[10px] text-white/70`}>{label}</p>
    <div className="rounded-2xl border bg-[#101011] font-['JetBrains_Mono'] text-[13px] leading-[2.1] md:text-[14px]" style={{ borderColor: 'rgba(255,255,255,0.14)', boxShadow: '0 0 0 6px rgba(255,255,255,0.025)' }}>
      <div className="px-5 py-5">
        {lines.map(([kw, text, hi], i) => (
          <div key={i} className="truncate text-white/85">
            {kw && <span className="text-emerald-400">{kw}</span>}{text}{hi && <span className="text-amber-300 underline decoration-amber-300/50 decoration-dotted underline-offset-4">{hi}</span>}
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t px-5 py-3 text-[11px] text-white/40" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>{meta}</div>
    </div>
  </div>
);

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
  const facts = (stats?.members || 0) >= 50
    ? [[stats.members.toLocaleString(), 'Members'], [stats.affiliations.toLocaleString(), 'Universities and labs'], [stats.threads.toLocaleString(), 'Threads'], ['€0', 'Free, forever']]
    : FACTS;
  const [lead, ...rest] = PRODUCTS;
  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter'] [color-scheme:dark]">
      <Helmet>
        <title>SINGULANCE Developers: build the future in the open</title>
        <meta name="description" content="Join the SINGULANCE developer community. Use frontier research and open ICARUS tools for free, collaborate across universities and labs, and build startups together." />
        <meta name="theme-color" content="#060606" />
        <link rel="canonical" href={`${ORIGIN}/`} />
      </Helmet>

      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <EmberField />
        <Nav overlay />
        <p className={`${MONO} absolute inset-x-0 top-24 hidden text-center sm:block text-[11px] text-black/60`}>SINGULANCE · Developer account · {new Date().getFullYear()}</p>
        <div className="relative mx-auto flex min-h-[100svh] max-w-[1240px] flex-col items-center justify-end px-4 pb-16 pt-40 text-center sm:px-6 md:pb-20">
          <p className={`${MONO} text-[11px] text-white/90`}>The official SINGULANCE developer community</p>
          <h1 className={`${SERIF} mt-5 text-[56px] leading-[0.95] text-white sm:text-[84px] md:text-[116px]`}>Build the future<br />in the open.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-7 text-white/65 md:text-[17px]">
            One free account for our frontier research and open-source tools, and a community of people from universities, labs and startups building what comes next.
          </p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link to={cta.to} className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3.5 text-[14px] font-semibold text-black hover:bg-white/90">
              {cta.label} <ArrowRight size={16} />
            </Link>
            <Link to="/tools" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-black/30 px-6 py-3.5 text-[14px] font-medium text-white backdrop-blur hover:bg-white/10">
              Explore tools and research
            </Link>
          </div>
          <dl className="mt-16 grid w-full grid-cols-2 gap-y-8 border-t border-white/10 pt-8 text-left md:grid-cols-4">
            {facts.map(([n, label]) => (
              <div key={label} className="min-w-0 px-1">
                <dd className="text-[30px] font-light tracking-tight text-white md:text-[38px]">{n}</dd>
                <dt className="mt-1 text-[13px] text-white/45">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 md:py-32">
        <SectionHead center eyebrow="Open source" title="A production-ready toolkit." body="The ICARUS family runs SINGULANCE's own agents. Every tool is free with your developer account, and the source is on GitHub." />
        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ToolTile product={lead} large />
          {rest.slice(0, 2).map((p) => <ToolTile key={p.name} product={p} />)}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {rest.slice(2).map((p) => <ToolTile key={p.name} product={p} />)}
          <div className="flex min-w-0 flex-col justify-between border p-6 md:p-7" style={{ borderColor: BORDER }}>
            <div>
              <p className={`${MONO} text-[10px] text-white/45`}>Install</p>
              <p className="mt-2 text-[22px] font-medium tracking-tight text-white">One line. Every platform.</p>
              <p className="mt-2 text-[14px]" style={{ color: MUTED }}>macOS, Linux and Windows. Local memory works straight away, no account needed.</p>
            </div>
            <div className="mt-6"><CopyBlock text={ICARUS_INSTALL} label="install command" /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6 md:pb-32">
        <SectionHead eyebrow="How it connects" title="From your terminal to the whole community."
          body="One identity links the tools on your machine to your public profile, so what you build and what you discuss stay connected." />
        <div className="mt-12"><ConnectorFlow /></div>
      </section>

      <section className="border-y bg-[#0b0910]" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 md:py-32">
          <SectionHead eyebrow="Who it's for" title="One community, across campuses, labs and startups." />
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            {AUDIENCES.map(({ pattern, title, body }) => (
              <article key={title} className="flex min-w-0 flex-col border" style={{ borderColor: 'rgba(233,168,240,0.45)' }}>
                <div className="h-56 overflow-hidden border-b" style={{ borderColor: 'rgba(233,168,240,0.45)' }}><Halftone pattern={PATTERNS[pattern]} color="#E9A8F0" cols={46} rows={28} /></div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[30px] font-medium leading-[1.05] tracking-tight text-white">{title}</h3>
                  <p className="mb-8 mt-4 text-[14px] leading-relaxed" style={{ color: MUTED }}>{body}</p>
                  <Link to={cta.to} className={`${MONO} mt-auto block bg-[#E9A8F0] py-2.5 text-center text-[11px] text-[#1a1020] hover:bg-[#f3c4f7]`}>Get started</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 md:py-32">
        <SectionHead eyebrow="Research" title="Read the work. Run it yourself." body="Our papers and benchmarks are open to every member. Discuss them in the forum and build on them."
          action={<TextLink href="https://singulancelabs.com/research">All research</TextLink>} />
        <ol className="mt-12 border-t" style={{ borderColor: BORDER }}>
          {RESEARCH.map((r, i) => (
            <li key={r.href} className="border-b" style={{ borderColor: BORDER }}>
              <a href={r.href} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 py-6 md:grid-cols-[4rem_minmax(0,1fr)_10rem_auto]">
                <span className="font-['JetBrains_Mono'] text-[12px] text-white/35">{String(i + 1).padStart(2, '0')}</span>
                <span className={`${SERIF} truncate text-[24px] text-white transition-colors group-hover:text-[#ff9a6b] md:text-[34px]`}>{r.title}</span>
                <span className={`${MONO} hidden text-[10px] text-white/40 md:block`}>{r.tag}</span>
                <ArrowUpRight size={20} className="text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-4 pb-24 sm:px-6 md:pb-32 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionHead eyebrow="Playground" title="Happening now." action={<TextLink to="/forum">All threads</TextLink>} />
          <div className="mt-10 divide-y divide-white/[0.08] overflow-hidden rounded-xl border" style={{ borderColor: BORDER }}>
            {posts.length ? posts.map((p) => <ThreadRow key={p.id} post={p} />) : (
              <div className="px-6 py-10">
                <p className="font-medium text-white">The first threads are waiting to be written.</p>
                <p className="mt-1 text-[14px]" style={{ color: MUTED }}>Start a reading group, ask about the tools or pitch what you want to build.</p>
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className={`${MONO} text-[11px] text-white/45 lg:mt-[118px]`}>New members</p>
          <div className="mt-4 rounded-xl border p-5" style={{ borderColor: BORDER }}>
            {members.length ? (
              <ul className="space-y-4">
                {members.slice(0, 6).map((m) => (
                  <li key={m.handle}>
                    <Link to={`/u/${m.handle}`} className="flex items-center gap-3">
                      <Avatar member={m} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-white">{m.name}</span>
                        <span className="block truncate text-[12px]" style={{ color: MUTED }}>{[ROLES.find((r) => r.id === m.role)?.label, m.affiliation].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px]" style={{ color: MUTED }}>Be one of the first members.</p>}
          </div>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: BORDER }}>
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-14 px-4 py-24 sm:px-6 md:py-32 lg:grid-cols-2">
          <div className="min-w-0">
            <Eyebrow>[ Community principles ]</Eyebrow>
            <h2 className={`${SERIF} mt-4 text-[40px] leading-tight text-white md:text-[52px]`}>How we work together.</h2>
            <dl className="mt-10 space-y-7">
              {PRINCIPLES.map(([title, body], i) => (
                <div key={title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                  <span className="font-['JetBrains_Mono'] text-[12px] text-[#ff8a6b]">0{i + 1}</span>
                  <div><dt className="font-medium text-white">{title}</dt><dd className="mt-1 text-[14px] leading-relaxed" style={{ color: MUTED }}>{body}</dd></div>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0">
            <Eyebrow>[ Questions ]</Eyebrow>
            <h2 className={`${SERIF} mt-4 text-[40px] leading-tight text-white md:text-[52px]`}>Before you join.</h2>
            <div className="mt-10 divide-y divide-white/[0.08] border-y" style={{ borderColor: BORDER }}>
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-5" style={{ borderColor: BORDER }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">{q}<Plus size={16} className="shrink-0 text-white/50 transition-transform group-open:rotate-45" /></summary>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: MUTED }}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <EmberField flip />
        <div className="relative mx-auto max-w-[1240px] px-4 pb-40 pt-32 text-center sm:px-6 md:pb-56 md:pt-44">
          <h2 className={`${SERIF} mx-auto max-w-4xl text-[48px] leading-[0.98] text-white md:text-[96px]`}>Bring your university.<br />Bring your idea.</h2>
          <p className="mx-auto mt-6 max-w-xl text-[16px] text-white/70">Let&apos;s start working for a better future, together and in the open.</p>
          <Link to={cta.to} className="mt-10 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3.5 text-[14px] font-semibold text-black hover:bg-white/90">{cta.label} <ArrowRight size={16} /></Link>
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
    <div className="rounded-2xl border bg-[#0d0d0e] p-6 md:p-8" style={{ borderColor: BORDER }}>
      <Eyebrow>Step 1 of 2</Eyebrow>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Sign in or create your account</h2>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>Your SINGULANCE identity works across every product. Already use ICARUS or HIVEMIND? You&apos;re one step from your profile.</p>
      <a href={apiClient.getGoogleLoginUrl(returnTo)} className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-lg border text-[14px] font-semibold hover:bg-white/[0.04]" style={{ borderColor: BORDER }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </a>
      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/35"><span className="h-px flex-1 bg-white/10" />or email<span className="h-px flex-1 bg-white/10" /></div>
      {config && !config.enabled ? (
        <p className="text-[14px]" style={{ color: MUTED }}>Email sign-in is unavailable right now. Use Google, or try again later.</p>
      ) : !challenge ? (
        <form onSubmit={start} className="space-y-3">
          <label className="block">
            <span className="sr-only">Email address</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu"
              className="h-12 w-full rounded-lg border bg-[#0d0d0e] px-4 text-[14px] outline-none focus:border-white/40" style={{ borderColor: BORDER }} />
          </label>
          {needsTurnstile && <EmailTurnstile siteKey={config.turnstile_site_key} onToken={setToken} onStatus={setTurnstileStatus} />}
          <button type="submit" disabled={state.busy || (needsTurnstile && !token)} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-[14px] font-semibold text-black disabled:opacity-50">
            {state.busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">6-digit code sent to {email}</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 w-full rounded-lg border bg-[#0d0d0e] px-4 font-mono text-[18px] tracking-[0.4em] outline-none focus:border-white/40" style={{ borderColor: BORDER }} />
          </label>
          <button type="submit" disabled={state.busy || code.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-[14px] font-semibold text-black disabled:opacity-50">
            {state.busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Verify and continue
          </button>
          <button type="button" onClick={() => { setChallenge(''); setCode(''); setState({ busy: false, message: '', error: false }); }} className="w-full text-[13px] font-medium" style={{ color: MUTED }}>Use a different email</button>
        </form>
      )}
      {state.message && <p role="status" className={`mt-4 text-[13px] ${state.error ? 'text-red-400' : ''}`} style={state.error ? undefined : { color: MUTED }}>{state.message}</p>}
      {!BROWSER_SIGNUP && (
        <div className="mt-6 rounded-lg bg-white/[0.04] p-4">
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
  const field = 'mt-1.5 w-full rounded-lg border bg-[#0d0d0e] px-3.5 py-2.5 text-[14px] outline-none focus:border-white/40';
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="block"><span className="text-[13px] font-medium">Name</span>
        <input required maxLength={60} value={form.name} onChange={set('name')} className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Handle</span>
        <div className="relative"><span className="pointer-events-none absolute left-3.5 top-[17px] text-[14px] text-white/35">@</span>
          <input required minLength={3} maxLength={24} pattern="[a-z0-9][a-z0-9-]{2,23}" value={form.handle} onChange={set('handle')} className={`${field} pl-8`} style={{ borderColor: BORDER }} /></div></label>
      <label className="block"><span className="text-[13px] font-medium">I am a</span>
        <select value={form.role} onChange={set('role')} className={field} style={{ borderColor: BORDER }}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select></label>
      <label className="block"><span className="text-[13px] font-medium">University, lab or company</span>
        <input maxLength={80} value={form.affiliation} onChange={set('affiliation')} placeholder="e.g. Leibniz Universität Hannover" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block sm:col-span-2"><span className="text-[13px] font-medium">About you</span>
        <textarea maxLength={400} rows={3} value={form.bio} onChange={set('bio')} placeholder="What are you working on? What would you like to build?" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Interests <span className="font-normal text-white/35">(comma separated)</span></span>
        <input value={form.interests} onChange={set('interests')} placeholder="agents, memory, robotics" className={field} style={{ borderColor: BORDER }} /></label>
      <label className="block"><span className="text-[13px] font-medium">Links <span className="font-normal text-white/35">(up to 3, https)</span></span>
        <input value={form.links} onChange={set('links')} placeholder="https://github.com/you" className={field} style={{ borderColor: BORDER }} /></label>
      {state.error && <p role="alert" className="text-[13px] text-red-400 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state.busy} className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-black disabled:opacity-50">
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
          <Eyebrow>[ Join SINGULANCE Developers ]</Eyebrow>
          <h1 className={`${SERIF} mt-4 text-[44px] leading-[1.02] text-white md:text-[68px]`}>Your seat at the lab.</h1>
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
                <div className="rounded-2xl border bg-[#0d0d0e] p-6 md:p-8" style={{ borderColor: BORDER }}>
                  <Eyebrow>Step 2 of 2</Eyebrow>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">Create your member profile</h2>
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
    <div className="rounded-2xl border bg-[#0d0d0e] p-6 md:p-8" style={{ borderColor: BORDER }}>
      <div className="flex items-start gap-4">
        <Avatar member={member} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className={`${SERIF} truncate text-[32px] leading-tight text-white md:text-[40px]`}>{member.name}</h1>
          <p className="mt-1 text-[14px]" style={{ color: MUTED }}>@{member.handle} · {[ROLES.find((r) => r.id === member.role)?.label, member.affiliation].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {member.bio && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed">{member.bio}</p>}
      {member.interests?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">{member.interests.map((t) => <span key={t} className="rounded-full bg-white/[0.07] px-3 py-1 text-[12px] text-white/70">{t}</span>)}</div>
      )}
      {member.links?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-[13px] font-medium">{member.links.map((l) => <a key={l} href={l} rel="noopener noreferrer nofollow ugc" target="_blank" className="truncate hover:underline">{l.replace(/^https:\/\//, '')}</a>)}</div>
      )}
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">Member since {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
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
            <div className="rounded-2xl border bg-[#0d0d0e] p-6" style={{ borderColor: BORDER }}>
              <h2 className="mb-5 text-xl font-semibold">Edit profile</h2>
              <ProfileForm initial={session.member} submitLabel="Save profile" onSaved={() => setEditing(false)} />
            </div>
          ) : (
            <MemberCard member={session.member}>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => setEditing(true)} className="rounded-lg border px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]" style={{ borderColor: BORDER }}>Edit profile</button>
                <Link to={`/u/${session.member.handle}`} className="rounded-lg border px-4 py-2 text-[13px] font-semibold hover:bg-white/[0.04]" style={{ borderColor: BORDER }}>View public page</Link>
              </div>
            </MemberCard>
          )}
          <div className="rounded-2xl border bg-[#0d0d0e] p-6" style={{ borderColor: BORDER }}>
            <h2 className="text-lg font-semibold">Connect your terminal</h2>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>Link this account once and every ICARUS tool on that machine uses it.</p>
            <div className="mt-4"><CopyBlock text="icarus connect" label="connect command" /></div>
          </div>
        </div>
        <div className="min-w-0">
          <Eyebrow>[ Your access ]</Eyebrow>
          <h2 className={`${SERIF} mt-3 text-[36px] leading-tight text-white md:text-[48px]`}>Everything is unlocked.</h2>
          <ToolGrid compact />
          <h3 className="mt-10 text-lg font-semibold">Research</h3>
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
            <h2 className="text-xl font-semibold">Threads</h2>
            <div className="mt-4 divide-y divide-white/[0.08] overflow-hidden rounded-xl border bg-[#0d0d0e]" style={{ borderColor: BORDER }}>
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
        <article key={p.name} className="flex min-w-0 flex-col rounded-xl border bg-[#0d0d0e] p-5" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight"><span className="text-white/45">ICARUS</span> {p.name}</h3>
            <span className="shrink-0 rounded bg-white/[0.07] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50">{p.status}</span>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>{p.line}</p>
          {p.command && !compact && <div className="mt-4"><CopyBlock text={p.command} label={`ICARUS ${p.name} commands`} /></div>}
          <div className="mt-auto flex flex-wrap gap-4 pt-4 text-[13px] font-semibold">
            {p.docs && <a href={p.docs} className="inline-flex items-center gap-1 hover:underline">Docs <ArrowRight size={14} /></a>}
            {p.repo ? <a href={p.repo} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"><Github size={14} /> Source</a> : <span className="text-white/35">Source opens with the public release</span>}
          </div>
        </article>
      ))}
    </div>
  );
}

const ResearchList = () => (
  <div className="mt-4 divide-y divide-white/[0.08] overflow-hidden rounded-xl border bg-[#0d0d0e]" style={{ borderColor: BORDER }}>
    {RESEARCH.map((r) => (
      <a key={r.href} href={r.href} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04]">
        <span className="min-w-0"><span className="block font-mono text-[10px] uppercase tracking-wider text-white/35">{r.tag}</span><span className="block truncate text-[15px] font-semibold">{r.title}</span></span>
        <ArrowRight size={16} className="shrink-0 text-white/45" />
      </a>
    ))}
  </div>
);

function Tools() {
  return (
    <Page title="Tools & research">
      <Eyebrow>[ Open source · free with your account ]</Eyebrow>
      <h1 className={`${SERIF} mt-4 text-[44px] leading-[1.02] text-white md:text-[72px]`}>Tools and research.</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-7" style={{ color: MUTED }}>Everything SINGULANCE publishes for developers. Install a tool, read the paper behind it, then tell the forum what you built.</p>
      <ToolGrid />
      <h2 className={`${SERIF} mt-20 text-[36px] leading-tight text-white md:text-[48px]`}>Research</h2>
      <ResearchList />
    </Page>
  );
}

/* ───────────────────────── Forum ───────────────────────── */

function ThreadRow({ post }) {
  const channel = CHANNELS.find((c) => c.id === post.channel);
  return (
    <Link to={`/forum/${post.id}`} className="flex gap-4 bg-[#0d0d0e] px-5 py-4 transition-colors hover:bg-white/[0.03]">
      <Avatar member={post.author} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
          <span className="font-semibold text-white/80">{post.author.name || `@${post.author.handle}`}</span>
          <span>in</span>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-white/70">{channel?.label || post.channel}</span>
          <span>·</span><span>{timeAgo(post.lastActivity)}</span>
        </div>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>{post.excerpt}</p>
      </div>
      <span className="hidden shrink-0 flex-col items-end text-right sm:flex">
        <span className="text-[18px] font-semibold leading-none">{post.replyCount}</span>
        <span className="mt-1 text-[11px] text-white/45">{post.replyCount === 1 ? 'reply' : 'replies'}</span>
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
      <Link to="/join" className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-[#0d0d0e] px-5 py-4 text-[14px] font-medium hover:bg-white/[0.04]" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
        <span>Join free to start a thread or reply</span><ArrowRight size={16} />
      </Link>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl border bg-[#0d0d0e] px-5 py-4 text-left text-[14px] hover:bg-white/[0.04]" style={{ borderColor: BORDER, color: MUTED }}>
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
  const field = 'w-full rounded-lg border bg-[#0d0d0e] px-3.5 py-2.5 text-[14px] outline-none focus:border-white/40';
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-[#0d0d0e] p-5" style={{ borderColor: BORDER }}>
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <button key={c.id} type="button" onClick={() => setForm((f) => ({ ...f, channel: c.id }))}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${form.channel === c.id ? 'border-white bg-white text-black' : ''}`} style={form.channel === c.id ? undefined : { borderColor: BORDER }}>{c.label}</button>
        ))}
      </div>
      <input required minLength={4} maxLength={140} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className={`${field} font-semibold`} style={{ borderColor: BORDER }} />
      <textarea required maxLength={8000} rows={6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Say more. Links, papers and repos welcome." className={field} style={{ borderColor: BORDER }} />
      {state.error && <p role="alert" className="text-[13px] text-red-400">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ color: MUTED }}>Cancel</button>
        <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50">
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
  const tab = (on) => `shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${on ? 'bg-white text-black' : 'text-white/80 hover:bg-white/[0.06]'}`;
  return (
    <Page title={active ? `${active.label} · Forum` : 'Forum'}>
      <header className="flex flex-col gap-5 border-b pb-8 md:flex-row md:items-end md:justify-between" style={{ borderColor: BORDER }}>
        <div className="min-w-0">
          <Eyebrow>[ Playground ]</Eyebrow>
          <h1 className={`${SERIF} mt-3 text-[44px] leading-[1.02] text-white md:text-[64px]`}>{active ? active.label : 'Forum'}</h1>
          <p className="mt-2 text-[15px]" style={{ color: MUTED }}>{active ? active.blurb : 'Share research, ask for help, find collaborators and show what you built.'}</p>
        </div>
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Search threads</span>
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search threads" className="h-11 w-full rounded-lg border bg-[#0d0d0e] pl-10 pr-3 text-[14px] outline-none focus:border-white/40" style={{ borderColor: BORDER }} />
        </label>
      </header>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="min-w-0">
          <p className="mb-2 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-white/35 md:block">Channels</p>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible">
            <Link to="/forum" className={tab(!channel)}>All threads</Link>
            {CHANNELS.map((c) => (
              <Link key={c.id} to={`/forum/${c.id}`} className={tab(channel === c.id)}>
                {c.label}<span className={`hidden text-[11px] font-normal md:block ${channel === c.id ? 'text-black/50' : 'text-white/45'}`}>{c.blurb}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 space-y-4">
          <Composer channel={channel} onCreated={(post) => navigate(`/forum/${post.id}`)} />
          <div className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border" style={{ borderColor: BORDER }}>
            {data.loading ? <div className="flex h-40 items-center justify-center bg-[#0d0d0e]"><Loader2 className="animate-spin" /></div>
              : data.error ? <p className="bg-[#0d0d0e] px-5 py-8 text-[14px]" style={{ color: MUTED }}>The forum is briefly unavailable. Refresh in a moment.</p>
                : shown.length ? shown.map((p) => <ThreadRow key={p.id} post={p} />)
                  : <div className="bg-[#0d0d0e] px-6 py-12 text-center"><p className="font-semibold">{needle ? 'No threads match that search.' : 'No threads here yet.'}</p><p className="mt-1 text-[14px]" style={{ color: MUTED }}>{needle ? 'Try another word, or start the thread yourself.' : 'Start the first one. Good first threads say who you are and what you want to build.'}</p></div>}
          </div>
          {data.next && !needle && <button type="button" onClick={() => load(data.next)} className="w-full rounded-lg border bg-[#0d0d0e] py-3 text-[13px] font-semibold hover:bg-white/[0.04]" style={{ borderColor: BORDER }}>Load more</button>}
        </section>
        <aside className="hidden min-w-0 xl:block">
          <div className="rounded-xl border bg-[#0d0d0e] p-5" style={{ borderColor: BORDER }}>
            <p className="text-[15px] font-semibold">Community principles</p>
            <ul className="mt-3 space-y-3">
              {PRINCIPLES.map(([title, body]) => (
                <li key={title}><p className="text-[13px] font-semibold">{title}</p><p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>{body}</p></li>
              ))}
            </ul>
          </div>
          <Link to="/tools" className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-[#0d0d0e] p-5 hover:bg-white/[0.04]" style={{ borderColor: BORDER }}>
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
        <article className="mt-4 rounded-2xl border bg-[#0d0d0e] p-6 md:p-8" style={{ borderColor: BORDER }}>
          <h1 className={`${SERIF} text-[32px] leading-[1.1] text-white md:text-[44px]`}>{post.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <Link to={`/u/${post.author.handle}`} className="flex items-center gap-2.5"><Avatar member={post.author} size={32} /><span className="text-[14px] font-semibold">{post.author.name}</span></Link>
            <span className="text-[12px] text-white/45">{timeAgo(post.createdAt)}</span>
            {post.mine && <button type="button" onClick={removePost} aria-label="Delete thread" className="ml-auto text-white/35 hover:text-red-400"><Trash2 size={15} /></button>}
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-7">{post.body}</p>
        </article>
        <h2 className="mt-8 text-lg font-semibold">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</h2>
        <div className="mt-4 space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="rounded-xl border bg-[#0d0d0e] p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2.5">
                <Link to={`/u/${r.author.handle}`} className="flex items-center gap-2"><Avatar member={r.author} size={26} /><span className="text-[13px] font-semibold">{r.author.name}</span></Link>
                <span className="text-[12px] text-white/45">{timeAgo(r.createdAt)}</span>
                {r.mine && <button type="button" onClick={() => removeReply(r.id)} aria-label="Delete reply" className="ml-auto text-white/35 hover:text-red-400"><Trash2 size={14} /></button>}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          {session.member ? (
            <form onSubmit={send} className="space-y-3 rounded-xl border bg-[#0d0d0e] p-5" style={{ borderColor: BORDER }}>
              <textarea required maxLength={4000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply" className="w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none focus:border-white/40" style={{ borderColor: BORDER }} />
              {state.error && <p role="alert" className="text-[13px] text-red-400">{state.error}</p>}
              <div className="flex justify-end"><button type="submit" disabled={state.busy || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50">{state.busy && <Loader2 size={14} className="animate-spin" />} Reply</button></div>
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

