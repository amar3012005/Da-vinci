/** Shared public editorial content; no private workspace facts or unverified traction. */
export const DEFINITION = 'Proactive intelligence is AI that notices what needs attention, connects it to your goals, plans the next useful step, and carries approved work forward with human oversight and a record of its actions.';
export const COMPANY_LINE = 'SINGULANCE is building proactive intelligence: company memory, an AI Chief of Staff and specialist AI teammates that help carry work forward.';
export const FOUNDER_BIO = 'Amar Sai Gadde is the founder of SINGULANCE, working on proactive AI and agent memory. His background spans Engineering Physics at IIT Mandi, an exchange at Leibniz Universität Hannover, robotics and embedded AI.';
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

/** Professional background reviewed against the founder's CV and academic records.
 * Education is described as study/exchange, not a completed degree. */
export const FOUNDER_BACKGROUND = {
  education: [
    {title:'Indian Institute of Technology Mandi', detail:'Engineering Physics studies at IIT Mandi, on a B.Tech programme with a 2023–2027 timeline. His technical work spans physics, AI, robotics and software systems.'},
    {title:'Leibniz Universität Hannover', detail:'Academic exchange in the Faculty of Mathematics and Physics during 2025–26, through the university partnership programme with IIT Mandi.'},
  ],
  projects: [
    {title:'Autonomous aerial robotics', detail:'Worked on the Inter IIT Tech Meet 2024 Aerial Robotics Challenge, using PX4, MAVLink, ROS2 and Gazebo for autonomous navigation, mission planning and simulation.'},
    {title:'Foodles', detail:'Founded a campus food-ordering project at IIT Mandi, combining full-stack development, vendor integration and user outreach.'},
    {title:'HAWK', detail:'Worked on an edge-AI wildlife-threat detection project, using on-device computer vision and embedded hardware.'},
    {title:'CrowdFlowAI', detail:'Built a hackathon project exploring computer-vision-based people-flow monitoring and heatmap analytics.'},
    {title:'EEG2Text', detail:'Explored an EEG-to-text learning pipeline, including signal preprocessing, feature extraction and recurrent models.'},
    {title:'ENIGMA', detail:'Built an earlier context-aware AI assistant for scheduling and modular tasks. His earlier project portfolio also includes ENIGMA OS, an operating-system concept in development.'},
  ],
  leadership: [
    'Technical Co-Coordinator of the Robotronics Club: technical initiatives, mentoring, workshops and training sessions.',
    'Core contributor to a Mars rover project team, working on software subsystems and web development.',
    'Project Head for Project X, coordinating interdisciplinary prototypes across automation, AI and embedded systems.',
  ],
  expertise: ['Agent memory and contextual AI','Robotics and autonomous navigation','Embedded AI and hardware–software integration','Computer vision and natural language processing','Full-stack development with React and Node.js','Technical team coordination and product development'],
};
