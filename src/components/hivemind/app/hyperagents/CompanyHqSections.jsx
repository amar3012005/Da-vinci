import React, { useId, useState } from 'react';
import { ArrowUpRight, CalendarClock, ChevronDown, FileText, FolderOpen, MessageSquare, Users } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import RuntimeAvatar from '../shared/RuntimeAvatar';
import { artifactUrl, formatShortDate, mediaBadge, mediaKind } from '../shared/runtime-library';

/** Visible keyboard focus ring shared by every Company HQ control. */
export const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3484ff]';

const TONE_CHIP = {
  working: 'bg-[#e8f0fc] text-[#2559a8]',
  active: 'bg-[#e8f0fc] text-[#2559a8]',
  attention: 'bg-[#fbf0dc] text-[#8a5a0b]',
  review: 'bg-[#f1ebf8] text-[#6a3fa0]',
  scheduled: 'bg-[#eef0ec] text-[#4b5348]',
  done: 'bg-[#e7f3ea] text-[#24683b]',
  paused: 'bg-[#f1f0eb] text-[#5f646b]',
  neutral: 'bg-[#f1f0eb] text-[#4f545a]',
  idle: 'bg-[#f4f3ef] text-[#7a7f86]',
  unknown: 'bg-[#f4f3ef] text-[#7a7f86]',
};
const TONE_DOT = {
  working: 'bg-[#2f74e0]', attention: 'bg-[#d08a16]', scheduled: 'bg-[#7c8577]', paused: 'bg-[#a3a39c]', idle: 'bg-[#22a35a]', unknown: 'bg-[#c4c2bb]',
};

/** Small rounded status label; `tone` picks a calm tint. */
export function StatusChip({ tone = 'neutral', children }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[tone] || TONE_CHIP.neutral}`}>{children}</span>;
}

/**
 * One Company HQ card with a titled header; `area` places it in the page grid.
 * @param {{ area: string, title: string, icon?: Function, count?: number, action?: React.ReactNode, children: React.ReactNode, busy?: boolean }} props - card content.
 */
export function HqCard({ area, title, icon: Icon, count, action, children, busy }) {
  const id = useId();
  return <section className={`hm-hq-card hm-hq-${area} flex min-w-0 flex-col rounded-2xl border border-[#e7e4dd] bg-white`} aria-labelledby={id} aria-busy={busy || undefined}>
    <header className="flex min-h-[52px] items-center gap-2 px-4 pt-3 sm:px-5">
      {Icon ? <Icon size={15} className="shrink-0 text-[#747970]" aria-hidden="true" /> : null}
      <h2 id={id} className="truncate text-[14px] font-semibold tracking-[-0.005em] text-[#1f2328]">{title}</h2>
      {Number.isFinite(count) ? <span className="rounded-full bg-[#f1f0eb] px-2 py-0.5 text-[11px] tabular-nums text-[#5f646b]">{count}</span> : null}
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </header>
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-5">{children}</div>
  </section>;
}

/** Quiet empty state inside a card. */
export function EmptyNote({ children }) {
  return <p className="rounded-xl border border-dashed border-[#e3e0d8] bg-[#fbfaf7] px-3.5 py-4 text-[12.5px] leading-5 text-[#6f747b]">{children}</p>;
}

function SkeletonLines({ rows = 3 }) {
  return <div className="space-y-3" aria-hidden="true">{Array.from({ length: rows }, (unused, index) => <div key={index} className="flex items-center gap-3">
    <span className="hm-skeleton h-9 w-9 shrink-0 rounded-full" />
    <span className="flex-1 space-y-1.5"><span className="hm-skeleton block h-3 rounded" style={{ width: `${70 - index * 12}%` }} /><span className="hm-skeleton block h-2.5 w-1/3 rounded" /></span>
  </div>)}</div>;
}

