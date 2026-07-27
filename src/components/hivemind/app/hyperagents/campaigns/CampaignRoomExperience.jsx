import React, { useMemo } from 'react';
import { Check, FileCheck2, Lightbulb, MessageSquareText, Search, Sparkles } from 'lucide-react';
import { CampaignCreativeGallery } from './CampaignCreative';
import { CHANNEL_NAMES } from './channel-catalog';

const INTERNAL_FIELD = /\b(CAMPAIGN_ID|BRIEF_JSON|AUDIENCE_POLICY_JSON|CHANNEL_CAPABILITIES_JSON|USER_FEEDBACK|EXECUTION_CONTEXT|campaign__submit_plan)\b/i;
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
  if (campaign.status === 'PREPARING_ASSETS') return 'Creating campaign visuals';
  if (campaign.status === 'READY_FOR_APPROVAL') return 'Ready to launch';
  if (['RUNNING', 'SCHEDULED'].includes(campaign.status)) return 'Campaign is running';
  if (campaign.status === 'PAUSED') return 'Campaign is paused';
  if (campaign.status === 'COMPLETED') return 'Campaign completed';
  if (campaign.status === 'NEEDS_INPUT') return 'Waiting for your input';
  if (campaign.status === 'FAILED') return 'Campaign needs attention';
  return 'Campaign planning';
}

function Phase({ icon: Icon, title, note, status }) {
  const complete = status === 'complete';
  const active = status === 'active';
  return <div className="relative min-w-0 px-3 py-3 first:pl-0 last:pr-0">
    <div className="flex items-center gap-2">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${complete ? 'border-[#3f806c] bg-[#eaf4ef] text-[#256d5b]' : active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#d8d3cc] bg-white text-[#9a948d]'}`}>
        {complete ? <Check size={13} /> : <Icon size={13} />}
      </span>
      <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-[#24211f]">{title}</div><div className="truncate text-[9px] text-[#817b74]">{active ? 'In progress' : complete ? 'Complete' : note}</div></div>
    </div>
  </div>;
}

function SignalList({ title, items, empty }) {
  const visible = items.slice(-3).reverse();
  return <section>
    <div className="flex items-center justify-between gap-3"><h3 className="text-[11px] font-semibold text-[#34312e]">{title}</h3>{items.length > visible.length ? <span className="text-[9px] text-[#817b74]">{items.length} signals</span> : null}</div>
    {visible.length ? <div className="mt-2 space-y-2">{visible.map((item, index) => <div key={`${title}-${index}`} className="flex gap-2 text-[10.5px] leading-5 text-[#615c56]"><Check size={11} className="mt-1 shrink-0 text-[#4c806f]" /><p>{item.agent ? <span className="font-semibold text-[#34312e]">{item.agent}: </span> : null}{item.content}</p></div>)}</div> : <p className="mt-2 text-[10.5px] text-[#9a948d]">{empty}</p>}
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
  const preparingAssets = campaign.status === 'PREPARING_ASSETS';
  const ready = (Boolean(finalReport) || !isGenerating) && !preparingAssets;
  const phaseStatus = {
    brief: 'complete',
    evidence: groups.research.length ? 'complete' : (isGenerating ? 'active' : 'complete'),
    decisions: groups.decisions.length || groups.synthesis.length ? 'complete' : (groups.debate.length ? 'active' : 'pending'),
    build: ready ? 'complete' : (groups.synthesis.length || groups.decisions.length ? 'active' : 'pending'),
  };

  return <div className="max-w-5xl">
    <header className="border border-[#d8d3cc] bg-white rounded-md overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-[#e6e2dc] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div><div className="inline-flex items-center gap-1.5 text-[9.5px] font-mono uppercase text-[#256d5b]"><Sparkles size={11} />Permanent intelligence room</div><h2 className="mt-1 text-[18px] font-semibold text-[#171717]">Campaign Intelligence</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#615c56]">Research, debate, build, and verify every company campaign in one operating room.</p></div>
        <div className="shrink-0"><div className="text-[9px] font-mono uppercase text-[#8a847d]">Current stage</div><div className="mt-1 text-[11.5px] font-semibold text-[#24211f]">{stage}</div></div>
      </div>
      <div className="grid grid-cols-2 border-b border-[#e6e2dc] sm:grid-cols-4">{[
        ['Company truth', 'Ground every claim'], ['Strategic debate', 'Challenge weak routes'],
        ['Channel build', 'Produce ready actions'], ['Launch verification', 'Protect every send'],
      ].map(([title, note]) => <div key={title} className="border-r border-t border-[#e6e2dc] px-4 py-3 last:border-r-0 sm:border-t-0"><div className="text-[10px] font-semibold text-[#24211f]">{title}</div><div className="mt-0.5 text-[9px] text-[#817b74]">{note}</div></div>)}</div>
      <div className="px-4 sm:px-5 py-3"><div className="text-[9px] font-mono uppercase text-[#8a847d]">Active campaign</div><div className="mt-1 text-[12px] font-semibold text-[#24211f]">{campaign.name}</div><p className="mt-0.5 text-[10.5px] text-[#615c56]">{campaign.goal}</p><div className="mt-2 flex flex-wrap gap-2">{campaign.requestedChannels.map((channel) => <span key={channel} className="px-2 py-1 rounded border border-[#d8d3cc] bg-[#fbfaf6] text-[10px] font-semibold text-[#45413d]">{CHANNEL_NAMES[channel] || channel}</span>)}</div></div>
    </header>

    <section className="mt-5 border-y border-[#dfdbd4]">
      <div className="grid grid-cols-2 divide-x divide-y divide-[#e6e2dc] sm:grid-cols-4 sm:divide-y-0">
        <Phase icon={FileCheck2} title="Brief" note="Goal and pace" status={phaseStatus.brief} />
        <Phase icon={Search} title="Evidence" note="Company context" status={phaseStatus.evidence} />
        <Phase icon={MessageSquareText} title="Decisions" note="Strategy review" status={phaseStatus.decisions} />
        <Phase icon={Lightbulb} title="Build" note="Content and schedule" status={phaseStatus.build} />
      </div>
      {isGenerating ? <div className="grid gap-5 border-t border-[#e6e2dc] py-5 sm:grid-cols-2">
        <SignalList title="Evidence gathered" items={groups.research} empty="The team is grounding the campaign in your company context." />
        <SignalList title="Strategic decisions" items={[...groups.debate, ...groups.decisions]} empty="The room will compare campaign routes after evidence is ready." />
      </div> : null}
    </section>

    <section className="mt-6">
      {finalReport ? (ReportComponent ? <ReportComponent report={finalReport} taskTitle={campaign.name} surface="dashboard" /> : <div className="whitespace-pre-wrap text-[12px] leading-6 text-[#34312e]">{finalReport}</div>) : <div className="border-l-2 border-[#256d5b] bg-[#f2f7f4] px-4 py-4 text-[11px] leading-5 text-[#31554b]">Your Campaign Board will replace this workspace when the team completes its evidence, decisions, content, and schedule checks.</div>}
      {preparingAssets ? <div className="mt-5 flex items-center gap-2 border-l-2 border-[#256d5b] bg-[#f2f7f4] px-4 py-3 text-[10.5px] text-[#31554b]"><Sparkles size={13} />The visual-prompt skill selected the actions that need imagery. Those campaign visuals are being generated now.</div> : null}
      <CampaignCreativeGallery actions={campaign.actions || []} />
    </section>
  </div>;
}
