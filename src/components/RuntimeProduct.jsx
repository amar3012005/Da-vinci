import React, { useState } from 'react';
import { ArrowRight, Plus, Minus, FileText, Network, Users, ClipboardCheck, Check, ArrowUpRight } from 'lucide-react';
import Seo from './Seo';
import './RuntimeProduct.css';

const appUrl = 'https://next.singulancelabs.com/hivemind';
const features = [
  ['Company context', 'Bring together the documents, goals and connections you authorize. Runtime connects each signal to what matters to your company.', 'Runtime consulting an archive of company documents'],
  ['A specialist team', 'Turn a confirmed agenda into focused work for HyperAgents, with clear responsibilities, scope and expected outcomes.', 'Runtime coordinating specialist work around a table'],
  ['Reviewed work', 'Check the deliverable, request corrections when needed, and bring important results and decisions back to you.', 'Runtime examining a report before carrying work forward'],
];
const cycle = [
  ['Notice', 'Follow relevant signals.', FileText],
  ['Connect', 'Bring the context together.', Network],
  ['Coordinate', 'Assign the right specialist.', Users],
  ['Review', 'Check and refine the result.', ClipboardCheck],
  ['Carry forward', 'Retain lessons and next steps.', Check],
];
const team = [
  ['Research', 'Find evidence. Understand what matters.'],
  ['Content', 'Turn context into clear communication.'],
  ['Strategy', 'Connect priorities to a useful next move.'],
  ['Operations', 'Keep responsibilities and work connected.'],
  ['Quality', 'Check assumptions and improve results.'],
  ['Runtime', 'Your coordinating AI Chief of Staff.'],
];
const faqs = [
  ['What is SINGULANCE Runtime?', 'Runtime is your AI Chief of Staff: it connects company context, coordinates specialist work and carries reviewed results into the next step. You set the goals and authority.'],
  ['How does it get company context?', 'From the information you provide, retained context, and sources you authorize. Runtime should distinguish confirmed evidence from assumptions rather than treating every new signal as an instruction.'],
  ['How does it work with HyperAgents?', 'Runtime delegates focused assignments to specialists, receives their results and reviews the work. Responsibilities, tools and available actions depend on your company configuration.'],
  ['When does it ask for approval?', 'When your approval, an essential missing fact or a consequential decision is needed. It can handle routine choices within existing authority; initiative does not grant additional permissions.'],
];
export default function RuntimeProduct() {
  const [openFaq, setOpenFaq] = useState(null);
  return <main className="runtime-retro" style={{'--rr-feature-art': 'url("/assets/runtime-retro/features.webp")', '--rr-team-art': 'url("/assets/runtime-retro/team.webp")'}}>
    <Seo pagePath="/runtime" canonical="https://runtime.singulancelabs.com/" />
    <a className="rr-skip" href="#intelligence">Skip to content</a>
    <div className="rr-page">
      <header className="rr-header">
        <a className="rr-brand" href="https://singulancelabs.com" aria-label="SINGULANCE home">SINGULANCE<span>RUNTIME</span></a>
        <nav aria-label="Runtime navigation"><a href="#intelligence">The idea</a><a href="#team">Your team</a><a href="https://singulancelabs.com/research/runtime">Research</a></nav>
        <a className="rr-button rr-outline rr-header-cta" href={appUrl}>Meet Runtime <ArrowUpRight size={15}/></a>
      </header>
      <section className="rr-hero" aria-labelledby="rr-title">
        <div className="rr-hero-art"><img src="/assets/runtime-retro/hero.webp" width="1536" height="1024" fetchPriority="high" alt="Runtime, a vintage computer-headed Chief of Staff, with a team of specialists"/></div>
        <div className="rr-hero-copy"><p className="rr-kicker">YOUR AI CHIEF OF STAFF</p><h1 id="rr-title">Runtime<br/>for your<br/>company.</h1><p className="rr-tagline">Intelligence that anticipates.</p><p className="rr-intro">Company context. Specialist work.<br/>Reviewed next steps.</p><div className="rr-actions"><a href={appUrl} className="rr-button rr-white">Meet Runtime <ArrowUpRight size={16}/></a><a href="#team" className="rr-button rr-outline">Explore HyperAgents</a></div></div>
      </section>
      <section id="intelligence" className="rr-features rr-paper">
        <div className="rr-section-heading"><h2>Features</h2><span className="rr-small">CONTEXT → COORDINATION → CONTINUITY</span></div>
        <div className="rr-feature-grid">{features.map(([name,copy,alt],i)=><article key={name}><span className="rr-number">0{i+1}</span><h3>{name}</h3><p>{copy}</p><div className={'rr-feature-art rr-panel-'+i} role="img" aria-label={alt}/></article>)}</div>
      </section>
      <section className="rr-work rr-paper" aria-labelledby="rr-work-title">
        <h2 id="rr-work-title">From context to coordinated action.</h2><p className="rr-section-copy">You set the direction. Runtime connects the work, with specialists and review at every meaningful step.</p>
        <div className="rr-flow-preview" aria-label="Illustrative Runtime coordination flow">
          <div className="rr-source-stack"><span>Documents</span><span>Authorized apps</span><span>Company goals</span><FileText aria-hidden="true" size={48}/></div><ArrowRight className="rr-flow-arrow" aria-hidden="true"/>
          <div className="rr-runtime-card"><div className="rr-monitor" aria-hidden="true"><span>· ·<br/>—</span></div><b>Runtime</b><small>Connects context.<br/>Coordinates specialists.</small></div><ArrowRight className="rr-flow-arrow" aria-hidden="true"/>
          <div className="rr-result-card"><ClipboardCheck size={30} aria-hidden="true"/><b>A reviewed deliverable</b><div className="rr-report-lines" aria-hidden="true"><i/><i/><i/><i/></div><small>Evidence and next steps.</small></div><ArrowRight className="rr-flow-arrow" aria-hidden="true"/>
          <div className="rr-approval-card"><span><Check size={18}/> Review the evidence</span><span><Check size={18}/> Add your decision</span><span><Check size={18}/> Move work forward</span></div>
        </div>
        <p className="rr-caption">Illustrative workflow. Sources and actions depend on your configuration and permissions.</p>
        <ol className="rr-cycle">{cycle.map(([name,copy,Icon],i)=><li key={name}><span className="rr-cycle-dot">{i+1}</span><Icon size={25} strokeWidth={1.3} aria-hidden="true"/><h3>{name}</h3><p>{copy}</p></li>)}</ol>
      </section>
      <section id="team" className="rr-team rr-paper"><div className="rr-section-heading"><h2>Your team, working together.</h2><p>A shared direction.<br/>Different specialist strengths.</p></div><div className="rr-team-grid">{team.map(([name,copy],i)=><article key={name}><div className={'rr-portrait rr-person-'+i} role="img" aria-label={'Illustrated '+name+' specialist'}/><h3>{name}</h3><p>{copy}</p></article>)}</div><p className="rr-caption">Illustrated roles. Your employees and their responsibilities are configured for your company.</p></section>
      <section className="rr-control rr-paper"><div><p className="rr-kicker">YOUR COMPANY. YOUR DIRECTION.</p><h2>You stay in control.</h2><p>Runtime acts within the permissions you set and asks when your decision matters.</p></div><div className="rr-control-mark" aria-hidden="true"><Check size={52} strokeWidth={1}/><span>CONTEXT.<br/>JUDGMENT.<br/>FOLLOW-THROUGH.</span></div></section>
      <section className="rr-faq rr-paper"><h2>FAQs</h2><div>{faqs.map(([question,answer],i)=><article key={question}><h3><button aria-expanded={openFaq===i} aria-controls={'rr-faq-'+i} onClick={()=>setOpenFaq(openFaq===i?null:i)}>{question}{openFaq===i?<Minus size={18}/>:<Plus size={18}/>}</button></h3><div id={'rr-faq-'+i} hidden={openFaq!==i}><p>{answer}</p></div></article>)}</div></section>
      <section className="rr-finale"><h2>Before you ask.<br/>Already connected.</h2><div><p>Shape the ambition. Runtime connects the work.</p><div className="rr-actions"><a href={appUrl} className="rr-button rr-white">Meet Runtime <ArrowUpRight size={16}/></a><a href="https://singulancelabs.com/research/runtime" className="rr-button rr-outline">Read the thinking</a></div></div></section>
      <footer className="rr-footer"><span className="rr-footer-word" aria-hidden="true">RUNTIME</span><a href="https://singulancelabs.com">© {new Date().getFullYear()} SINGULANCE</a><nav aria-label="Footer"><a href="#intelligence">The idea</a><a href="#team">Your team</a><a href="https://singulancelabs.com/privacy">Privacy</a></nav><span>INTELLIGENCE WITH CONTINUITY.</span></footer>
    </div>
  </main>;
}