/** Full-page placeholder with the same grid as the loaded page, so nothing jumps on arrival. */
export function HqSkeleton() {
  return <div className="flex-1 min-h-0 overflow-hidden bg-[#faf9f4]" role="status" aria-label="Loading company">
    <div className="hm-hq-scroll h-full overflow-hidden">
      <div className="border-b border-[#e3e0db] px-4 pb-4 pt-5 sm:px-6" aria-hidden="true">
        <span className="hm-skeleton block h-3 w-24 rounded" />
        <span className="hm-skeleton mt-3 block h-7 w-56 max-w-full rounded-lg" />
        <span className="hm-skeleton mt-3 block h-3 w-72 max-w-full rounded" />
      </div>
      <div className="hm-hq-grid px-4 py-4 sm:px-6 sm:py-5" aria-hidden="true">
        {['overview', 'runtime', 'team', 'wakes', 'deliverables', 'files'].map(area => <div key={area} className={`hm-hq-card hm-hq-${area} rounded-2xl border border-[#e7e4dd] bg-white p-4 sm:p-5`}>
          <span className="hm-skeleton block h-3.5 w-32 rounded" />
          <div className="mt-5"><SkeletonLines rows={area === 'overview' ? 2 : 3} /></div>
        </div>)}
      </div>
    </div>
    <span className="sr-only">Loading company…</span>
  </div>;
}

/**
 * Runtime's live status and its open agendas.
 * @param {{ status: { tone: string, label: string, detail: string }, room?: object, agendas: Array<object>, loading: boolean }} props - projections from company-hq-model.
 */
export function RuntimeCard({ status, room, agendas, loading }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? agendas : agendas.slice(0, 4);
  return <HqCard area="runtime" title="Runtime" count={agendas.length || undefined} busy={loading}>
    <div className="flex items-center gap-3 rounded-xl bg-[#f7f6f2] p-3">
      <RuntimeAvatar alt="" room={room} size={48} className="h-12 w-12" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1f2328]">
          <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[status.tone] || TONE_DOT.unknown}`} aria-hidden="true" />
          <span className="truncate" role="status">{status.label}</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-[18px] text-[#6f747b]">{status.detail}</p>
      </div>
    </div>
    <h3 className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]">Current agendas</h3>
    {loading && !agendas.length ? <SkeletonLines rows={2} /> : null}
    {!loading && !agendas.length ? <EmptyNote>No open agendas right now. Ask Runtime in chat to plan the next piece of work.</EmptyNote> : null}
    {agendas.length ? <ol className="space-y-1">
      {shown.map(agenda => <li key={agenda.id} className="flex items-start gap-2.5 rounded-lg px-1 py-2">
        <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${agenda.tone === 'attention' ? 'bg-[#d08a16]' : agenda.tone === 'active' ? 'bg-[#2f74e0]' : 'bg-[#b9b6ad]'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-5 text-[#262b31]">{agenda.title}</span>
          {agenda.objective ? <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[18px] text-[#6f747b]">{agenda.objective}</span> : null}
        </span>
        <StatusChip tone={agenda.tone}>{agenda.label}</StatusChip>
      </li>)}
    </ol> : null}
    {agendas.length > 4 ? <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className={`mt-1 inline-flex min-h-[40px] items-center gap-1 self-start rounded-lg px-1 text-[12.5px] font-medium text-[#2559a8] hover:underline ${FOCUS}`}>
      {expanded ? 'Show fewer' : `Show ${agendas.length - 4} more`}<ChevronDown size={14} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
    </button> : null}
  </HqCard>;
}

/**
 * Teammates with their live state and assigned agendas, followed by planned company work.
 * @param {{ members: Array<object>, onOpenTeammate?: Function, onViewProfile?: Function, plannedWork?: React.ReactNode, plannedCount: number }} props - projected teammates and the planned-work list.
 */
