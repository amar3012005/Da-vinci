import VisibilityLinks from './VisibilityLinks';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowDown, ArrowUpRight, Check, ChevronDown, Bell, FileCheck2, Mail, Network, Users, Sparkles } from 'lucide-react';
import './GetRuntime.css';
import { RUNTIME_WORKSPACE } from './hivemind/app/shared/runtime-workspace';

export { RUNTIME_WORKSPACE };
const art = name => `/assets/getruntime/${name}.webp`;
const outcomes = [
  ['gets the work done.', FileCheck2],
  ['sees what needs attention.', Bell],
  ['brings your team together.', Users],
  ['checks the result.', Check],
  ['knows when to ask you.', Mail],
];
export const runtimeFeatures = [
  { id: 'signals', title: 'Sees what needs attention. Before you ask.', text: 'An important email. A change in a project. A decision that has been waiting. Runtime connects the signals you authorize with your company’s goals, so the next step has a reason behind it.', image: 'signals', alt: 'Runtime connecting an email, calendar and document to one important signal' },
  { id: 'specialists', title: 'Your superstaff. A whole team behind it.', text: 'HyperAgents are your specialist digital employees. Runtime gives the right expert a clear assignment, connects the dependencies and keeps the work moving. Research, strategy, creative work and operations, with one shared direction.', image: 'specialists', alt: 'Runtime coordinating research, creative and operations specialists' },
  { id: 'review', title: 'Work isn’t finished until it has been checked.', text: 'Runtime looks at the actual result, checks it against the assignment and asks for corrections when needed. You get work with the evidence behind it, and a clear account of anything still blocked.', image: 'review', alt: 'Runtime inspecting a report and carrying a revised result through review' },
  { id: 'connections', title: 'A company Brain. Connected to your world.', text: 'Your documents, memories and approved app connections give Runtime the context to work with. It carries useful decisions and learning forward, so each assignment can build on what your company already knows.', image: 'connections', alt: 'Approved email, calendar and document connections entering Runtime’s archive' },
  { id: 'decisions', title: 'Comes back when your judgment matters.', text: 'A useful update when work is ready. A focused question when a decision is missing. And, with calling enabled, a call when the next step needs you. Runtime brings the context, so you can make the decision and get back to your day.', image: 'call', alt: 'A Runtime call and notification asking for a human decision', note: 'Notifications and calls use the channels and permissions you enable.' },
  { id: 'control', title: 'Your company. Your authority.', text: 'You set the goals, connections and boundaries. Runtime works within that scope and brings consequential decisions back for approval. You can inspect the work, change direction or stop it.', image: 'control', alt: 'Runtime beside a protected permission control and closed credential box' },
];
const workflow = [
  { title: 'Notice', icon: Bell, headline: 'A customer’s priorities have changed.', text: 'An authorized company signal arrives. Runtime checks the source and connects it to the current account plan.', status: 'Relevant signal', items: ['Customer message', 'Current company goals', 'Existing account context'] },
  { title: 'Plan', icon: Network, headline: 'Find the next useful move.', text: 'Runtime checks the context, identifies the gap and turns it into scoped work with a clear outcome.', status: 'Work scoped', items: ['Review the changed requirement', 'Check the existing proposal', 'Define what success looks like'] },
  { title: 'Delegate', icon: Users, headline: 'Bring the right experts together.', text: 'A research specialist checks the evidence. A strategy specialist prepares the response. Runtime keeps the dependencies connected.', status: 'Specialists at work', items: ['Research: evidence brief', 'Strategy: response options', 'Runtime: coordination'] },
  { title: 'Verify', icon: FileCheck2, headline: 'Check the work, then check the fit.', text: 'Runtime inspects the saved result, compares it with the assignment and sends it back if it needs another pass.', status: 'Result reviewed', items: ['Sources inspected', 'Requirements checked', 'Deliverable reviewed'] },
  { title: 'Ask you', icon: Mail, headline: 'One decision. With the context ready.', text: 'If sending the response needs your approval, Runtime brings you the proposed message, the supporting evidence and the choice to make.', status: 'Your approval needed', items: ['Proposed next step', 'Evidence and trade-offs', 'Approve, revise or stop'] },
];
const questions = [
  ['What is Runtime?', 'Runtime is HIVEMIND’s anticipatory AI Chief of Staff. It connects company context to useful work, coordinates specialist HyperAgents, reviews results and follows through within the authority you give it.'],
  ['What makes it anticipatory?', 'It can start from an authorized company signal, an active goal, a scheduled checkpoint or a specialist’s result. It considers what changed and what matters before choosing the next useful step. Signals and background workflows must be enabled for your workspace.'],
  ['What are HyperAgents?', 'HyperAgents are specialist digital employees with their own roles, skills and persistent workrooms. Runtime coordinates their assignments and reviews the work they return. Your company chooses the employees and responsibilities it needs.'],
  ['Do I have to keep asking it what to do next?', 'Within a clear assignment and approved scope, Runtime is designed to carry the work forward. It asks when information, authority or your judgment is needed, and reports a blocker rather than pretending the job is complete.'],
  ['Can Runtime call or notify me?', 'Runtime can bring updates and decisions back through configured notification channels. Governed calls depend on the calling service, a verified recipient and the permissions you enable. Availability depends on your workspace and connected services.'],
  ['What can it access or do on my behalf?', 'Only the company context, connections and actions authorized for your workspace. Connecting an app does not grant unlimited action. Approval requirements still apply to consequential actions, and you can change direction or stop the work.'],
  ['How do I get started?', 'Open Runtime with your existing HIVEMIND account, choose your company and complete its setup. Bring in the context you want it to use, configure your specialist team and give Runtime a clear first goal.'],
];

