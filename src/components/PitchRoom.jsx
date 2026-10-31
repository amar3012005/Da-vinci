import React from 'react';

/**
 * PitchRoom — pitch.singulancelabs.com. One public page that holds the
 * product deck, sales deck, investor deck, market map and ICARUS research.
 * Decks render as stacked slide images from /pitch/<deck>/NN.jpg; the market
 * map and research views embed /pitch/market-map.html in embed mode.
 */

const DECKS = {
  product: { label: 'Product', title: 'Product deck', slides: 14, pdf: '/pitch/SINGULANCE-Product-Deck-2026.pdf', intro: 'What SINGULANCE is: Runtime, HIVEMIND, HyperAgents, ICARUS and TARA, and how a commitment becomes completed work.' },
  sales: { label: 'Sales', title: 'Sales deck', slides: 17, pdf: '/pitch/SINGULANCE-Sales-Deck-2026.pdf', intro: 'For buyers: the problem, the proactive era, how it works, trust and control, proof, and how to start with a paid activation.' },
  investor: { label: 'Investor', title: 'Investor deck', slides: 20, pdf: '/pitch/SINGULANCE-Investor-Deck-2026.pdf', intro: 'For investors: strategy, market, go-to-market, business model, revenue model, moat, research, competition, traction and the raise.' },
};
const EMBEDS = {
  market: { label: 'Market map', title: 'Market map', hash: 'market', intro: 'Who sells AI to European firms, SMEs and agencies, what they charge, and where SINGULANCE pricing sits.' },
  research: { label: 'Research', title: 'ICARUS research', hash: 'research', intro: 'Every published ICARUS result, with the method and the stated limits beside each number.' },
};
const ORDER = ['product', 'sales', 'investor', 'market', 'research'];