export function TeamCard({ members, onOpenTeammate, onViewProfile, plannedWork, plannedCount }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? members : members.slice(0, 6);
  return <HqCard area="team" title="Team & assignments" icon={Users} count={members.length || undefined}>
    {!members.length ? <EmptyNote>No teammates yet. Create an employee from the sidebar and Runtime can delegate work to them.</EmptyNote> : null}
    {members.length ? <ul className="hm-hq-team-grid">
      {shown.map(member => {
        const open = onOpenTeammate ? event => onOpenTeammate(event, member.agent) : onViewProfile ? () => onViewProfile(member.agent) : null;
        const body = <>
          <AgentAvatar agent={member.agent} size={40} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2"><span className="truncate text-[13.5px] font-medium text-[#20252a]">{member.name}</span></span>
            <span className="block truncate text-[12px] capitalize text-[#7a7f86]">{member.activity || member.role}</span>
            {member.items.length ? <span className="mt-1 block truncate text-[12px] text-[#3d4249]">{member.items[0].title}{member.items.length > 1 ? ` +${member.items.length - 1}` : ''}</span> : null}
          </span>
          <StatusChip tone={member.tone}>{member.label}</StatusChip>
        </>;
        return <li key={member.id} className="min-w-0">
          {open ? <button type="button" onClick={open} aria-label={`${member.name}, ${member.role}, ${member.label}${onOpenTeammate ? '. Open their room' : '. View profile'}`}
            className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#f5f4ef] ${FOCUS}`}>{body}</button>
            : <div className="flex min-h-[60px] items-center gap-3 rounded-xl px-2.5 py-2">{body}</div>}
        </li>;
      })}
    </ul> : null}
    {members.length > 6 ? <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className={`mt-1 inline-flex min-h-[40px] items-center gap-1 self-start rounded-lg px-1 text-[12.5px] font-medium text-[#2559a8] hover:underline ${FOCUS}`}>
      {expanded ? 'Show fewer' : `Show all ${members.length}`}<ChevronDown size={14} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
    </button> : null}
    {plannedCount ? <>
      <h3 className="mb-2 mt-5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]">Planned company work</h3>
      {plannedWork}
    </> : null}
  </HqCard>;
}

/**
 * Upcoming wakes grouped by day plus teammates whose assignments wait on a schedule.
 * @param {{ groups: Array<object>, scheduledMembers: Array<object>, loading: boolean, now: number }} props - projections from company-hq-model.
 */
export function WakesCard({ groups, scheduledMembers, loading, now }) {
  const today = new Date(now);
  const empty = !groups.length && !scheduledMembers.length;
  return <HqCard area="wakes" title="Calendar & next wakes" icon={CalendarClock} busy={loading}>
    <div className="mb-3 flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 grid-rows-[16px_1fr] overflow-hidden rounded-xl border border-[#e7e4dd] text-center" aria-hidden="true">
        <span className="bg-[#e9604f] text-[9.5px] font-semibold uppercase leading-4 tracking-[0.08em] text-white">{today.toLocaleDateString(undefined, { month: 'short' })}</span>
        <span className="text-[18px] font-semibold leading-7 text-[#1f2328]">{today.getDate()}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-[#20252a]">{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <span className="block text-[12px] text-[#7a7f86]">{groups.length ? `Next wake ${groups[0].label === 'Today' ? 'today' : groups[0].label === 'Tomorrow' ? 'tomorrow' : `on ${groups[0].label}`} at ${groups[0].items[0].time}` : 'No timed wakes scheduled'}</span>
      </span>
    </div>
    {loading && empty ? <SkeletonLines rows={2} /> : null}
    {!loading && empty ? <EmptyNote>Nothing scheduled. Runtime also wakes on its own when new evidence or a reply arrives.</EmptyNote> : null}
    {groups.map(group => <div key={group.key} className="mt-2 first:mt-0">
      <h3 className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]">{group.label}</h3>
      <ul className="border-l border-[#e3e0d8] pl-3">
        {group.items.map(item => <li key={item.id} className="relative flex min-h-[36px] items-center gap-3 py-1">
          <span className="absolute -left-[17px] h-2 w-2 rounded-full border border-[#8b8b86] bg-white" aria-hidden="true" />
          <time dateTime={new Date(item.at).toISOString()} className="w-12 shrink-0 text-[12px] tabular-nums text-[#5f646b]">{item.time}</time>
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#262b31]">{item.label}</span>
          {item.overdue ? <StatusChip tone="attention">Due</StatusChip> : null}
        </li>)}
      </ul>
    </div>)}
    {scheduledMembers.length ? <div className="mt-3">
      <h3 className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]">Scheduled assignments</h3>
      <ul className="space-y-1">{scheduledMembers.map(member => <li key={member.id} className="flex min-h-[36px] items-center gap-2.5 text-[13px] text-[#262b31]">
        <AgentAvatar agent={member.agent} size={24} /><span className="truncate">{member.name}</span><span className="ml-auto shrink-0 text-[12px] text-[#7a7f86]">Waiting for its time</span>
      </li>)}</ul>
    </div> : null}
  </HqCard>;
}

