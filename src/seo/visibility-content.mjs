/** Shared public editorial content; no private workspace facts or unverified traction. */
export const DEFINITION = 'Proactive intelligence is AI that notices what needs attention, connects it to your goals, plans the next useful step, and carries approved work forward with human oversight and a record of its actions.';
export const COMPANY_LINE = 'SINGULANCE is building proactive intelligence: company memory, an AI Chief of Staff and specialist AI teammates that help carry work forward.';
export const FOUNDER_BIO = 'Amar Sai Gadde is the founder of SINGULANCE, building proactive intelligence through company memory, persistent AI coordination and specialist agents.';
export const ENTITIES = [
  {name:'HIVEMIND', role:'Company understanding', href:'/hivemind', text:'The company Brain. Connect authorized knowledge, retain useful context and explore answers with their evidence.'},
  {name:'SINGULANCE Runtime', role:'Anticipation and coordination', href:'/runtime', text:'The AI Chief of Staff. Relate signals to priorities, coordinate specialists, review results and bring decisions back to you.'},
  {name:'HyperAgents', role:'Specialist work', href:'/hyperagents', text:'AI teammates with defined roles and persistent workspaces. Runtime coordinates assignments and reviews their results.'},
  {name:'ICARUS', role:'Agent memory', href:'/icarus', text:'The memory filesystem for AI agents. Explore the installation guide and the research behind durable agent context.'},
];
export const FAQS = [
  ['What is proactive intelligence?', DEFINITION],
  ['How is it different from a chatbot?', 'A chatbot usually responds to a request. Proactive intelligence also assesses relevant changes against existing goals, chooses a justified next step and maintains continuity. It should ask for essential decisions and respect the authority already granted.'],
  ['Is it the same as an automated workflow?', 'A workflow follows a defined sequence. Proactive intelligence adds contextual judgment about whether a change matters and which next step is useful. Defined workflows and deterministic approval checks can still carry out parts of that work.'],
  ['Does proactive mean acting without permission?', 'No. Initiative does not grant authority. A signal can request assessment without authorizing an external action. Work remains subject to the permissions, approvals and connections enabled for the company.'],
  ['What does SINGULANCE build?', COMPANY_LINE + ' HIVEMIND provides company context, Runtime coordinates work, HyperAgents perform specialist assignments, and ICARUS explores agent memory.'],
  ['Is every capability available to every account?', 'No. SINGULANCE is in early access. Availability depends on account access, configured connections and permissions. The operating cycle on this page describes the design direction, not a guarantee that every scenario is production-verified.'],
];
export const EXAMPLES = [
  {label:'A customer deadline changes', signal:'A customer moves the review to Friday.', context:'The delivery agenda already has a draft and an assigned owner.', disposition:'Advance the existing work', action:'Review the draft, identify what needs updating and coordinate the owner. Ask for approval if a new external commitment is needed.', evidence:'Keep the reviewed result, responsible owner and next dependency together.'},
  {label:'A teammate returns research', signal:'A specialist delivers the requested market evidence.', context:'The parent agenda is deciding which customer segment to investigate.', disposition:'Review, then carry forward', action:'Check the sources and limitations, then prepare the next authorized validation step. A report alone does not complete customer outreach.', evidence:'Record accepted evidence and what it supports; surface the decision that remains.'},
  {label:'An informational notice arrives', signal:'A general update arrives in a connected app.', context:'It changes no current goal, deadline or dependency.', disposition:'Acknowledge quietly', action:'Retain the assessment without creating unnecessary work or repeatedly alerting the user.', evidence:'Preserve the existing handoff and review time when nothing meaningful changed.'},
];
