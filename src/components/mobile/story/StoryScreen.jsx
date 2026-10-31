import React from 'react';
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';
import { createEmployeeAppearance, defaultEmployeeAppearance, starterEmployeeAppearance } from '../../hivemind/app/shared/employee-appearance';

const FACE_ASSETS = { ...humation1, crops: { ...humation1.crops, face: { x: 8, y: -1, width: 64, height: 64 } } };

// The new hire: crown, curly hair, mustard shirt, as picked in the Create employee dialog.
const AMAR_LOOK = createEmployeeAppearance('story-amar', {
  selections: { head: 'hm1-p-000004', body: 'hm1-p-000030', bottom: 'hm1-p-000033', item: 'hm1-p-000050', glasses: 'hm1-p-000056' },
  colors: { stroke: '171717', hair: '171717', skin: 'FFFFFF', clothes: 'E9A637', bottom: '283345' },
  background: 'FBF1D9',
});
const LOOKS = {
  AMAR: AMAR_LOOK,
  Turing: starterEmployeeAppearance('Turing'),
  Faraday: starterEmployeeAppearance('Faraday'),
  Feynmann: starterEmployeeAppearance('Feynmann'),
  Momo: defaultEmployeeAppearance('Momo'),
};
const RING = { AMAR: '#FBF1D9', Turing: '#EAE7FA', Faraday: '#FFF0CC', Feynmann: '#FBE3EC', Momo: '#FBE3EC' };

/** Hand-drawn employee face, the same Humation character the product shows. */
export function Face({ name, size = 40, appearance, face = false }) {
  const look = appearance || LOOKS[name];
  const ground = look?.background && look.background !== 'transparent' ? `#${look.background}` : (RING[name] || '#F3F0E8');
  return <span className="ps-face" style={{ width: size, height: size, background: ground }}>
    <Avatar assets={face ? FACE_ASSETS : humation1} seed={look?.seed || name} size={size} selections={look?.selections} colors={look?.colors} background="transparent" crop={face ? 'face' : 'avatar'} />
  </span>;
}

const AVATAR_CHOICES = [
  createEmployeeAppearance('story-c1', { selections: { item: 'hm1-p-000060', head: 'hm1-p-000004' }, colors: { clothes: '5276BB' } }),
  createEmployeeAppearance('story-c2', { selections: { item: 'hm1-p-000066', head: 'hm1-p-000004' }, colors: { clothes: '8470A8' } }),
  AMAR_LOOK,
  createEmployeeAppearance('story-c4', { selections: { item: 'hm1-p-000054', head: 'hm1-p-000004' }, colors: { clothes: 'E66A99' } }),
  createEmployeeAppearance('story-c5', { selections: { item: 'hm1-p-000064', head: 'hm1-p-000004' }, colors: { clothes: '598878' } }),
  createEmployeeAppearance('story-c6', { selections: { item: 'hm1-p-000045', head: 'hm1-p-000004' }, colors: { clothes: '6B7280' } }),
];