function RuntimeOutcome() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    const start = () => { window.clearInterval(timer); if (!media.matches && !document.hidden) timer = window.setInterval(() => setIndex(value => (value + 1) % outcomes.length), 3600); };
    start(); media.addEventListener?.('change', start); document.addEventListener('visibilitychange', start);
    return () => { window.clearInterval(timer); media.removeEventListener?.('change', start); document.removeEventListener('visibilitychange', start); };
  }, []);
  const [text, Icon] = outcomes[index];
  return <span className="gr-outcome" aria-hidden="true"><span key={text}>{text} <Icon className="gr-outcome-icon" strokeWidth={1.5}/></span></span>;
}

export default function GetRuntime() {
  const [step, setStep] = useState(0);
  const selected = workflow[step];
  return <div className="gr-page">
    <Helmet>
      <title>Runtime — Your anticipatory AI superstaff | SINGULANCE</title>
      <meta name="description" content="Meet Runtime, your anticipatory AI Chief of Staff. Connect company signals, coordinate expert HyperAgents and carry work through to reviewed results."/>
      <link rel="canonical" href="https://getruntime.singulancelabs.com/"/>
      <meta name="robots" content="index, follow, max-image-preview:large"/>
      <meta property="og:title" content="Runtime — AI that gets the work done"/>
      <meta property="og:description" content="Your anticipatory AI superstaff. Company context, specialist digital employees and work carried through."/>
      <meta property="og:url" content="https://getruntime.singulancelabs.com/"/>
      <meta property="og:image" content="https://getruntime.singulancelabs.com/assets/getruntime/company.webp"/>
    </Helmet>
    <a className="gr-skip" href="#runtime-main">Skip to content</a>
    <header className="gr-nav"><div className="gr-nav-inner"><a href="https://singulancelabs.com" className="gr-company" aria-label="SINGULANCE home"><img src="/singulance-mark.svg" alt="" width="30" height="24"/>SINGULANCE</a><a href={RUNTIME_WORKSPACE} className="gr-login">Log in</a></div></header>
    <main id="runtime-main">
      <section className="gr-hero" aria-label="Meet Runtime">
        <div className="gr-hero-body">
          <img className="gr-hero-mascot" src={art('portrait')} alt="Runtime, your CRT-headed AI Chief of Staff" width="112" height="112" fetchPriority="high"/>
          <h1><span className="gr-sr-only">Runtime, AI that gets the work done.</span><span aria-hidden="true">Runtime, AI that</span><RuntimeOutcome/></h1>
          <div className="gr-account"><p>Meet your anticipatory AI superstaff</p><a className="gr-account-option" href={RUNTIME_WORKSPACE}><Mail size={20} strokeWidth={1.5}/><span>Your HIVEMIND account</span><ArrowUpRight size={18}/></a><a className="gr-continue" href={RUNTIME_WORKSPACE}>Continue to Runtime</a><small>Your company. Your specialists. One shared direction.</small></div>
        </div>
        <a className="gr-learn" href="#runtime-introduction">Learn more <ArrowDown size={17}/></a>
      </section>
      <section className="gr-intro" id="runtime-introduction"><div className="gr-intro-copy"><h2>Built around your company.</h2><p>A signal becomes a decision. A decision becomes a plan.<br className="gr-desktop-break"/> Runtime brings the right specialists together and carries the work through.</p></div><figure><img src={art('company')} width="1672" height="941" loading="lazy" alt="Runtime and three specialist HyperAgents working together on a company assignment"/><figcaption>Your AI Chief of Staff, with a team of specialist digital employees.</figcaption></figure></section>
      <section className="gr-features" aria-label="What Runtime does">{runtimeFeatures.map((feature, index) => <article key={feature.id} id={`runtime-${feature.id}`} className={`gr-feature${index % 2 ? ' gr-feature-reverse' : ''}`}><div className="gr-feature-art"><img src={art(feature.image)} alt={feature.alt} width="1254" height="1254" loading="lazy"/></div><div className="gr-feature-copy"><h2>{feature.title}</h2><p>{feature.text}</p>{feature.note && <small>{feature.note}</small>}</div></article>)}</section>
      <section className="gr-workflow" aria-labelledby="gr-workflow-title"><div className="gr-section-copy"><h2 id="gr-workflow-title">One signal. Work carried through.</h2><p>See how Runtime connects the next step to the result.</p></div><div className="gr-workflow-demo"><div className="gr-workflow-steps" role="tablist" aria-label="Explore the Runtime workflow">{workflow.map((item,index) => <button key={item.title} id={`gr-step-${index}`} type="button" role="tab" aria-selected={step===index} aria-controls="gr-workflow-panel" tabIndex={step===index?0:-1} onClick={()=>setStep(index)} onKeyDown={event=>{let next;if(event.key==='ArrowRight')next=(index+1)%workflow.length;if(event.key==='ArrowLeft')next=(index+workflow.length-1)%workflow.length;if(event.key==='Home')next=0;if(event.key==='End')next=workflow.length-1;if(next!==undefined){event.preventDefault();setStep(next);event.currentTarget.parentElement.querySelectorAll('button')[next].focus();}}}><item.icon size={20}/>{item.title}</button>)}</div><div className="gr-workflow-panel" id="gr-workflow-panel" role="tabpanel" aria-labelledby={`gr-step-${step}`} tabIndex="0"><div><span className="gr-workflow-status"><i/>{selected.status}</span><h3>{selected.headline}</h3><p>{selected.text}</p></div><div className="gr-work-note"><div className="gr-work-note-header"><img src={art('portrait')} alt="" width="38" height="38"/><span>Runtime<strong>Company workroom</strong></span></div><ul>{selected.items.map(item=><li key={item}><Check size={17}/>{item}</li>)}</ul><span className="gr-note-caption">Illustrative workflow</span></div></div></div><p className="gr-workflow-caption">An example of the operating loop. Actual work depends on your company context, enabled services and permissions.</p></section>
      <section className="gr-closer"><img src={art('portrait')} alt="" width="104" height="104" loading="lazy"/><h2>Less prompting.<br/>More work, carried through.</h2><p>Give Runtime a direction. Bring your company’s next move into focus.</p><a className="gr-continue" href={RUNTIME_WORKSPACE}>Meet your Runtime</a><a className="gr-research" href="https://singulancelabs.com/research/runtime">Explore the thinking behind Runtime <ArrowUpRight size={15}/></a></section>
      <section className="gr-faq" aria-labelledby="gr-faq-title"><h2 id="gr-faq-title">A few things to know.</h2><div>{questions.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={20}/></summary><p>{answer}</p></details>)}</div></section>
    <VisibilityLinks/></main>
    <footer className="gr-footer"><a className="gr-footer-runtime" href="#runtime-main">Runtime</a><nav aria-label="Runtime footer"><a href="https://singulancelabs.com/privacy">Privacy</a><a href="https://singulancelabs.com/security">Security</a><a href="https://singulancelabs.com/cookies">Cookies</a><a href="https://singulancelabs.com/research/runtime">Research</a></nav><p>From <a href="https://singulancelabs.com">SINGULANCE</a> © {new Date().getFullYear()}</p></footer>
  </div>;
}
