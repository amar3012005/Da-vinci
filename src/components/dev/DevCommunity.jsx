import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, BookOpen, Check, Github, GraduationCap, Loader2, LogIn, Mail, MessageSquare, Plus, Rocket,
  Trash2, UserRound, Wrench,
} from 'lucide-react';
import apiClient from '../hivemind/app/shared/api-client';
import EmailTurnstile from '../hivemind/app/auth/EmailTurnstile';
import CopyBlock from '../icarus/CopyBlock';
import { ICARUS_INSTALL, PRODUCTS } from '../icarus/products';
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
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden items-center gap-6 sm:flex">
            <NavLink to="/forum" className={link}>Forum</NavLink>
            <NavLink to="/tools" className={link}>Tools &amp; research</NavLink>
          </div>
          {session.member ? (
            <Link to="/profile" className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>
              <UserRound size={13} /> @{session.member.handle}
            </Link>
          ) : (
            <Link to="/join" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white" style={{ background: EMBER }}>
              Join free
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-5 px-4 pb-2.5 sm:hidden">
        <NavLink to="/forum" className={link}>Forum</NavLink>
        <NavLink to="/tools" className={link}>Tools &amp; research</NavLink>
      </div>
    </nav>
  );
}

const Footer = () => (
  <footer className="border-t" style={{ borderColor: BORDER }}>
    <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-[12px] text-[#8a8a82] sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>SINGULANCE Developers · Singulance UG (haftungsbeschränkt) i.G., Hannover</span>
      <span className="flex gap-4">
        <a href="https://singulancelabs.com/research" className="hover:text-black">Research</a>
        <a href="https://singulancelabs.com/privacy" className="hover:text-black">Privacy</a>
        <a href="https://github.com/amar3012005" className="hover:text-black">GitHub</a>
      </span>
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

/* ───────────────────────── Home ───────────────────────── */

const OFFERS = [
  { icon: BookOpen, title: 'Frontier research, free', body: 'Memory filesystems, swarm intelligence, post-quantum security. Read the work and build on it.' },
  { icon: Wrench, title: 'Open ICARUS tools', body: 'Memory, Harness, Agent Bus and Computer Use. Install in one line, under one account.' },
  { icon: MessageSquare, title: 'A playground to think out loud', body: 'Share papers, ask for help, show what you built, start reading groups.' },
  { icon: Rocket, title: 'Build startups together', body: 'Find co-founders across universities and labs, and turn open source into companies.' },
];

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
  const cta = session.member ? { to: '/forum', label: 'Open the forum' } : { to: '/join', label: 'Join the community, free' };
  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter']">
      <Helmet>
        <title>SINGULANCE Developers: build the future in the open</title>
        <meta name="description" content="Join the SINGULANCE developer community. Use frontier research and open ICARUS tools for free, collaborate across universities and labs, and build startups together." />
        <link rel="canonical" href={`${ORIGIN}/`} />
      </Helmet>
      <section className="relative overflow-hidden bg-[#0b0b0d] text-white">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 78% 8%, rgba(255,82,41,0.38), transparent 70%), radial-gradient(45% 40% at 8% 92%, rgba(17,125,255,0.22), transparent 70%)' }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
        <Nav dark />
        <div className="relative mx-auto max-w-[1200px] px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24">
          <Eyebrow color="#ff8a6b">SINGULANCE developer account · free</Eyebrow>
          <h1 className="font-['Space_Grotesk'] mt-5 max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-[84px]">
            Build the future<br />in the open.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] font-light leading-8 text-white/75 md:text-lg">
            Join SINGULANCE&apos;s developer community. Use our frontier research and open tools for free, meet people from universities, labs and startups, and build what comes next together.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to={cta.to} className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02]" style={{ background: EMBER }}>
              {cta.label} <ArrowRight size={16} />
            </Link>
            <Link to="/forum" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-white/10">
              Explore the forum
            </Link>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[['Members', stats?.members], ['Institutions', stats?.affiliations], ['Threads', stats?.threads]].map(([label, n]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</dt>
                <dd className="font-['Space_Grotesk'] mt-1 text-3xl font-semibold md:text-4xl">{n ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <Eyebrow color={EMBER}>What you get</Eyebrow>
        <h2 className="font-['Space_Grotesk'] mt-3 max-w-3xl text-[34px] font-semibold leading-tight tracking-tight md:text-5xl">One account opens the whole lab.</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff1ec]" style={{ color: EMBER }}><Icon size={19} /></span>
              <h3 className="font-['Space_Grotesk'] mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:py-24">
          <div className="min-w-0">
            <Eyebrow color={EMBER}>How it works</Eyebrow>
            <h2 className="font-['Space_Grotesk'] mt-3 text-[34px] font-semibold leading-tight tracking-tight md:text-5xl">From sign-up to shipping in an afternoon.</h2>
          </div>
          <ol className="min-w-0 space-y-6">
            {[
              ['01', 'Join with email or Google', 'Free. No card, no company workspace. Your SINGULANCE identity works across every product.'],
              ['02', 'Make your profile', 'Say where you study or build and what you care about, so the right people find you.'],
              ['03', 'Use the tools and research', 'Install ICARUS, read the papers, run the experiments yourself.'],
              ['04', 'Post, team up, ship', 'Start a thread, join a reading group, find a co-founder, show what you made.'],
            ].map(([n, title, body]) => (
              <li key={n} className="flex gap-5">
                <span className="font-mono text-[12px] text-[#a3a3a3]">{n}</span>
                <div><p className="font-semibold">{title}</p><p className="mt-1 text-[14px] leading-relaxed" style={{ color: MUTED }}>{body}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:py-24">
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight md:text-3xl">Happening in the forum</h2>
            <Link to="/forum" className="shrink-0 text-[13px] font-semibold hover:underline">All threads →</Link>
          </div>
          <div className="mt-6 divide-y overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
            {posts.length ? posts.map((p) => <ThreadRow key={p.id} post={p} />) : (
              <p className="px-5 py-8 text-[14px]" style={{ color: MUTED }}>The first threads are waiting to be written. Start one about what you are building.</p>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight md:text-3xl">New members</h2>
          <div className="mt-6 rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
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
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl bg-[#0b0b0d] px-6 py-14 text-center text-white md:py-20">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 80% at 50% 0%, rgba(255,82,41,0.35), transparent 70%)' }} />
          <div className="relative">
            <GraduationCap className="mx-auto" size={28} style={{ color: '#ff8a6b' }} />
            <h2 className="font-['Space_Grotesk'] mx-auto mt-4 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight md:text-5xl">Bring your university. Bring your idea.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/70">Let&apos;s start working for a better future, together and in the open.</p>
            <Link to={cta.to} className="mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-[14px] font-semibold text-white" style={{ background: EMBER }}>{cta.label} <ArrowRight size={16} /></Link>
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
    <Link to={`/forum/${post.id}`} className="block px-5 py-4 transition-colors hover:bg-[#f6f5ef]">
      <div className="flex items-center gap-2 text-[11px] text-[#8a8a82]">
        <span className="rounded bg-[#f3f2ec] px-1.5 py-0.5 font-mono uppercase tracking-wider">{channel?.label || post.channel}</span>
        <span>@{post.author.handle}</span><span>·</span><span>{timeAgo(post.lastActivity)}</span>
      </div>
      <h3 className="mt-1.5 text-[15px] font-semibold leading-snug">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: MUTED }}>{post.excerpt}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#8a8a82]"><MessageSquare size={12} /> {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</p>
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
  const load = useCallback(async (before = '') => {
    try {
      const d = await devApi.posts({ channel: channel || '', before });
      setData((prev) => ({ posts: before ? [...prev.posts, ...d.posts] : d.posts, next: d.next, loading: false, error: false }));
    } catch { setData((prev) => ({ ...prev, loading: false, error: true })); }
  }, [channel]);
  useEffect(() => { setData({ posts: [], next: null, loading: true, error: false }); load(); }, [load]);
  const active = CHANNELS.find((c) => c.id === channel);
  return (
    <Page title={active ? `${active.label} · Forum` : 'Forum'}>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Eyebrow color={EMBER}>Playground</Eyebrow>
          <h1 className="font-['Space_Grotesk'] mt-2 text-3xl font-semibold tracking-tight">Forum</h1>
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible">
            <Link to="/forum" className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium ${!channel ? 'bg-black text-white' : 'hover:bg-[#f0efe9]'}`}>All threads</Link>
            {CHANNELS.map((c) => (
              <Link key={c.id} to={`/forum/${c.id}`} className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium ${channel === c.id ? 'bg-black text-white' : 'hover:bg-[#f0efe9]'}`}>
                {c.label}<span className={`hidden text-[11px] font-normal md:block ${channel === c.id ? 'text-white/60' : 'text-[#8a8a82]'}`}>{c.blurb}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 space-y-4">
          <Composer channel={channel} onCreated={(post) => navigate(`/forum/${post.id}`)} />
          <div className="divide-y overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
            {data.loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin" /></div>
              : data.error ? <p className="px-5 py-8 text-[14px]" style={{ color: MUTED }}>The forum is briefly unavailable. Refresh in a moment.</p>
                : data.posts.length ? data.posts.map((p) => <ThreadRow key={p.id} post={p} />)
                  : <p className="px-5 py-8 text-[14px]" style={{ color: MUTED }}>No threads here yet. Start the first one.</p>}
          </div>
          {data.next && <button type="button" onClick={() => load(data.next)} className="w-full rounded-lg border bg-white py-3 text-[13px] font-semibold hover:bg-[#f6f5ef]" style={{ borderColor: BORDER }}>Load more</button>}
        </section>
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

