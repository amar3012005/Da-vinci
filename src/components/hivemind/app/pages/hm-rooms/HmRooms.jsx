import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUp, Bug, Building2, ChevronDown, ChevronRight, CreditCard, Eye,
  FileText, Folder, Gauge, Hash, LayoutDashboard, ListChecks,
  ListTodo, LogOut, Megaphone, PhoneCall, Plus, Power,
  Rocket, Scale, Search, Settings, Sparkles, User, Users,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useAuth } from '../../auth/AuthProvider';
import './hm-rooms-dsh/tokens.css';
import bar from './hm-rooms-dsh/InputBar.module.css';
import {
  applyAgentEvent,
  applyWorkRunEvent,
  emptyWorkRunView,
  eventType,
  hasRunningTools,
  hydrateRegisteredArtifacts,
  startUserTurn,
  transcriptText,
  toolLabel,
} from './hm-rooms-dsh/workrun-view';
import { WorkRunShell } from './workrun';
import * as WorkRunModules from './workrun';
import LegacyRoomsSidebar from './LegacyRoomsSidebar';

const COMPANY_ROOM_FALLBACK = [
  { key: 'campaign', label: 'Campaign Intelligence', Icon: Megaphone },
  { key: 'seo', label: 'SEO', Icon: Search },
  { key: 'marketing', label: 'Marketing', Icon: Megaphone },
  { key: 'outreach', label: 'Outreach Intelligence', Icon: LayoutDashboard },
  { key: 'branding', label: 'Branding', Icon: Eye },
  { key: 'fundraising', label: 'Fundraising', Icon: CreditCard },
  { key: 'research', label: 'Research', Icon: FileText },
  { key: 'product', label: 'Product', Icon: Rocket },
  { key: 'design', label: 'Design', Icon: LayoutDashboard },
  { key: 'legal', label: 'Legal & Finance', Icon: Scale },
];

const CANVAS_CARDS = [
  { title: 'Company Profile', meta: '12 items', sub: 'Company info, branding, team', tone: 'bg-[#dbeafe]', pos: 'left-[8%] top-[6%]' },
  { title: 'Mission', meta: '8 items', sub: 'Strategy, vision, positioning', tone: 'bg-[#d1fae5]', pos: 'right-[10%] top-[6%]' },
  { title: 'Market Research', meta: '14 items', sub: 'Reports, analysis, data', tone: 'bg-[#ede9fe]', pos: 'left-[14%] top-[22%]' },
  { title: 'GDPR Compliance', meta: '9 items', sub: 'Legal, compliance, policies', tone: 'bg-[#fef3c7]', pos: 'right-[8%] top-[22%]' },
  { title: 'Lead Funnel', meta: '11 items', sub: 'Campaigns, targeting', tone: 'bg-[#ffedd5]', pos: 'left-[6%] top-[40%]' },
  { title: 'User Journey', meta: '8 items', sub: 'Onboarding, UX flows', tone: 'bg-[#ede9fe]', pos: 'right-[6%] top-[40%]' },
  { title: 'Market_Research.pdf', meta: '2.4 MB · Updated 2 days ago', sub: 'EU market analysis', kind: 'pdf', pos: 'left-[8%] bottom-[22%]' },
  { title: 'Investor_Deck_v1.pptx', meta: '12.8 MB · Updated 3 days ago', sub: 'Fundraising deck', kind: 'ppt', pos: 'right-[7%] bottom-[22%]' },
  { title: 'HQ Assets', meta: '19 items', sub: 'Logos, media, templates', tone: 'bg-[#dbeafe]', pos: 'left-[18%] bottom-[6%]' },
  { title: 'Roadmap.md', meta: '2 KB · Updated today', sub: 'Next steps and milestones', kind: 'md', pos: 'right-[12%] bottom-[6%]' },
];

function roomIcon(tag) {
  const hit = COMPANY_ROOM_FALLBACK.find((r) => r.key === String(tag || '').toLowerCase());
  return hit?.Icon || Users;
}

