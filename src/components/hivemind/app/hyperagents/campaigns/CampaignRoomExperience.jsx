import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Lightbulb, MessageSquareText, Search, Sparkles } from 'lucide-react';

const CHANNEL_LABELS = { x_organic: 'X', gmail: 'Email', tara: 'TARA' };
const INTERNAL_FIELD = /\b(CAMPAIGN_ID|BRIEF_JSON|AUDIENCE_POLICY_JSON|USER_FEEDBACK|EXECUTION_CONTEXT|campaign__submit_plan)\b/i;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function textFromLine(line) {
  if (typeof line?.content === 'string') return line.content;
  if (typeof line?.line === 'string') return line.line;
  if (typeof line?.summary === 'string') return line.summary;
  return '';
}

function displayAgent(value) {
  const agent = safeCampaignRoomText(value);
  if (!agent) return '';
  return agent.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function safeCampaignRoomText(value) {
  const text = String(value || '').trim();
  if (!text || INTERNAL_FIELD.test(text)) return '';
  if (text.startsWith('{') || text.startsWith('[')) return '';
  return text
    .replace(UUID, '')
    .replace(/\b(?:room|turn|campaign|plan)_id\s*[:=]\s*\S+/gi, '')
    .replace(/\b(?:tool|function)\s*[:=]\s*\S+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function researchItem(line) {
  if (line.t === 'gather') {
    const sources = (line.sources || []).filter(Boolean).map((source) => source === 'hivemind' ? 'company knowledge' : source).join(', ');
    return `Relevant context was gathered${sources ? ` from ${sources}` : ''}.`;
  }
  if (line.t === 'web_intel') return `Market research added ${line.count || 0} relevant source${line.count === 1 ? '' : 's'} to the campaign evidence.`;
  if (line.t === 'prospects') return `Audience research identified ${line.count || 0} relevant prospect${line.count === 1 ? '' : 's'} for consideration.`;
  if (line.t === 'skill_used') return 'A specialist campaign method was applied to the shared research.';
  const note = safeCampaignRoomText(line.note);
  return note && !/drafting the final deliverable/i.test(note) ? note : '';
}

function debateItem(line) {
  if (line.t === 'round_start') return `Strategy review round ${line.round || 1} started.`;
  if (line.t === 'swarm_verdict') return line.converged ? 'The campaign team reached a shared recommendation.' : 'The team identified strategic points that needed further review.';
  return safeCampaignRoomText(textFromLine(line));
}

function decisionItem(line) {
  if (line.t === 'campaign_bundle') return 'The final campaign plan passed its readiness checks.';
  if (line.t === 'campaign_bundle_invalid') return 'The draft needed refinement before it could become launch-ready.';
  if (line.t === 'campaign_tool') return line.status === 'accepted' ? 'The final campaign plan passed its readiness checks.' : 'The team is refining the plan to meet every campaign requirement.';
  return safeCampaignRoomText(textFromLine(line));
}

export function groupCampaignRoomTranscript(roomTranscript = []) {
  const groups = { research: [], debate: [], decisions: [], synthesis: [] };
  roomTranscript.forEach((turn) => {
    (turn.lines || []).forEach((line) => {
      if (!line || typeof line !== 'object') return;
      if (['gather', 'web_intel', 'prospects', 'skill_used'].includes(line.t) || (line.t === 'typing' && !/drafting the final deliverable/i.test(line.note || ''))) {
        const content = researchItem(line);
        if (content) groups.research.push({ agent: displayAgent(line.agent), content });
        return;
      }
      if (['round_start', 'react', 'swarm_verdict'].includes(line.t)) {
        const content = debateItem(line);
        if (content) groups.debate.push({ agent: displayAgent(line.agent), content });
        return;
      }
      if (['campaign_bundle', 'campaign_bundle_invalid', 'campaign_tool'].includes(line.t)) {
        const content = decisionItem(line);
        if (content && !groups.decisions.some((item) => item.content === content)) groups.decisions.push({ content });
        return;
      }
      if (line.t === 'line' && line.kind === 'synthesis') {
        const content = safeCampaignRoomText(textFromLine(line));
        if (content) groups.synthesis.push({ agent: displayAgent(line.agent), content });
      }
    });
  });
  return groups;
}

function currentStage(campaign, groups) {
  if (campaign.status === 'GENERATING') {
    if (groups.synthesis.length) return 'Finalizing the campaign';
    if (groups.debate.length) return 'Agents are reviewing the strategy';
    return 'Researching company and audience context';
  }
  if (campaign.status === 'READY_FOR_APPROVAL') return 'Ready to launch';
  if (['RUNNING', 'SCHEDULED'].includes(campaign.status)) return 'Campaign is running';
  if (campaign.status === 'PAUSED') return 'Campaign is paused';
  if (campaign.status === 'COMPLETED') return 'Campaign completed';
  if (campaign.status === 'NEEDS_INPUT') return 'Waiting for your input';
  if (campaign.status === 'FAILED') return 'Campaign needs attention';
  return 'Campaign planning';
}

function ActivitySection({ icon: Icon, title, description, items, active }) {
  return <section className="border-b border-[#dfdbd4] py-5 last:border-b-0">
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 w-8 h-8 shrink-0 grid place-items-center rounded-md border ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#d8d3cc] bg-white text-[#6f6962]'}`}><Icon size={14} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><h3 className="text-[12.5px] font-semibold text-[#24211f]">{title}</h3>{active ? <span className="text-[9px] font-mono uppercase text-[#256d5b]">In progress</span> : null}</div>
        <p className="mt-0.5 text-[10.5px] text-[#817b74]">{description}</p>
        {items.length ? <div className="mt-3 space-y-2">{items.map((item, index) => <div key={`${title}-${index}`} className="flex gap-2.5 text-[11.5px] leading-5 text-[#45413d]"><CheckCircle2 size={12} className="mt-1 shrink-0 text-[#628276]" /><div>{item.agent ? <span className="font-semibold">{item.agent}: </span> : null}{item.content}</div></div>)}</div> : <div className="mt-3 flex items-center gap-2 text-[10.5px] text-[#9a948d]"><Circle size={10} />Waiting for this stage</div>}
      </div>
    </div>
  </section>;
}

export default function CampaignRoomExperience({ campaign, ReportComponent }) {
  const groups = useMemo(() => groupCampaignRoomTranscript(campaign.roomTranscript || []), [campaign.roomTranscript]);
  const stage = currentStage(campaign, groups);
  const plan = campaign.planVersions?.[0];
  const finalReport = plan?.bundle
    ? { bundle: plan.bundle, content: plan.reportMarkdown }
    : (plan?.reportMarkdown || groups.synthesis.at(-1)?.content);
  const isGenerating = campaign.status === 'GENERATING';
  const activeSection = isGenerating ? (groups.debate.length ? 'debate' : 'research') : '';

  return <div className="max-w-5xl">
    <header className="border border-[#d8d3cc] bg-white rounded-md overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-[#e6e2dc] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div><div className="inline-flex items-center gap-1.5 text-[9.5px] font-mono uppercase text-[#256d5b]"><Sparkles size={11} />Campaign Mode</div><h2 className="mt-1 text-[16px] font-semibold text-[#171717]">{campaign.name}</h2><p className="mt-1 max-w-3xl text-[11.5px] leading-5 text-[#615c56]">{campaign.goal}</p></div>
        <div className="shrink-0"><div className="text-[9px] font-mono uppercase text-[#8a847d]">Current stage</div><div className="mt-1 text-[11.5px] font-semibold text-[#24211f]">{stage}</div></div>
      </div>
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2"><span className="text-[9px] font-mono uppercase text-[#8a847d] mr-1">Channels</span>{campaign.requestedChannels.map((channel) => <span key={channel} className="px-2 py-1 rounded border border-[#d8d3cc] bg-[#fbfaf6] text-[10px] font-semibold text-[#45413d]">{CHANNEL_LABELS[channel] || channel}</span>)}</div>
    </header>

    <div className="mt-5 border-y border-[#dfdbd4]">
      <ActivitySection icon={Search} title="Research" description="Company, audience, and market context gathered for this campaign." items={groups.research} active={activeSection === 'research'} />
      <ActivitySection icon={MessageSquareText} title="Debate" description="Campaign specialists challenge the positioning, channel choices, and content approach." items={groups.debate} active={activeSection === 'debate'} />
      <ActivitySection icon={Lightbulb} title="Decisions" description="The room resolves trade-offs and checks that the plan is ready to operate." items={groups.decisions} active={false} />
    </div>

    <section className="mt-6">
      <div className="mb-3"><div className="flex items-center gap-2"><Sparkles size={13} className="text-[#256d5b]" /><h3 className="text-[12.5px] font-semibold">Final synthesis</h3></div><p className="mt-1 text-[10.5px] text-[#817b74]">The polished operating plan produced from the room's research and decisions.</p></div>
      {finalReport ? (ReportComponent ? <ReportComponent report={finalReport} taskTitle={campaign.name} /> : <div className="whitespace-pre-wrap text-[12px] leading-6 text-[#34312e]">{finalReport}</div>) : <div className="border border-[#d8d3cc] bg-white rounded-md p-5 text-[11px] text-[#817b74]">The final campaign plan will appear here when the team completes its work.</div>}
    </section>
  </div>;
}