const Icon = {
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  plug: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/></svg>,
  inbox: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  hq: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  lib: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4v16M8 4v16M12 4v16M16 4l4 16"/></svg>,
  crm: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 15v-3M12 15v-5M16 15v-2"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m5 12 5 5L20 7"/></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>,
  monitor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

const Gmail = () => <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M6 40h7V22L4 15v22a3 3 0 0 0 2 3z"/><path fill="#34A853" d="M35 40h7a3 3 0 0 0 2-3V15l-9 7z"/><path fill="#FBBC04" d="M35 9v13l9-7v-4c0-3.7-4.2-5.8-7.2-3.6z"/><path fill="#EA4335" d="M13 22V9l11 8.3L35 9v13l-11 8.2z"/><path fill="#C5221F" d="M4 11v4l9 7V9l-1.8-1.4C8.2 5.2 4 7.3 4 11z"/></svg>;

const TEAM = [['Momo', 'Ready'], ['Turing', 'Ready'], ['Faraday', 'Ready'], ['Feynmann', 'Ready']];
const LIBRARY = [
  ['MD', 'EMEA partner shortlist', 'AMAR'], ['MD', 'Acme Systems brief', 'AMAR'], ['HTML', 'Q1 partner program', 'Turing'],
  ['MD', 'Reseller pricing tiers', 'Faraday'], ['MD', 'Weekly partner report', 'AMAR'], ['MD', 'Intro email drafts', 'Momo'],
];
const DIAL = ['Observe', 'Suggest', 'Prepare', 'Lanes', 'Auto'];

function Dial({ compact = false }) {
  return <div className={`ps-dial${compact ? ' is-compact' : ''}`}>
    <div className="ps-dial-head"><b>Autonomy · HyperAgents</b><span className="ps-dial-state"><i data-dial-from>1/4 · Suggest</i><i data-dial-to>4/4 · Autonomous</i></span></div>
    <div className="ps-dial-bar"><span className="ps-dial-person" />{Array.from({ length: 20 }, (_, i) => <span key={i} className={`ps-seg${i < 5 ? ' is-on' : ''}`} data-seg={i} />)}<span className="ps-dial-bot" /></div>
    <div className="ps-dial-labels">{DIAL.map((l, i) => <span key={l} data-dial-label={i} className={i === 1 ? 'is-on' : ''}><i />{l}</span>)}</div>
  </div>;
}

/**
 * The product, rebuilt at its real size (1440×900 desktop, 402×874 phone) so the page can scale it into a device
 * frame. Every animated element carries a data attribute the story timeline targets; nothing here animates itself.
 */
export default function StoryScreen({ phone = false }) {
  return <div className={`ps-app${phone ? ' is-phone' : ''}`} data-app>
    <aside className="ps-side" data-side>
      <div className="ps-brand"><img src="/singulance-mark.svg" alt="" width="26" height="26" /><b>HIVEMIND</b></div>
      <div className="ps-switch"><span className="ps-bot" />HyperAgents<i>⌄</i></div>
      <div className="ps-team-head"><b>Your team</b><span><i data-count-from>4 employees</i><i data-count-to>5 employees</i></span></div>
      <div className="ps-team">
        {TEAM.map(([n, s]) => <div key={n} className={`ps-tile${n === 'Turing' ? ' is-selected' : ''}`} data-tile={n}><Face name={n} size={phone ? 66 : 76} /><b>{n}</b><span>{s}<i /></span></div>)}
        <div className="ps-tile ps-tile-new" data-tile="AMAR"><Face name="AMAR" size={phone ? 66 : 76} /><b>AMAR</b><span className="is-wait">Waiting for you</span></div>
        <div className="ps-tile ps-create" data-create><i>{Icon.plus}</i>Create employee</div>
      </div>
      <div className="ps-side-foot">
        <Dial />
        <div className="ps-quick">{[['plug', 'Apps'], ['inbox', 'Needs you'], ['cal', 'Calendar'], ['hq', 'Company HQ'], ['lib', 'Library'], ['crm', 'CRM']].map(([i, l]) => <span key={l} data-quick={l}>{Icon[i]}{l}</span>)}</div>
        <div className="ps-account"><span>{Icon.gear}Account &amp; Settings</span></div>
      </div>
    </aside>

    <section className="ps-main">
      <header className="ps-top">
        <span className="ps-org">{Icon.hq}SINGULANCE</span>
        <span className="ps-bell" data-bell>{Icon.bell}<i className="ps-badge"><em data-badge-from>2</em><em data-badge-to>3</em></i></span>
        <span className="ps-invite">Invite your Team</span>
        <span className="ps-lang">EN</span>
        <span className="ps-online"><i />Online</span>
      </header>
      <div className="ps-room-head">
        {phone && <span className="ps-round">{Icon.back}</span>}
        <span className="ps-pill"><span data-pill="Turing"><Face name="Turing" size={30} />Turing</span><span data-pill="AMAR"><Face name="AMAR" size={30} />AMAR</span></span>
        {phone && <span className="ps-round">{Icon.monitor}</span>}
      </div>
      {phone && <div className="ps-phone-dial" data-phone-dial><Dial compact /></div>}

      <div className="ps-stage">
        {/* Opening: Turing's room, the employee that ran overnight. */}
        <div className="ps-scene" data-scene="turing">
          <div className="ps-thread">
            <p className="ps-date">FRI, OCT 30 · 9:30 PM</p>
            <div className="ps-agent-msg"><b>Scheduled task</b><p>Nightly review. Replay today's work and save at most three lessons.</p><small>▸ Agent message</small></div>
            <p className="ps-sys">Scheduled run: working on its own and reporting when done.</p>
            <div className="ps-row"><Face name="Turing" size={30} /><div className="ps-bubble is-peach">Nightly review complete. One lesson saved: confirm a partner's region before drafting.</div></div>
          </div>
        </div>

        {/* Chapter 2: the new employee learns its job. */}
        <div className="ps-scene" data-scene="onboard">
          <div className="ps-thread is-bottom">
            <div className="ps-row" data-item="hello"><Face name="AMAR" size={30} /><div className="ps-bubble is-pink">Hi Amar, I'm AMAR — glad to join SINGULANCE.</div></div>
            <div className="ps-role" data-item="role">
              <div className="ps-role-q"><Face name="AMAR" size={34} /><b>Amar, what should my <u>role</u> be at SINGULANCE?</b></div>
              <div className="ps-role-cards">
                <div className="is-lilac"><b>Research and insights</b><span>Find what matters in our market and tell you what to do about it.</span></div>
                <div className="is-peach"><b>Operations and follow-through</b><span>Own the recurring work and close every loop.</span></div>
                <div className="is-mint"><b>Customers and pipeline</b><span>Support the people who buy from us and the leads coming in.</span></div>
              </div>
              <div className="ps-role-input"><span data-type="role" data-text="Find and qualify GTM partners across the world." /><i className="ps-caret" /><b>↑</b></div>
            </div>
            <div className="ps-row is-me" data-item="mine"><div className="ps-bubble is-me">Find and qualify GTM partners across the world.</div></div>
            <div className="ps-profile" data-item="profile">
              <div className="ps-profile-face"><Face name="AMAR" size={phone ? 92 : 150} /></div>
              <div className="ps-profile-body"><small>YOUR SPECIALIST AT SINGULANCE</small><h3>Hi, I'm <b>AMAR</b></h3><span className="ps-chip"><i>ROLE</i>GTM Partner Development Specialist</span><p>Find and qualify resellers, integrators and alliance partners worldwide, so SINGULANCE reaches buyers beyond direct outreach.</p></div>
            </div>
            <div className="ps-jobs" data-item="jobs">
              <div className="is-sand" data-job><small>01</small><b>Research</b><span>Map the top partners in each region.</span><i>{Icon.arrow}</i></div>
              <div className="is-teal" data-job><small>02</small><b>Routine</b><span>Every Monday, report new partner leads.</span><i>{Icon.arrow}</i></div>
              <div className="is-lav" data-job><small>03</small><b>Browse</b><span>Use my browser to check partner sites.</span><i>{Icon.arrow}</i></div>
            </div>
          </div>
        </div>

        {/* Chapters 3–5 and 7: AMAR at work. Items grow in from the bottom like a live chat. */}
        <div className="ps-scene" data-scene="work">
          <div className="ps-thread is-bottom">
            <p className="ps-date" data-item="date">SAT, OCT 31 · 4:40 PM</p>
            <div className="ps-event" data-item="event"><b>Email event</b><p>Routed to you because it fits your role as GTM Partner Development Specialist: <em>Partner intro — Acme Systems</em></p><small>▸ Agent message</small></div>
            <p className="ps-tools" data-item="tools">Event run (gmail): following your autonomy and rules. Tools ready: GMAIL_FETCH_MESSAGE, GMAIL_CREATE_EMAIL_DRAFT, GMAIL_REPLY_TO_THREAD.</p>
            <div className="ps-draft" data-item="draft"><Gmail /><b>Draft saved</b><span>Re: Partner intro — Acme Systems</span><i>⌄</i></div>
            <p className="ps-sys" data-item="receipt">Receipt (event run, Autonomous): Create email draft with Gmail</p>
            <div className="ps-row" data-item="colleague"><Face name="Turing" size={30} /><div className="ps-bubble is-colleague"><b>Turing</b><small>Product Strategy Lead</small><p>Acme fits our Q1 partner list. Can you add their pricing tiers to the brief?</p><em>▸ Full message</em></div></div>
            <div className="ps-row is-me" data-item="outgoing"><div className="ps-bubble is-out">You → Turing: added to the Acme brief, with their three tiers.</div></div>
            <div className="ps-review" data-item="review"><span>✦ NIGHTLY REVIEW COMPLETE</span><p>Hi Amar, today AMAR qualified 3 partners, sent 1 reply you approved and saved 2 drafts. One lesson saved: lead with the partner's region.</p></div>
          </div>
          <div className="ps-needs" data-needs>
            <div className="ps-needs-head"><Face name="AMAR" size={28} /><b>Needs you</b><span>AMAR · Gmail</span></div>
            <p>Send the reply to Acme Systems? It proposes a 30-minute partner call next week.</p>
            <div className="ps-needs-actions"><span className="ps-approve" data-approve>Approve</span><span className="ps-later">Not now</span></div>
            <div className="ps-done" data-done><i>{Icon.check}</i>Sent · receipt saved</div>
          </div>
        </div>

        {/* Chapter 6: everything the team makes lands in one Library. */}
        <div className="ps-scene ps-library" data-scene="library">
          <div className="ps-lib-head"><b>Library</b><span>All files · 6</span></div>
          <div className="ps-lib-grid">{LIBRARY.map(([t, n, by]) => <div key={n} className="ps-file" data-file><div className="ps-file-art">{Icon.doc}<small>{t}</small></div><b>{n}</b><span>{by} · Today</span></div>)}</div>
        </div>
      </div>

      <div className="ps-composer"><span className="ps-plus">{Icon.plus}</span><span className="ps-input">Message <i data-composer="Turing">Turing</i><i data-composer="AMAR">AMAR</i>…</span><span className="ps-model">Default ⌄</span><span className="ps-mic">{Icon.mic}</span></div>
    </section>

    {/* Chapter 1: Create employee. */}
    <div className="ps-modal" data-modal>
      <div className="ps-modal-card">
        <div className="ps-modal-head"><span>{Icon.close}</span><b>Create employee</b></div>
        <div className="ps-modal-face"><Face name="AMAR" size={phone ? 110 : 150} appearance={AMAR_LOOK} /></div>
        <div className="ps-name"><span data-type="name" data-text="AMAR" /><i className="ps-caret" /></div>
        <div className="ps-choices"><i className="ps-choice-ring" data-choice-ring />{AVATAR_CHOICES.map((a, i) => <span key={i} data-choice={i}><Face size={phone ? 42 : 56} appearance={a} /></span>)}</div>
        <label className="ps-check"><i data-check /> Needs computer access</label>
        <span className="ps-create-btn" data-create-btn>Create</span>
      </div>
    </div>

    <div className="ps-toast" data-toast><Gmail /><div><b>Gmail <span>· New email</span></b><p><strong>Partner intro</strong> — Acme Systems</p><small>Woken: fits AMAR's role</small></div></div>
    <span className="ps-cursor" data-cursor aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.5L10 19z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/></svg><i data-click /></span>
  </div>;
}