const KIND_TILE = {
  document: 'bg-[#edf1f7] text-[#41608f]', sheet: 'bg-[#ebf4ee] text-[#2f6b45]', image: 'bg-[#f3eef6] text-[#6c4f86]',
  web: 'bg-[#f1efe9] text-[#5d5a52]', other: 'bg-[#f1efe9] text-[#6b6860]',
};

/**
 * Newest deliverables from the Library and sealed company rooms.
 * @param {{ rows: Array<object>, loading: boolean, now: number, onOpenRoom?: Function, onOpenLibrary?: Function }} props - rows from `recentDeliverables`.
 */
export function DeliverablesCard({ rows, loading, now, onOpenRoom, onOpenLibrary }) {
  const action = onOpenLibrary ? <button type="button" onClick={onOpenLibrary} className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-[#2559a8] hover:bg-[#f1f5fb] ${FOCUS}`}>Open Library<ArrowUpRight size={14} aria-hidden="true" /></button> : null;
  return <HqCard area="deliverables" title="Recent deliverables" icon={FolderOpen} action={action} busy={loading}>
    {loading && !rows.length ? <div className="hm-hq-deliverables-grid" aria-hidden="true">{[0, 1, 2].map(index => <span key={index} className="hm-skeleton block h-[68px] rounded-xl" />)}</div> : null}
    {!loading && !rows.length ? <EmptyNote>Finished reports, drafts and files from Runtime and your team appear here.</EmptyNote> : null}
    {rows.length ? <ul className="hm-hq-deliverables-grid">
      {rows.map(row => {
        const kind = row.source === 'library' ? mediaKind(row.item.mediaType, row.item.title) : 'document';
        const tile = <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ${row.source === 'room' ? 'bg-[#e7f3ea] text-[#24683b]' : KIND_TILE[kind]}`} aria-hidden="true">
          {row.source === 'room' ? <MessageSquare size={17} /> : kind === 'document' ? <FileText size={17} /> : mediaBadge(row.item.mediaType, row.item.title)}
        </span>;
        const text = <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[13px] font-medium leading-[18px] text-[#20252a]">{row.title}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-[#7a7f86]">{[row.source === 'room' ? 'Room deliverable' : row.producer, formatShortDate(row.at, now)].filter(Boolean).join(' · ')}</span>
        </span>;
        const className = `flex min-h-[68px] w-full items-center gap-3 rounded-xl border border-[#eeece6] px-3 py-2.5 text-left hover:border-[#d8d4cb] hover:bg-[#fbfaf7] ${FOCUS}`;
        return <li key={row.key} className="min-w-0">
          {row.source === 'library'
            ? <a href={artifactUrl(row.item)} target="_blank" rel="noopener noreferrer" className={className}>{tile}{text}</a>
            : onOpenRoom ? <button type="button" onClick={() => onOpenRoom({ id: row.item.room_id, name: row.item.title })} className={className}>{tile}{text}</button>
              : <div className={className.replace(/hover:\S+/g, '')}>{tile}{text}</div>}
        </li>;
      })}
    </ul> : null}
  </HqCard>;
}