function openHyperRoom(navigate, room) {
  const id = String(room?.id || '');
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    navigate(`/hivemind/app/employees/rooms/${id}`);
    return;
  }
  navigate('/hivemind/app/employees/mycompany');
}

const AUTONOMY_MARK = 'Work autonomously to completion';
const TOOL_NAME_RE = /\b(hivemind_[a-z0-9_]+|composio_[a-z0-9_]+)\b/gi;

function stripWorkOrder(text) {
  const raw = transcriptText(text);
  const cut = raw.indexOf(AUTONOMY_MARK);
  if (cut === -1) return raw.trim();
  return raw.slice(0, cut).trim();
}

function splitAssistantBody(raw) {
  let text = transcriptText(raw);
  const tools = [];
  const toolHits = text.match(TOOL_NAME_RE) || [];
  toolHits.forEach((name) => {
    if (!tools.includes(name)) tools.push(name);
  });
  text = text.replace(TOOL_NAME_RE, '').replace(/[ \t]*…[ \t]*/g, '\n');
  text = stripWorkOrder(text);

  const thinkHints = /^(The user is asking|Let me |I'll |I need to |Looking at )/im;
  let thinking = '';
  const synth = text.search(/\n(?=I'm a |Here'?s what|I am |# |\*\*What|\*\*From)/i);
  if (thinkHints.test(text)) {
    if (synth > 40) {
      thinking = text.slice(0, synth).trim();
      text = text.slice(synth).trim();
    } else {
      thinking = text.trim();
      text = '';
    }
  }
  return { text: text.trim(), thinking, toolsFromText: tools };
}

export function flattenMsg(msg) {
  if (!msg) return {
    role: 'assistant', text: '', tools: [], thinking: '', timeline: [],
  };
  const role = msg.role || 'assistant';
  const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content || '') }];
  let text = '';
  let thinking = '';
  const tools = [];
  const timeline = [];
  const lastToolIndex = blocks.reduce((last, block, index) => (
    /^(tool_call|tool-call|tool_result|tool-result)$/.test(String(block?.type || '').toLowerCase()) ? index : last
  ), -1);
  blocks.forEach((b, index) => {
    const t = String(b.type || '').toLowerCase();
    const value = transcriptText(b.thinking ?? b.text ?? b.delta ?? b.content ?? '');
    if (t === 'text') {
      if (index > lastToolIndex) text += value;
      else if (value) timeline.push({ kind: 'thinking', id: b.id || `text-${index}`, text: value });
    } else if (t === 'thinking') {
      thinking += value;
      if (value) timeline.push({ kind: 'thinking', id: b.id || `thinking-${index}`, text: value });
    }
    else if (t === 'tool_call' || t === 'tool-call') {
      const name = b.name || b.tool_name;
      const tool = { name, label: toolLabel(name), state: b.state || 'done', id: b.id };
      tools.push(tool);
      timeline.push({ ...tool, kind: 'tool', id: b.id || `tool-${index}` });
    } else if (t === 'tool_result' || t === 'tool-result') {
      const id = b.tool_call_id || b.id;
      const tool = [...timeline].reverse().find((item) => item.kind === 'tool' && ((id && item.id === id) || !id));
      if (tool) {
        tool.state = 'done';
        tool.result = transcriptText(value || b.output || b.result || '');
      }
    }
  });
  if (role === 'user') {
    return {
      role, text: stripWorkOrder(text), tools: [], thinking: '', timeline: [],
    };
  }
  const split = splitAssistantBody(text);
  split.toolsFromText.forEach((name) => {
    if (!tools.some((t) => t.name === name)) tools.push({ name, label: toolLabel(name), state: 'done' });
  });
  if (split.thinking && !timeline.length) {
    timeline.push({ kind: 'thinking', id: 'legacy-thinking', text: split.thinking });
  }
  return {
    role, text: split.text, thinking: thinking || split.thinking, tools, timeline, raw: msg,
  };
}





