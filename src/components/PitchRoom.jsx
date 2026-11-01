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
const FOUNDER_TAB = { label: 'Founder', title: 'Mind palace', intro: 'Private to founders: every file, contract, deck and checklist across the company, organised by room. Files open from a private EU vault.' };
const ROLE_KEY = 'singulance-pitch-role';

function storage(kind) {
  try { return window[kind]; } catch (error) { return null; } // private windows can block storage; the room still works without it
}

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
.pr-gate{min-height:calc(100vh - 80px);display:flex;flex-direction:column;justify-content:center;gap:14px;padding:40px 0 64px}
.pr-roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:22px;max-width:760px}
.pr-role{appearance:none;text-align:left;font:inherit;cursor:pointer;display:grid;gap:8px;align-content:start;padding:22px;border-radius:16px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);min-height:190px;transition:transform .2s cubic-bezier(.16,1,.3,1),border-color .2s}
.pr-role:hover,.pr-role:focus-visible{transform:translateY(-3px);border-color:var(--accent);outline:none}
.pr-role strong{font-size:22px;font-weight:600;letter-spacing:-.01em}
.pr-role span{font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.5;color:var(--body)}
.pr-role .pr-role-k{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.pr-role .pr-role-go{margin-top:auto;font-family:'Space Grotesk',sans-serif;font-weight:500;color:var(--ink)}
.pr-role.dark{background:var(--ink);border-color:var(--ink);color:#fff}
.pr-role.dark span{color:#B8C2CE}.pr-role.dark .pr-role-k{color:#7FB6FF}.pr-role.dark .pr-role-go{color:#fff}
.pr-pass{display:grid;gap:10px;margin-top:22px;max-width:440px}
.pr-pass label{font-size:13px;font-weight:500}
.pr-pass-row{display:flex;gap:8px}
.pr-pass input{flex:1;min-width:0;height:44px;border-radius:999px;border:1px solid var(--rule);background:var(--surface);padding:0 18px;font:inherit;font-size:16px;color:var(--ink)}
.pr-pass input:focus{outline:2px solid var(--accent);outline-offset:1px}
.pr-pass .pr-btn{height:44px}
.pr-pass-err{margin:0;font-size:13px;color:#B42318}
.pr-link{appearance:none;border:0;background:none;padding:0;font:inherit;font-size:13px;color:var(--muted);cursor:pointer;justify-self:start}
.pr-link:hover{color:var(--accent)}
.pr-btn:disabled{opacity:.55;cursor:default}
.pr-notes{display:grid;gap:18px;padding-bottom:56px}
.pr-note{background:var(--surface);border:1px solid var(--rule);border-radius:14px;padding:22px 24px}
.pr-note h3{margin:0 0 6px;font-size:19px;font-weight:600;letter-spacing:-.01em}
.pr-note-intro{margin:0 0 14px;font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.55;color:var(--body);max-width:78ch}
.pr-check{list-style:none;margin:0;padding:0;display:grid}
.pr-check li{border-top:1px solid var(--rule)}
.pr-check label{display:grid;grid-template-columns:20px 1fr;gap:12px;padding:11px 0;cursor:pointer;font-family:'Inter',system-ui,sans-serif;font-size:14.5px;line-height:1.5;color:var(--ink)}
.pr-check input{width:17px;height:17px;margin:2px 0 0;accent-color:var(--accent)}
.pr-check li.done span{color:var(--muted);text-decoration:line-through}
.pr-terms{border-top:1px solid var(--rule);padding-top:12px;margin-top:12px}
.pr-level{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.pr-terms dl{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 24px}
.pr-terms dt{font-weight:600;font-size:14.5px}
.pr-terms dd{margin:2px 0 0;font-family:'Inter',system-ui,sans-serif;font-size:13.5px;line-height:1.5;color:var(--body)}
.pr-note-foot{font-size:11px;color:var(--muted);margin:0}
.pr-palace{display:grid;grid-template-columns:232px minmax(0,1fr);gap:28px;align-items:start;padding-bottom:56px}
.pr-rooms{position:sticky;top:72px;display:grid;gap:2px;border:1px solid var(--rule);border-radius:14px;background:var(--surface);padding:8px}
.pr-rooms button{appearance:none;border:0;background:none;font:inherit;font-size:14px;color:var(--body);text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-radius:9px}
.pr-rooms button small{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--muted)}
.pr-rooms button:hover{background:var(--bg);color:var(--ink)}
.pr-rooms button[aria-pressed="true"]{background:var(--ink);color:#fff}.pr-rooms button[aria-pressed="true"] small{color:#9fb3cc}
.pr-shelf{display:grid;gap:18px;min-width:0}
.pr-find{height:44px;border-radius:999px;border:1px solid var(--rule);background:var(--surface);padding:0 18px;font:inherit;font-size:15px;color:var(--ink);width:100%}
.pr-find:focus{outline:2px solid var(--accent);outline-offset:1px}
.pr-group{background:var(--surface);border:1px solid var(--rule);border-radius:14px;padding:20px 22px 8px}
.pr-group h3{margin:0 0 4px;font-size:18px;font-weight:600;letter-spacing:-.01em}
.pr-group ul{list-style:none;margin:0;padding:0}
.pr-vi{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;border-top:1px solid var(--rule);padding:14px 0}
.pr-vk{width:44px;height:52px;border-radius:8px;display:grid;place-items:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.06em;background:var(--accent-soft);color:var(--accent)}
.pr-vk.k-DOC{background:#E8EEFA;color:#2B5BB8}.pr-vk.k-PPT{background:#FBEDE6;color:#B9531F}.pr-vk.k-MD,.pr-vk.k-TXT{background:#EEF0F2;color:#4F5C6B}
.pr-vt{min-width:0}
.pr-vt a{color:var(--ink);text-decoration:none;font-weight:500;font-size:15px}
.pr-vt a:hover{color:var(--accent)}
.pr-vt p{margin:3px 0 0;font-family:'Inter',system-ui,sans-serif;font-size:13px;line-height:1.5;color:var(--body)}
.pr-vm{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px;font-size:10.5px;color:var(--muted)}
.pr-va{padding:1px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.06em}
.pr-va.a-internal{background:#FDECEC;color:#B42318}.pr-va.a-shareable{background:#E7F6EC;color:#1C7C3F}.pr-va.a-partners{background:#FFF4E0;color:#9A5B00}
.pr-vx{display:flex;gap:6px}
.pr-vx .pr-btn{height:32px;padding:0 12px;font-size:12px}
.pr-empty{color:var(--muted);font-size:14px}
.pr-top-actions{display:flex;align-items:center;gap:14px}
@media (max-width:720px){
  .pr-gate{min-height:calc(100svh - 60px);padding:24px 0 40px;gap:8px}
  .pr-roles{grid-template-columns:1fr;gap:12px;margin-top:16px}
  .pr-role{min-height:0;padding:18px}
  .pr-role strong{font-size:19px}
  .pr-note{padding:18px 16px;border-radius:12px}
  .pr-terms dl{grid-template-columns:1fr}
  .pr-palace{grid-template-columns:minmax(0,1fr);gap:14px}
  .pr-rooms{position:static;min-width:0;display:flex;overflow-x:auto;scrollbar-width:none;border:0;background:none;padding:0;gap:6px}
  .pr-rooms::-webkit-scrollbar{display:none}
  .pr-rooms button{flex:none;border:1px solid var(--rule);background:var(--surface);border-radius:999px;padding:8px 14px;font-size:13px}
  .pr-group{padding:16px 14px 4px;border-radius:12px}
  .pr-vi{grid-template-columns:38px minmax(0,1fr);gap:12px}
  .pr-vk{width:38px;height:46px}
  .pr-vx{grid-column:2}
  .pr-top{padding-top:16px}
  .pr-hero{padding:22px 0 16px;gap:10px}
  .pr-copy{gap:8px}
  .pr-eyebrow{font-size:10px}
  .pr-name{font-size:36px;letter-spacing:-.03em}
  .pr-tag{font-size:18px;line-height:1.2}
  .pr-sub{font-size:13px;line-height:1.5}
  .pr-full{margin-left:calc(-1 * max(20px,env(safe-area-inset-left,0px)));margin-right:calc(-1 * max(20px,env(safe-area-inset-right,0px)))}
  .pr-slides{gap:8px}
  .pr-slide{border-radius:0;box-shadow:none}
  .pr-frame{border-radius:0;border-left:0;border-right:0}
  .pr-tab{font-size:15px;padding:14px 12px 12px}
  .pr-head{padding:26px 0 16px}
  .pr-head h2{font-size:24px}
}
`;

function readTab(order) {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
  return order.includes(h) ? h : order[0];
}

function Gate({ onGuest, onFounder }) {
  const [mode, setMode] = React.useState('choose');
  const [passcode, setPasscode] = React.useState('');
  const [state, setState] = React.useState({ busy: false, error: '' });
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const response = await fetch('/founder/session', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode }) });
      if (response.ok) { setPasscode(''); await onFounder(); return; }
      setState({ busy: false, error: response.status === 401 ? 'That passcode is not right.' : 'Founder access is unavailable right now.' });
    } catch (error) {
      setState({ busy: false, error: 'Could not reach the server. Check your connection.' });
    }
  };
  return (
    <div className="pr-gate">
      <div className="pr-eyebrow pr-mono">Pitch room · 2026</div>
      <h1 className="pr-name">SINGULANCE</h1>
      <p className="pr-tag">Proactive intelligence, <span>inside your own walls.</span></p>
      {mode === 'choose' ? (
        <div className="pr-roles" role="group" aria-label="Who is visiting">
          <button type="button" className="pr-role" onClick={onGuest}>
            <span className="pr-role-k pr-mono">Guest</span>
            <strong>See the pitch</strong>
            <span>Product, sales and investor decks, the market map and our research.</span>
            <span className="pr-role-go">Enter →</span>
          </button>
          <button type="button" className="pr-role dark" onClick={() => setMode('founder')}>
            <span className="pr-role-k pr-mono">Founder</span>
            <strong>Founder notes</strong>
            <span>Checklists, fundraising terms and open decisions. Passcode required.</span>
            <span className="pr-role-go">Unlock →</span>
          </button>
        </div>
      ) : (
        <form className="pr-pass" onSubmit={submit}>
          <label htmlFor="pr-passcode">Founder passcode</label>
          <div className="pr-pass-row">
            <input id="pr-passcode" type="password" autoComplete="current-password" autoFocus value={passcode} onChange={(e) => setPasscode(e.target.value)} disabled={state.busy} />
            <button type="submit" className="pr-btn primary" disabled={state.busy || !passcode}>{state.busy ? 'Checking…' : 'Unlock'}</button>
          </div>
          {state.error && <p className="pr-pass-err" role="alert">{state.error}</p>}
          <button type="button" className="pr-link" onClick={() => { setMode('choose'); setState({ busy: false, error: '' }); }}>← Back</button>
        </form>
      )}
    </div>
  );
}

function Check({ id, text }) {
  const key = `singulance-founder-check:${id}`;
  const [done, setDone] = React.useState(() => storage('localStorage')?.getItem(key) === '1');
  const toggle = () => {
    const next = !done;
    setDone(next);
    try { if (next) storage('localStorage')?.setItem(key, '1'); else storage('localStorage')?.removeItem(key); } catch (error) { /* storage blocked: the tick lasts for this visit only */ }
  };
  return (
    <li className={done ? 'done' : undefined}>
      <label><input type="checkbox" checked={done} onChange={toggle} /><span>{text}</span></label>
    </li>
  );
}

function FounderNotes({ notes }) {
  return (
    <div className="pr-notes">
      {notes.sections.map((section) => (
        <section key={section.id} className="pr-note">
          <h3>{section.title}</h3>
          {section.intro && <p className="pr-note-intro">{section.intro}</p>}
          {section.checklist && (
            <ul className="pr-check">
              {section.checklist.map((text, index) => <Check key={index} id={`${section.id}:${index}`} text={text} />)}
            </ul>
          )}
          {section.terms && [1, 2, 3].map((level) => (
            <div key={level} className="pr-terms">
              <div className="pr-level pr-mono">Level {level}</div>
              <dl>
                {section.terms.filter((t) => t.level === level).map((t) => (
                  <div key={t.term}><dt>{t.term}</dt><dd>{t.meaning}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </section>
      ))}
      <p className="pr-note-foot pr-mono">Updated {notes.updated}</p>
    </div>
  );
}

const FILE_KIND = { pdf: 'PDF', docx: 'DOC', doc: 'DOC', pptx: 'PPT', xlsx: 'XLS', md: 'MD', txt: 'TXT', png: 'IMG', jpg: 'IMG', mp4: 'VID' };

function fileSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

function VaultItem({ item }) {
  const href = `/founder/files/${item.key.split('/').map(encodeURIComponent).join('/')}`;
  const ext = item.key.split('.').pop().toLowerCase();
  return (
    <li className="pr-vi">
      <span className={`pr-vk k-${FILE_KIND[ext] || 'FILE'}`}>{FILE_KIND[ext] || 'FILE'}</span>
      <div className="pr-vt">
        <a href={href} target="_blank" rel="noreferrer">{item.title}</a>
        {item.summary && <p>{item.summary}</p>}
        <div className="pr-vm pr-mono">
          {item.date && <span>{item.date}</span>}
          {item.size ? <span>{fileSize(item.size)}</span> : null}
          {item.audience && <span className={`pr-va a-${item.audience}`}>{item.audience}</span>}
          {item.status && <span>{item.status}</span>}
        </div>
      </div>
      <div className="pr-vx">
        <a className="pr-btn" href={href} target="_blank" rel="noreferrer">Open</a>
        <a className="pr-btn" href={`${href}?download=1`}>Download</a>
      </div>
    </li>
  );
}

function MindPalace({ notes }) {
  const vault = notes.vault || { rooms: [], items: [] };
  const rooms = [...vault.rooms, { id: 'checklists', title: 'Checklists & notes', intro: 'Meeting checklists, fundraising terms, claims to verify and open decisions.' }];
  const [room, setRoom] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLowerCase();
  const matches = (item) => !q || [item.title, item.summary, item.key, ...(item.tags || [])].join(' ').toLowerCase().includes(q);
  const count = (id) => (id === 'checklists' ? notes.sections.length : vault.items.filter((i) => i.room === id).length);
  const shown = room === 'checklists' ? [] : vault.items.filter((i) => (room === 'all' || i.room === room) && matches(i));
  const grouped = rooms.filter((r) => r.id !== 'checklists' && (room === 'all' || r.id === room))
    .map((r) => ({ room: r, items: shown.filter((i) => i.room === r.id) })).filter((g) => g.items.length);
  return (
    <div className="pr-palace">
      <nav className="pr-rooms" aria-label="Rooms">
        <button type="button" aria-pressed={room === 'all'} onClick={() => setRoom('all')}>Everything<small>{vault.items.length}</small></button>
        {rooms.map((r) => (
          <button key={r.id} type="button" aria-pressed={room === r.id} onClick={() => setRoom(r.id)}>{r.title}<small>{count(r.id)}</small></button>
        ))}
      </nav>
      <div className="pr-shelf">
        {room !== 'checklists' && (
          <input className="pr-find" type="search" placeholder="Search files, partners, tags…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the mind palace" />
        )}
        {room === 'checklists' ? <FounderNotes notes={notes} /> : grouped.length ? grouped.map(({ room: r, items }) => (
          <section key={r.id} className="pr-group">
            <h3>{r.title}</h3>
            {r.intro && <p className="pr-note-intro">{r.intro}</p>}
            <ul>{items.map((item) => <VaultItem key={item.key} item={item} />)}</ul>
          </section>
        )) : <p className="pr-empty">{vault.items.length ? 'Nothing matches that search.' : 'The vault is empty or could not be loaded.'}</p>}
        {vault.updated && room !== 'checklists' && <p className="pr-note-foot pr-mono">Vault updated {vault.updated}</p>}
      </div>
    </div>
  );
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
      <iframe ref={ref} key={id} className="pr-frame" title={EMBEDS[id].title} src={`/pitch/market-map?embed=1#${EMBEDS[id].hash}`} style={height ? { height } : undefined} />
    </div>
  );
}

export default function PitchRoom() {
  const [role, setRole] = React.useState(() => storage('sessionStorage')?.getItem(ROLE_KEY) || null);
  const [notes, setNotes] = React.useState(null);
  const order = notes ? ['founder', ...ORDER] : ORDER;
  const [tab, setTab] = React.useState(() => readTab(ORDER));
  const tabsRef = React.useRef(null);

  const saveRole = (next) => {
    try { if (next) storage('sessionStorage')?.setItem(ROLE_KEY, next); else storage('sessionStorage')?.removeItem(ROLE_KEY); } catch (error) { /* storage blocked: the visitor chooses again next visit */ }
    setRole(next);
  };

  const loadNotes = React.useCallback(async () => {
    const response = await fetch('/founder/notes', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`founder notes ${response.status}`);
    const next = await response.json();
    // The vault is optional: notes still open if R2 is unavailable.
    const vault = await fetch('/founder/vault', { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setNotes({ ...next, vault });
  }, []);

  React.useEffect(() => {
    if (role !== 'founder' || notes) return;
    loadNotes().catch(() => saveRole(null));
  }, [role, notes, loadNotes]);

  React.useEffect(() => { setTab(readTab(order)); }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    document.title = 'SINGULANCE Pitch Room — Proactive intelligence, inside your own walls';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', 'noindex, nofollow');
    const onHash = () => setTab(readTab(order));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id) => {
    window.history.replaceState(null, '', `#${id}`);
    setTab(id);
    const bar = tabsRef.current;
    if (bar) bar.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const unlock = async () => {
    await loadNotes();
    saveRole('founder');
    window.history.replaceState(null, '', '#founder');
    setTab('founder');
  };

  const leave = async () => {
    if (notes) await fetch('/founder/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    setNotes(null);
    saveRole(null);
    window.history.replaceState(null, '', window.location.pathname);
    setTab('product');
  };

  const top = (
    <header className="pr-top">
      <a className="pr-brand" href="https://singulancelabs.com"><img src="/singulance-mark.svg" alt="" />SINGULANCE</a>
      <div className="pr-top-actions">
        {role && <button type="button" className="pr-link pr-mono" onClick={leave}>{notes ? 'Lock founder notes' : 'Switch to founder'}</button>}
        <a className="pr-site pr-mono" href="https://singulancelabs.com">singulancelabs.com ↗</a>
      </div>
    </header>
  );

  if (!role || (role === 'founder' && !notes)) {
    return (
      <div className="pr">
        <style>{css}</style>
        <div className="pr-wrap">
          {top}
          {role === 'founder' ? <div className="pr-gate"><p className="pr-sub">Opening founder notes…</p></div> : <Gate onGuest={() => saveRole('guest')} onFounder={unlock} />}
        </div>
      </div>
    );
  }

  const isFounder = tab === 'founder' && notes;
  const isDeck = Boolean(DECKS[tab]);
  const meta = isFounder ? FOUNDER_TAB : isDeck ? DECKS[tab] : EMBEDS[tab];

  return (
    <div className="pr">
      <style>{css}</style>
      <div className="pr-wrap">
        {top}
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
            {order.map((id) => {
              const item = id === 'founder' ? FOUNDER_TAB : DECKS[id] || EMBEDS[id];
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
          {!isFounder && <div className="pr-actions">
            {isDeck
              ? <a className="pr-btn primary" href={meta.pdf} download>Download PDF</a>
              : <a className="pr-btn" href={`/pitch/market-map#${meta.hash}`} target="_blank" rel="noreferrer">Open full page ↗</a>}
          </div>}
        </div>
        {isFounder ? <MindPalace notes={notes} /> : isDeck ? <Deck id={tab} /> : <Embed id={tab} />}
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