const css = `
.pr{--bg:#FAFAF7;--surface:#FFFFFF;--ink:#0E1D32;--body:#4F5C6B;--muted:#7A8592;--rule:#E3E6E4;--accent:#117DFF;--accent-soft:#E6F0FF;
  background:var(--bg);color:var(--ink);min-height:100vh;font-family:'Space Grotesk',system-ui,sans-serif;
  background-image:radial-gradient(circle,#E9EDF0 1px,transparent 1.2px);background-size:14px 14px}
.pr *{box-sizing:border-box}
.pr-wrap{max-width:1120px;margin:0 auto;padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
.pr-top{display:flex;align-items:center;justify-content:space-between;padding-top:28px}
.pr-brand{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:.16em;font-size:13px;color:var(--ink);text-decoration:none}
.pr-brand img{width:26px;height:26px}
.pr-mono{font-family:'JetBrains Mono',ui-monospace,monospace}
.pr-top a.pr-site{font-size:11px;color:var(--muted);text-decoration:none;letter-spacing:.06em}
.pr-top a.pr-site:hover{color:var(--accent)}
.pr-hero{padding:64px 0 40px;display:grid;grid-template-columns:minmax(0,1fr);gap:36px;align-items:center}
.pr-copy{display:grid;gap:18px;min-width:0}
.pr-fan{position:relative;height:300px;display:none}
.pr-fan button{position:absolute;width:300px;aspect-ratio:16/9;padding:0;border:0;border-radius:10px;overflow:hidden;cursor:pointer;background:#0b0b0b;box-shadow:0 24px 50px -22px rgba(14,29,50,.45);transition:transform .35s cubic-bezier(.16,1,.3,1)}
.pr-fan button img{width:100%;height:100%;object-fit:cover;display:block}
.pr-fan button span{position:absolute;left:10px;bottom:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(14,29,50,.6);padding:3px 8px;border-radius:999px}
.pr-fan .f1{left:0;top:96px;transform:rotate(-7deg)}
.pr-fan .f2{left:80px;top:40px;transform:rotate(1deg);z-index:2}
.pr-fan .f3{left:160px;top:120px;transform:rotate(7deg);z-index:1}
.pr-fan button:hover,.pr-fan button:focus-visible{transform:rotate(0) translateY(-10px) scale(1.04);z-index:3;outline:none}
@media (min-width:960px){.pr-hero{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}.pr-fan{display:block}}
@media (prefers-reduced-motion:reduce){.pr-fan button{transition:none}}
.pr-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.pr-name{font-size:clamp(44px,9vw,104px);font-weight:600;letter-spacing:-.035em;line-height:.95;margin:0}
.pr-tag{font-size:clamp(22px,3.2vw,34px);font-weight:500;letter-spacing:-.02em;line-height:1.15;margin:0;max-width:22ch;text-wrap:balance}
.pr-tag span{color:var(--accent)}
.pr-sub{font-family:'Inter',system-ui,sans-serif;font-size:16px;line-height:1.6;color:var(--body);max-width:60ch;margin:0}
.pr-tabs-bar{position:sticky;top:0;z-index:20;background:rgba(250,250,247,.92);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--rule);padding-top:env(safe-area-inset-top,0px)}
.pr-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.pr-tabs::-webkit-scrollbar{display:none}
.pr-tab{flex:none;appearance:none;border:0;background:none;cursor:pointer;font:inherit;font-size:16px;color:var(--body);padding:16px 16px 14px;border-bottom:2px solid transparent;margin-bottom:-1px;display:flex;align-items:baseline;gap:8px;white-space:nowrap}
.pr-tab small{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted)}
.pr-tab[aria-selected="true"]{color:var(--ink);font-weight:500;border-bottom-color:var(--accent)}
.pr-tab:hover{color:var(--ink)}
.pr-tab:focus-visible,.pr-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.pr-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;padding:36px 0 22px}
.pr-head h2{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}
.pr-head p{font-family:'Inter',system-ui,sans-serif;font-size:14.5px;line-height:1.55;color:var(--body);margin:0;max-width:62ch}
.pr-actions{display:flex;gap:8px;flex-wrap:wrap}
.pr-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 15px;border-radius:999px;font-size:13px;font-weight:500;text-decoration:none;border:1px solid var(--rule);background:var(--surface);color:var(--ink);cursor:pointer;font-family:inherit}
.pr-btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.pr-btn:hover{border-color:var(--accent)}
.pr-slides{display:grid;gap:18px;padding-bottom:56px}
.pr-slide{position:relative;background:#0b0b0b;border-radius:10px;overflow:hidden;box-shadow:0 1px 0 rgba(14,29,50,.04),0 18px 40px -24px rgba(14,29,50,.35);aspect-ratio:16/9}
.pr-slide img{display:block;width:100%;height:100%;object-fit:cover}
.pr-num{position:absolute;right:10px;bottom:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#fff;background:rgba(14,29,50,.55);padding:2px 7px;border-radius:999px}
.pr-frame{width:100%;border:1px solid var(--rule);border-radius:12px;background:var(--bg);display:block;min-height:70vh}
.pr-embed{padding-bottom:56px}
.pr-foot{border-top:1px solid var(--rule);padding:28px 0 calc(40px + env(safe-area-inset-bottom,0px));display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:space-between;font-size:12.5px;color:var(--muted)}
.pr-foot a{color:var(--body)}
@media (max-width:720px){
  .pr-hero{padding:40px 0 26px}
  .pr-full{margin-left:calc(-1 * max(20px,env(safe-area-inset-left,0px)));margin-right:calc(-1 * max(20px,env(safe-area-inset-right,0px)))}
  .pr-slides{gap:8px}
  .pr-slide{border-radius:0;box-shadow:none}
  .pr-frame{border-radius:0;border-left:0;border-right:0}
  .pr-tab{font-size:15px;padding:14px 12px 12px}
  .pr-head{padding:26px 0 16px}
  .pr-head h2{font-size:24px}
}
`;

function readTab() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
  return ORDER.includes(h) ? h : 'product';
}

function Deck({ id }) {
  const deck = DECKS[id];
  const slides = Array.from({ length: deck.slides }, (_, i) => String(i + 1).padStart(2, '0'));
  return (
    <div className="pr-slides pr-full">
      {slides.map((n, i) => (
        <figure key={n} className="pr-slide" style={{ margin: 0 }}>
          <img src={`/pitch/${id}/${n}.jpg`} alt={`${deck.title}, slide ${i + 1} of ${deck.slides}`} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" width="1600" height="900" />
          <span className="pr-num">{i + 1} / {deck.slides}</span>
        </figure>
      ))}
    </div>
  );
}