function Composer({ value, onChange, onSubmit, busy, placeholder, hero }) {
  const empty = !String(value || '').trim();
  return (
    <form onSubmit={onSubmit} className={`${bar.root} ${hero ? bar.hero : ''}`}>
      <div className={bar.card}>
        <div className={bar.scroll}>
          <div className={bar.grow}>
            {empty && <div className={bar.placeholder}>{placeholder}</div>}
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              rows={hero ? 3 : 2}
              className={bar.input}
              aria-label={placeholder}
            />
          </div>
        </div>
        <div className={bar.row}>
          <div className={bar.tools}>
            <button type="button" className={bar.add} aria-label="Add"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className={bar.trailing}>
            <span className={bar.select}>Fast ▾</span>
            <button type="submit" disabled={busy || empty} className={bar.primary} aria-label="Send">
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function HmRoomList() {
  const navigate = useNavigate();
  const { user, org, logout } = useAuth();
  const [runs, setRuns] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showCompanyRooms, setShowCompanyRooms] = useState(true);

  const load = useCallback(async () => {
    try {
      const [runData, roomData] = await Promise.all([
        apiClient.listWorkRuns({ limit: 24 }).catch(() => ({ workruns: [] })),
        apiClient.listHyperRooms().catch(() => ({ rooms: [] })),
      ]);
      setRuns(runData?.workruns || []);
      setRooms(roomData?.rooms || roomData || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not load runs');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const start = async (e, preset) => {
    e?.preventDefault?.();
    const text = String(preset || goal).trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiClient.createWorkRun({ goal: text });
      const id = data?.workrun?.id || data?.id;
      if (!id) throw new Error('No workrun id returned');
      navigate(`/hivemind/app/hm-rooms/${id}`);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Dispatch failed');
      setBusy(false);
    }
  };

  const liveRooms = Array.isArray(rooms) ? rooms.filter((r) => !r.archived_at && !r.archivedAt) : [];
  const companyRooms = liveRooms.filter((r) => {
    const tag = r.room_tag || r.roomTag;
    return (r.is_domain_home || r.isDomainHome) && tag !== 'general';
  });
  const workRooms = liveRooms.filter((r) => !(r.is_domain_home || r.isDomainHome));
  const companyNav = companyRooms.length
    ? companyRooms.map((r) => ({
        id: r.id,
        label: r.name || r.title || r.room_tag,
        tag: r.room_tag || r.roomTag,
        Icon: roomIcon(r.room_tag || r.roomTag),
      }))
    : COMPANY_ROOM_FALLBACK.map((r) => ({ id: r.key, label: r.label, tag: r.key, Icon: r.Icon }));

  const starters = [
    { title: 'Start with a plan', sub: 'Align on implementation before writing code', Icon: ListTodo },
    { title: 'Debug an issue', sub: 'Find root causes and fix tricky bugs', Icon: Bug },
    { title: 'Create a dashboard', sub: 'Visualize information in a custom interface', Icon: LayoutDashboard },
  ];

  return (
    <div className="hmDshHost h-full flex bg-[#f7f6f3]">
      <aside className="w-[240px] min-w-[240px] shrink-0 flex flex-col border-r border-[#e3e0db] bg-[#faf9f4]">
        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/hivemind/app/employees/rooms')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold bg-[#0a0a0a] text-white"
          >
            <Building2 size={13} className="text-white" />
            Your Company
          </button>
          <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#bcd0ef]">
            <Power size={13} className="text-[#185bcc]" /> Runtime
          </button>
          <button type="button" onClick={() => navigate('/hivemind/app/employees/operating-rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#bcd0ef]">
            <PhoneCall size={13} className="text-[#117dff]" /> Operating Rooms
          </button>
          <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#e3e0db]">
            <ListChecks size={13} className="text-[#117dff]" /> Your Leads
          </button>
          <button type="button" onClick={() => navigate('/hivemind/app/employees/rooms')} className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[#0a0a0a] hover:bg-white border border-[#e3e0db]">
            <Megaphone size={13} className="text-[#c2410c]" /> Run your Social Media
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          <div className="mt-1 border-y border-[#e3e0db] bg-white/45">
            <button
              type="button"
              onClick={() => setShowCompanyRooms((open) => !open)}
              aria-expanded={showCompanyRooms}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-semibold text-[#525252] transition-colors hover:bg-white ${showCompanyRooms ? 'ring-1 ring-inset ring-[#117dff]/40 bg-white' : ''}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Users size={11} className="text-[#525252]" />
                Company rooms
              </span>
              <ChevronDown size={13} className={`text-[#737373] transition-transform ${showCompanyRooms ? 'rotate-180' : ''}`} />
            </button>
            {showCompanyRooms ? (
              <div className="overflow-hidden border-t border-[#e3e0db] bg-[#faf9f4] pb-1">
                {companyNav.map((room) => {
                  const Icon = room.Icon;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => openHyperRoom(navigate, room)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#0a0a0a] hover:bg-white"
                    >
                      <Icon size={13} className="text-[#525252] shrink-0" />
                      <span className="truncate">{room.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="px-3 pt-3 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] border-t border-[#e3e0db] mt-1">
            Sessions
          </div>
          {runs.slice(0, 16).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/hivemind/app/hm-rooms/${r.id}`)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white"
            >
              <Hash size={12} className="text-[#a3a3a3] shrink-0" />
              <span className="text-[12px] text-[#0a0a0a] truncate">{stripWorkOrder(r.goal) || r.id.slice(0, 8)}</span>
            </button>
          ))}
          {workRooms.length ? (
            <>
              <div className="px-3 pt-3 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">Work rooms</div>
              {workRooms.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openHyperRoom(navigate, r)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white"
                >
                  <Hash size={12} className="text-[#a3a3a3] shrink-0" />
                  <span className="text-[12px] text-[#0a0a0a] truncate">{r.name || r.title || 'Room'}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>

        <div className="border-t border-[#e3e0db] px-2 pt-2.5 pb-2 shrink-0 bg-[#faf9f4]">
          <div className="text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] px-2 mb-1">Account</div>
          {[
            { icon: User, label: 'Profile', to: '/hivemind/app/profile' },
            { icon: Gauge, label: 'Usage', to: '/hivemind/app/usage' },
            { icon: CreditCard, label: 'Billing', to: '/hivemind/app/billing', badge: 'PRO' },
            { icon: Settings, label: 'Settings', to: '/hivemind/app/settings' },
          ].map(({ icon: Icon, label, to, badge }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#0a0a0a] hover:bg-white"
            >
              <Icon size={13} /> {label}
              {badge ? <span className="ml-auto text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#117dff]">{badge}</span> : null}
            </button>
          ))}
          <div className="flex items-center gap-2 px-2 py-2 mt-1 border-t border-[#e3e0db]">
            <span className="w-7 h-7 rounded-lg bg-[#117dff]/10 text-[#117dff] flex items-center justify-center text-[11px] font-bold shrink-0">
              {(user?.display_name || user?.email || '?')[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-[#0a0a0a] truncate">{user?.display_name || user?.email}</div>
              <div className="text-[9.5px] font-mono text-[#a3a3a3] capitalize">{(org?.plan || 'free')} Plan</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => { try { await logout(); } catch { /* noop */ } navigate('/hivemind/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#dc2626]"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="relative flex-1 overflow-hidden">
        {CANVAS_CARDS.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => setGoal(`Open ${card.title}`)}
            className={`absolute ${card.pos} w-[210px] text-left bg-white border border-[#eceae6] rounded-[14px] px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow-sm hidden lg:block`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {card.kind === 'pdf' ? (
                  <span className="w-8 h-8 rounded-md bg-[#fee2e2] text-[#b91c1c] text-[9px] font-bold flex items-center justify-center">pdf</span>
                ) : card.kind === 'ppt' ? (
                  <span className="w-8 h-8 rounded-md bg-[#ffedd5] text-[#c2410c] text-[8px] font-bold flex items-center justify-center">PPT</span>
                ) : card.kind === 'md' ? (
                  <span className="w-8 h-8 rounded-md bg-[#f3f1ec] text-[#525252] flex items-center justify-center"><FileText size={14} /></span>
                ) : (
                  <span className={`w-8 h-8 rounded-md ${card.tone} flex items-center justify-center`}><Folder size={16} className="text-[#3b82f6]" /></span>
                )}
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{card.title}</div>
                  <div className="text-[10px] text-[#8a8883]">{card.meta}</div>
                </div>
              </div>
              <span className="text-[#c4c2bc] text-[12px]">···</span>
            </div>
            <div className="mt-1.5 text-[10px] text-[#8a8883]">{card.sub}</div>
          </button>
        ))}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-[760px] px-4 pointer-events-auto">
            <div className="text-center mb-6">
              <h1 className="font-['Space_Grotesk'] text-[28px] font-semibold text-[#0f1115] tracking-tight inline-flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4176e6]" />
                Beyond Horizon Of Intelligence
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4f6bed]">Preview</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#61666b] mb-2 px-1">
              <Users size={14} /> HIVE-MIND chat ▾
            </div>
            <Composer
              value={goal}
              onChange={setGoal}
              onSubmit={start}
              busy={busy}
              hero
              placeholder="Ask anything"
            />
            {error && <p className="text-[11px] text-[#b45309] mt-2 text-center">{error}</p>}
            <div className="mt-2 space-y-0.5">
              {starters.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={(e) => start(e, s.title)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/80 text-left"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <s.Icon size={13} className="text-[#8a8883] shrink-0" />
                    <span className="text-[12px] text-[#171717]">{s.title}</span>
                    <span className="text-[11px] text-[#8a8883] truncate">{s.sub}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#c4c2bc] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HmRoomDesk({ runId }) {
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [view, setView] = useState(() => emptyWorkRunView(runId));
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const esRef = useRef(null);
  const timingRef = useRef({});

  const markFirstEvent = useCallback((name) => {
    if (timingRef.current[name]) return;
    timingRef.current[name] = performance.now();
    // Browser Performance entries are deliberately content-free: they let us
    // distinguish submit, acknowledgement, first reasoning/tool/text, and
    // completion latency without recording a user's prompt or model output.
    performance.mark(`hm-workrun:${runId}:${name}`);
  }, [runId]);

  useEffect(() => {
    let cancelled = false;
    // Connect before history hydration.  A fast AgentScope reply can otherwise
    // emit its first deltas while the two GETs below are still in flight; those
    // deltas used to appear only after a reload fetched the finished history.
    const sessionEventNames = [
      'reply_start', 'reply_end', 'text_block_delta', 'text_block_end',
      'thinking_block_delta', 'thinking_block_end', 'tool_call_start', 'tool_call_end', 'tool_result_end',
      'custom', 'require_user_confirm',
      'REPLY_START', 'REPLY_END', 'TEXT_BLOCK_DELTA', 'TEXT_BLOCK_END',
      'THINKING_BLOCK_DELTA', 'THINKING_BLOCK_END', 'TOOL_CALL_START', 'TOOL_CALL_END', 'TOOL_RESULT_END',
      'tool.started', 'tool.completed', 'artifact.created', 'agent.status',
      'approval.requested', 'team.member.started', 'team.updated', 'workrun.failed', 'workrun.completed', 'workrun.cancelled', 'workrun.state',
      'plan.updated', 'external_action.pending', 'external_action.resolved',
    ];
    const progressEventNames = [
      'tool.started', 'tool.completed', 'artifact.created', 'agent.status',
      'approval.requested', 'team.member.started', 'team.updated', 'workrun.failed', 'workrun.completed', 'workrun.cancelled', 'workrun.state',
      'plan.updated', 'external_action.pending', 'external_action.resolved',
    ];
    const bufferedEvents = [];
    const bufferEvent = (message) => {
      if (message?.data) bufferedEvents.push({ data: message.data, type: message.type, lastEventId: message.lastEventId });
    };
    const es = new EventSource(apiClient.workRunSessionStreamUrl(runId), { withCredentials: true });
    const progress = new EventSource(apiClient.workRunStreamUrl(runId), { withCredentials: true });
    esRef.current = { session: es, progress };
    sessionEventNames.forEach((name) => es.addEventListener(name, bufferEvent));
    progressEventNames.forEach((name) => progress.addEventListener(name, bufferEvent));
    es.onmessage = bufferEvent;
    progress.onmessage = bufferEvent;
    (async () => {
      let row = null;
      try {
        setView(emptyWorkRunView(runId));
        const data = await apiClient.getWorkRun(runId);
        row = data?.workrun || data;
        if (cancelled) return;
        setError(null);
        setRun(row);
        (row?.events || []).forEach((ev) => {
          setView((prev) => applyWorkRunEvent(prev, ev));
        });
        setView((prev) => hydrateRegisteredArtifacts(prev, row?.result_artifact_ids || row?.artifact_ids));
        const history = await apiClient.getWorkRunSessionMessages(runId).catch(() => null);
        const list = history?.messages || history?.items || [];
        const initialUser = { role: 'user', text: stripWorkOrder(row?.goal), tools: [], thinking: '' };
        if (Array.isArray(list) && list.length) {
          const normalized = list.map(flattenMsg).map((m) => (
            row?.status === 'failed' || row?.status === 'completed'
              ? { ...m, streaming: false }
              : m
          ));
          const hasInitialPrompt = normalized.some((message) => (
            message.role === 'user' && stripWorkOrder(message.text) === initialUser.text
          ));
          setMsgs(hasInitialPrompt || !initialUser.text ? normalized : [initialUser, ...normalized]);
        } else if (row?.goal) {
          setMsgs([initialUser]);
        }
        if (row?.status === 'failed' || row?.status === 'completed' || row?.status === 'cancelled') {
          setPhase('idle');
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message);
      }

      const terminal = ['failed', 'completed', 'cancelled'].includes(String(row?.status || ''));
      if (terminal) return;

      const seen = new Set();
      const onEvt = (msg) => {
        if (!msg?.data) return;
        let ev;
        try { ev = JSON.parse(msg.data); } catch { return; }
        const type = eventType(ev) || String(msg.type || '').toUpperCase();
        ev.type = ev.type || type;
        setError(null);
        const fingerprint = `${msg.lastEventId || ''}:${type}:${(ev.delta || ev.text || ev.tool_call_id || ev.name || '').toString().slice(0, 48)}`;
        if (seen.has(fingerprint)) return;
        seen.add(fingerprint);
        if (type === 'REPLY_START') markFirstEvent('first-reply');
        if (type === 'THINKING_BLOCK_DELTA') markFirstEvent('first-thinking');
        if (type === 'TOOL_CALL_START') markFirstEvent('first-tool');
        if (type === 'TEXT_BLOCK_DELTA') markFirstEvent('first-answer');
        if (type === 'REPLY_END' || String(ev.t || '') === 'agent.status' && ev.status === 'idle') markFirstEvent('completed');
        if (type === 'REPLY_START' || type === 'TEXT_BLOCK_DELTA' || type === 'THINKING_BLOCK_DELTA' || type === 'TOOL_CALL_START') {
          setPhase('streaming');
        }
        if (String(ev.t || '') === 'workrun.state') {
          const status = String(ev.status || '').toLowerCase();
          if (['completed', 'failed', 'cancelled'].includes(status)) {
            setRun((current) => ({ ...(current || {}), status, result: ev.result, error: ev.error }));
            setPhase('idle');
            setMsgs((previous) => previous.map((message) => ({ ...message, streaming: false })));
          }
        }
        setMsgs((prev) => applyAgentEvent(prev, ev));
        setView((prev) => {
          const next = applyWorkRunEvent(prev, ev);
          if (type === 'REPLY_END') {
            setPhase(hasRunningTools(next) ? 'streaming' : 'idle');
          }
          if (String(ev.t || '') === 'agent.status' && ev.status === 'idle' && !hasRunningTools(next)) {
            // A WorkRun remains durable and open for follow-up turns.  The
            // composer, however, belongs to the current AgentScope reply.
            setPhase('idle');
          }
          return next;
        });
      };
      sessionEventNames.forEach((name) => {
        es.removeEventListener(name, bufferEvent);
        es.addEventListener(name, onEvt);
      });
      es.onmessage = onEvt;
      progressEventNames.forEach((name) => {
        progress.removeEventListener(name, bufferEvent);
        progress.addEventListener(name, onEvt);
      });
      progress.onmessage = onEvt;
      bufferedEvents.splice(0).forEach(onEvt);
      esRef.current = { session: es, progress };
    })();
    return () => {
      cancelled = true;
      if (esRef.current?.session) esRef.current.session.close();
      else if (esRef.current?.close) esRef.current.close();
      if (esRef.current?.progress) esRef.current.progress.close();
    };
  }, [runId]);

  useEffect(() => {
    apiClient.listWorkRuns({ limit: 16 }).then((data) => setRuns(data?.workruns || [])).catch(() => {});
    apiClient.listHyperRooms().then((data) => setRooms(data?.rooms || data || [])).catch(() => {});
  }, [runId]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    timingRef.current = {};
    performance.mark(`hm-workrun:${runId}:submit`);
    markFirstEvent('acknowledgement');
    setMsgs((prev) => startUserTurn(prev, text));
    setPhase('streaming');
    try {
      await apiClient.sendWorkRunChat(runId, text);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      setPhase('idle');
    }
  };

  const stop = async () => {
    setError(null);
    try {
      const data = await apiClient.cancelWorkRun(runId);
      // The cancel endpoint normally returns the updated WorkRun. If a
      // compatible runtime only returns an acknowledgement, preserve the
      // existing object and patch its status through React's functional setter
      // (passing the updater function as the state value corrupts the render).
      setRun((current) => data?.workrun || ({ ...(current || {}), status: 'cancelled' }));
      setPhase('idle');
      setMsgs((previous) => previous.map((message) => ({ ...message, streaming: false })));
      esRef.current?.session?.close?.();
      esRef.current?.progress?.close?.();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
  };

  const resolveExternalAction = async (approvalId, action) => {
    setError(null);
    try {
      const data = await apiClient.resolvePendingWrite(approvalId, action);
      const draft = data?.draft || {};
      const status = String(data?.status || draft.status || (action === 'approve' ? 'sent' : 'cancelled')).toLowerCase();
      const event = {
        t: 'external_action.resolved',
        approval_id: approvalId,
        status,
        tool: draft.toolName || 'external action',
        summary: data?.text || draft.preview || null,
        error: status === 'failed' ? (data?.error || draft.errorMsg || 'External action failed.') : null,
        result: draft.result || null,
      };
      // The server persists the same event for reconnect/replay. Applying it
      // here only removes UI latency while the stream catches up.
      setMsgs((prev) => applyAgentEvent(prev, event));
      setView((prev) => applyWorkRunEvent(prev, event));
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      throw err;
    }
  };

  const sources = view.sources || [];
  const activity = view.activity || [];
  const artifacts = view.artifacts || [];
  const team = view.team || [];
  const inspectOpen = true;
  const runStatus = String(run?.status || '').toLowerCase();
  const terminal = ['completed', 'failed', 'cancelled'].includes(runStatus);
  // Do not use the durable WorkRun status here. A successful reply leaves the
  // WorkRun running so the user can continue the same session; only a live
  // reply or tool call should replace Send with Stop.
  const working = !terminal && phase === 'streaming';
  void inspectOpen;

  return (
    <WorkRunShell
      goal={stripWorkOrder(run?.goal)}
      status={run?.status}
      working={working}
      msgs={msgs}
      activity={activity}
      tasks={view.tasks}
      artifacts={artifacts}
      sources={sources}
      team={team}
      files={[]}
      computer={null}
      preview={preview}
      draft={draft}
      error={error}
      onPreview={setPreview}
      onResolveExternalAction={resolveExternalAction}
      onDraft={setDraft}
      onSend={send}
      onStop={stop}
      legacySidebar={<LegacyRoomsSidebar runs={runs} rooms={rooms} activeRunId={runId} onNewWork={() => navigate('/hivemind/app/hm-rooms')} />}
    />
  );
}

export default function HmRooms() {
  const { runId } = useParams();
  if (runId) return <HmRoomDesk runId={runId} />;
  return <HmRoomList />;
}

export { HmRoomList, HmRoomDesk, WorkRunModules };