function Embed({ id }) {
  const ref = React.useRef(null);
  const [height, setHeight] = React.useState(null);
  React.useEffect(() => {
    const frame = ref.current;
    if (!frame) return undefined;
    let observer;
    const measure = () => {
      try {
        const doc = frame.contentDocument;
        if (doc && doc.documentElement) setHeight(doc.documentElement.scrollHeight);
      } catch (error) { /* cross-origin frames cannot be measured; keep the min-height */ }
    };
    const onLoad = () => {
      measure();
      try {
        if (window.ResizeObserver && frame.contentDocument) {
          observer = new window.ResizeObserver(measure);
          observer.observe(frame.contentDocument.body);
        }
      } catch (error) { /* same-origin only */ }
    };
    frame.addEventListener('load', onLoad);
    return () => { frame.removeEventListener('load', onLoad); if (observer) observer.disconnect(); };
  }, [id]);
  return (
    <div className="pr-embed pr-full">
      <iframe ref={ref} key={id} className="pr-frame" title={EMBEDS[id].title} src={`/pitch/market-map.html?embed=1#${EMBEDS[id].hash}`} style={height ? { height } : undefined} />
    </div>
  );
}

export default function PitchRoom() {
  const [tab, setTab] = React.useState(readTab);
  const tabsRef = React.useRef(null);

  React.useEffect(() => {
    document.title = 'SINGULANCE Pitch Room — Proactive intelligence, inside your own walls';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', 'noindex, nofollow');
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const choose = (id) => {
    window.history.replaceState(null, '', `#${id}`);
    setTab(id);
    const bar = tabsRef.current;
    if (bar) bar.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const isDeck = Boolean(DECKS[tab]);
  const meta = isDeck ? DECKS[tab] : EMBEDS[tab];

  return (
    <div className="pr">
      <style>{css}</style>
      <div className="pr-wrap">
        <header className="pr-top">
          <a className="pr-brand" href="https://singulancelabs.com"><img src="/singulance-mark.svg" alt="" />SINGULANCE</a>
          <a className="pr-site pr-mono" href="https://singulancelabs.com">singulancelabs.com ↗</a>
        </header>
        <section className="pr-hero" aria-labelledby="pr-name">
          <div className="pr-copy">
          <div className="pr-eyebrow pr-mono">Pitch room · 2026</div>
          <h1 id="pr-name" className="pr-name">SINGULANCE</h1>
          <p className="pr-tag">Proactive intelligence, <span>inside your own walls.</span></p>
          <p className="pr-sub">Building proactive intelligence for enterprises and their people: one company brain, a governed AI workforce and a voice. Every deck, the market map and our research, in one place.</p>
          </div>
          <div className="pr-fan" aria-label="Open a deck">
            <button type="button" className="f1" onClick={() => choose('product')}><img src="/pitch/product/01.jpg" alt="Product deck cover" /><span>Product</span></button>
            <button type="button" className="f2" onClick={() => choose('sales')}><img src="/pitch/sales/05.jpg" alt="Sales deck: the proactive era" /><span>Sales</span></button>
            <button type="button" className="f3" onClick={() => choose('investor')}><img src="/pitch/investor/15.jpg" alt="Investor deck: research you can inspect" /><span>Investor</span></button>
          </div>
        </section>
      </div>

      <div className="pr-tabs-bar" ref={tabsRef}>
        <div className="pr-wrap">
          <nav className="pr-tabs" role="tablist" aria-label="Pitch materials">
            {ORDER.map((id) => {
              const item = DECKS[id] || EMBEDS[id];
              return (
                <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls="pr-panel" aria-selected={tab === id} className="pr-tab" onClick={() => choose(id)}>
                  {item.label}{DECKS[id] && <small>{DECKS[id].slides}</small>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="pr-wrap" id="pr-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className="pr-head">
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.intro}</p>
          </div>
          <div className="pr-actions">
            {isDeck
              ? <a className="pr-btn primary" href={meta.pdf} download>Download PDF</a>
              : <a className="pr-btn" href={`/pitch/market-map.html#${meta.hash}`} target="_blank" rel="noreferrer">Open full page ↗</a>}
          </div>
        </div>
        {isDeck ? <Deck id={tab} /> : <Embed id={tab} />}
      </main>

      <div className="pr-wrap">
        <footer className="pr-foot">
          <span>© 2026 SINGULANCE · Company-reported figures; sources in the market map.</span>
          <span className="pr-mono">enterprise@singulancelabs.com</span>
        </footer>
      </div>
    </div>
  );
}
