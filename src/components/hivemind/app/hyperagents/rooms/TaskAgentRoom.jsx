import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Link2, Globe2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const AGENT_HOST = "hivemind-task-agents.amarsai2005.workers.dev";

export function isPreviewTaskRoom() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "next.preview.singulancelabs.com"
    || host === "hivemind-web-preview.amarsai2005.workers.dev";
}

export function roomIdFromPath(pathname) {
  const marker = "/employees/rooms/";
  const at = String(pathname || "").indexOf(marker);
  if (at < 0) return "";
  let rest = String(pathname).slice(at + marker.length).split("/")[0].split("?")[0];
  try { rest = decodeURIComponent(rest); } catch { /* keep the raw segment */ }
  rest = rest.replace(/[\s\u00a0\u2000-\u200b\u2010-\u2015\u2212\u2500-\u257f]+/g, "");
  const uuid = rest.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0].toLowerCase();
  const hex = rest.replace(/-/g, "").match(/[0-9a-f]{32}/i);
  if (!hex) return "";
  const compact = hex[0].toLowerCase();
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export function agentInstanceName(orgId, roomId) {
  try {
    const saved = roomId && sessionStorage.getItem(`hm-agent:${roomId}`);
    if (saved) return saved;
  } catch { /* fall back to the shared company run */ }
  return `day1-${orgId}-flow`;
}

function elapsedLabel(startedAt, now) {
  if (!startedAt) return "";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function applySocketMessage(current, parsed) {
  if (parsed && parsed.type === "cf_agent_state" && parsed.state && typeof parsed.state === "object") {
    return parsed.state;
  }
  if (parsed && typeof parsed.step === "string" && typeof parsed.at === "string") {
    const events = [...(current?.events || []), parsed].slice(-100);
    return { ...(current || {}), events };
  }
  return current;
}

export function useTaskAgentStream({ enabled, orgId, userId, roomId }) {
  const [agentState, setAgentState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [draft, setDraft] = useState("");
  const [progressDraft, setProgressDraft] = useState("");
  const socketRef = useRef(null);
  const queuedStart = useRef(null);
  const selectedArtifactId = useRef("");

  useEffect(() => {
    if (!enabled || !orgId) return undefined;
    let closed = false;
    let retry;
    let lastArtifactEvent = "";
    const flushQueued = () => {
      const queued = queuedStart.current;
      const socket = socketRef.current;
      if (!queued || !socket || socket.readyState !== WebSocket.OPEN) return;
      queuedStart.current = null;
      socket.send(JSON.stringify(queued));
    };
    const connect = () => {
      if (closed) return;
      const socket = new WebSocket(`wss://${AGENT_HOST}/agents/hivemind-task-agent/${encodeURIComponent(agentInstanceName(orgId, roomId))}`);
      socketRef.current = socket;
      socket.onopen = () => { setError(""); socket.send(JSON.stringify({ type: "artifact-list" })); flushQueued(); };
      socket.onmessage = (event) => {
        let parsed = null;
        try { parsed = JSON.parse(event.data); } catch { parsed = null; }
        if (!parsed) return;
        if (parsed.type === "report-draft" || parsed.type === "progress-draft") {
          const update = (current) => parsed.reset ? String(parsed.delta || "") : current + String(parsed.delta || "");
          if (parsed.type === "report-draft") setDraft(update);
          else setProgressDraft(update);
          return;
        }
        if (parsed.type === "artifact-list-result") {
          const items = Array.isArray(parsed.artifacts) ? parsed.artifacts.filter((item) => item.kind !== "note" && item.kind !== "reply") : [];
          setArtifacts(items);
          const current = items.find((item) => item.id === selectedArtifactId.current);
          if (items[0]?.id && (!current || items[0].createdAt > current.createdAt)) {
            selectedArtifactId.current = items[0].id;
            socket.send(JSON.stringify({ type: "artifact-get", id: items[0].id }));
          }
          return;
        }
        if (parsed.type === "artifact-get-result") { setSelectedArtifact(parsed.artifact || null); return; }
        if (parsed.type === "artifact-create-pdf-result") {
          if (parsed.error) setPdfError(parsed.error);
          else { setPdfError(""); socket.send(JSON.stringify({ type: "artifact-list" })); }
          return;
        }
        setAgentState((current) => applySocketMessage(current, parsed));
        if (parsed.step === "report") setDraft("");
        if (parsed.step === "progress") setProgressDraft("");
        const newestArtifactEvent = [...(parsed.state?.events || [])].reverse().find((item) => item.step === "artifact")?.at || "";
        if (parsed.type === "cf_agent_state" && newestArtifactEvent && newestArtifactEvent !== lastArtifactEvent) {
          lastArtifactEvent = newestArtifactEvent;
          socket.send(JSON.stringify({ type: "artifact-list" }));
        }
      };
      socket.onerror = () => setError("The room could not reach the agent stream.");
      socket.onclose = () => { if (!closed) retry = window.setTimeout(connect, 1000); };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, orgId, roomId]);

  useEffect(() => {
    const events = agentState?.events || [];
    const userIndex = events.findLastIndex((item) => item.step === "user");
    if (userIndex < 0) return;
    const terminal = events.slice(userIndex + 1).reverse().find((item) => ["question", "approval", "completion"].includes(item.step));
    setStatus(terminal?.step === "completion" ? "complete" : terminal?.step || "working");
    setStartedAt(Date.parse(events[userIndex].at));
  }, [agentState]);

  const start = useCallback(async ({ message, company, website, market }) => {
    const text = String(message || "").trim();
    if (!text) return null;
    if (!orgId || !userId) {
      setStatus("error");
      setError("This room has no signed-in organization.");
      return null;
    }
    const payload = {
      type: "room-start",
      userId,
      company: company || "",
      website: website || "",
      market: market || "",
      task: text,
    };
    const socket = socketRef.current;
    setError("");
    setDraft("");
    setProgressDraft("");
    setStatus("working");
    setStartedAt(Date.now());
    setMessages((current) => [...current, { id: `${Date.now()}`, text, at: new Date().toISOString() }]);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      queuedStart.current = payload;
      return { status: "running", runId: agentInstanceName(orgId, roomId) };
    }
    socket.send(JSON.stringify(payload));
    return { status: "running", runId: agentInstanceName(orgId, roomId) };
  }, [orgId, userId, roomId]);

  const answer = useCallback((message) => {
    const text = String(message || "").trim();
    if (!text) return;
    const payload = { type: "human-answer", answer: text };
    const socket = socketRef.current;
    setDraft("");
    setProgressDraft("");
    setStatus("working");
    setMessages((current) => [...current, { id: `${Date.now()}`, text, at: new Date().toISOString() }]);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      queuedStart.current = payload;
      return;
    }
    socket.send(JSON.stringify(payload));
  }, []);

  const decideMemory = useCallback((decision) => {
    const socket = socketRef.current;
    const payload = { type: "memory-decision", decision };
    if (!socket || socket.readyState !== WebSocket.OPEN) queuedStart.current = payload;
    else socket.send(JSON.stringify(payload));
    setStatus("working");
  }, []);

  const selectArtifact = useCallback((id) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      selectedArtifactId.current = id;
      socketRef.current.send(JSON.stringify({ type: "artifact-get", id }));
    }
  }, []);

  const createPdf = useCallback((id) => {
    setPdfError("");
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "artifact-create-pdf", id }));
    else setPdfError("Agent connection unavailable.");
  }, []);

  const events = useMemo(() => Array.isArray(agentState?.events) ? agentState.events : [], [agentState?.events]);
  const report = useMemo(() => {
    const found = [...events].reverse().find((event) => event.step === "report" && event.detail);
    return found ? found.detail : "";
  }, [events]);

  return {
    events,
    places: Array.isArray(agentState?.places) ? agentState.places : [],
    sources: Array.isArray(agentState?.sources) ? agentState.sources : [],
    toolGroups: Array.isArray(agentState?.toolGroups) ? agentState.toolGroups : [],
    catalogStage: agentState?.catalogStage || "",
    operatingPlan: agentState?.operatingPlan || null,
    report,
    draft,
    progressDraft,
    artifacts,
    selectedArtifact,
    selectArtifact,
    createPdf,
    pdfError,
    status,
    error,
    startedAt,
    messages,
    start,
    decideMemory,
    answer,
  };
}

const HIDDEN_STEPS = new Set(["workrun", "artifact", "completion", "approval", "user", "task_updated", "operating-plan-state"]);

function toolLabel(step) {
  const labels = {
    "operating-plan": "Thinking",
    playbook_list: "Listed the methods",
    playbook_list_local: "Chose the task",
    playbook_get: "Opened a task",
    reset_tools: "Opened the tools",
    hivemind_recall: "Recalled the company",
    get_user_profile: "Loaded company profile",
    governance: "Reviewed the report",
    hivemind_get_memory: "Read a memory",
    parallel_search: "Searched the web",
    composio_web_search: "Searched the web",
    maps_search: "Searched Maps",
    save_local_companies: "Saved the companies",
    load_artifact: "Loaded a file",
    save_memory: "Prepared a memory",
    refine_local_playbook: "Noted a company case",
  };
  return labels[step] || String(step || "").replace(/_/g, " ");
}

function TaskRow({ event }) {
  const thinking = event.step === "operating-plan" || event.step === "progress";
  const detail = String(event.detail || "").trim();
  const isSearch = event.step === "parallel_search" || event.step === "composio_web_search";
  const [open, setOpen] = useState(false);
  if (thinking) return <li className="py-2 text-[14px] leading-6 text-[#303030]">{detail}</li>;
  const summary = isSearch && detail && !/^(parallel-ai-gateway|parallel|started)$/i.test(detail) ? detail : "";
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 py-1.5 text-left text-[13px] text-[#858b94] hover:text-[#262626]">
        <span className="w-4 shrink-0 text-center text-[#a7a7a7]">{isSearch ? <Globe2 size={15} /> : "▣"}</span>
        <span className="shrink-0">{toolLabel(event.step)}</span>{summary ? <><span>·</span><span className="min-w-0 flex-1 truncate">{summary}</span></> : null}<span aria-hidden="true" className="ml-auto">{open ? "⌄" : "›"}</span>
      </button>
      {open && detail ? <pre className="mb-2 whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fa] px-3 py-2 text-[12px] leading-relaxed text-[#767676]">{detail}</pre> : null}
    </li>
  );
}

function conversationTurns(events, messages, latestPlan) {
  const turns = [];
  let current = null;
  for (const event of events) {
    if (event.step === "user") {
      current = { id: event.at, at: event.at, text: event.detail, tools: [], artifacts: [], report: "", question: "", options: [], plan: null };
      turns.push(current);
      continue;
    }
    if (!current) {
      current = { id: "earlier", text: "", tools: [], artifacts: [], report: "", question: "", options: [], plan: null };
      turns.push(current);
    }
    if (event.step === "operating-plan-state") {
      try { current.plan = JSON.parse(event.detail); } catch { /* ignore malformed snapshot */ }
      continue;
    }
    if (event.step === "question") {
      try {
        const body = JSON.parse(event.detail);
        current.question = typeof body.question === "string" ? body.question : "";
        current.options = Array.isArray(body.options) ? body.options.filter((option) => typeof option === "string" && option.trim()) : [];
      } catch { current.question = event.detail; }
      continue;
    }
    if (event.step === "artifact") current.artifacts.push(event);
    else if (event.step === "report") current.report = event.detail;
    else if (!HIDDEN_STEPS.has(event.step) && !(event.step === "parallel_search" && event.detail === "parallel-ai-gateway")
      && !(event.step === "progress" && current.tools.at(-1)?.step === "progress" && String(current.tools.at(-1).detail || "").trim() === String(event.detail || "").trim())) current.tools.push(event);
  }
  const said = new Set(turns.map((turn) => turn.text));
  for (const message of messages.slice(-1)) {
    if (!said.has(message.text)) turns.push({ id: message.id, at: message.at, text: message.text, tools: [], artifacts: [], report: "", question: "", options: [], plan: null });
  }
  // Older rooms have only a room-wide plan. Attach it to its plan event's turn.
  if (latestPlan?.tasks?.length) {
    const owner = [...turns].reverse().find((turn) => turn.tools.some((event) => event.step === "operating-plan"));
    if (owner && !owner.plan) owner.plan = latestPlan;
  }
  return turns.filter((turn) => turn.text || turn.tools.length || turn.report || turn.artifacts.length);
}

function artifactForEvent(event, artifacts) {
  let receipt;
  try { receipt = JSON.parse(event.detail); } catch { receipt = null; }
  return artifacts.find((artifact) => artifact.id === receipt?.id)
    || artifacts.find((artifact) => event.detail === `${artifact.kind} ${artifact.title}`);
}

export function OperatingPlan({ plan }) {
  if (!plan?.tasks?.length) return null;
  const done = plan.tasks.filter((task) => task.status === "completed").length;
  return (
    <section aria-label="Operating plan" className="rounded-xl border border-[#ebebeb] bg-[#fcfcfc] px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-[13px] font-medium text-[#333333]">
        <span>Plan</span><span className="font-normal text-[#929292]">{done}/{plan.tasks.length} done</span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {plan.tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-2 text-[13px] leading-5 text-[#555555]">
            <span aria-hidden="true" className={task.status === "completed" ? "text-[#2a8a5d]" : task.status === "active" ? "text-[#2563a6]" : task.status === "blocked" ? "text-[#b45309]" : "text-[#b3b3b3]"}>
              {task.status === "completed" ? "✓" : task.status === "active" ? "●" : task.status === "blocked" ? "!" : "○"}
            </span>
            <span className="flex-1">{task.title}</span>
            <span className="shrink-0 text-[11px] text-[#979797]">{task.status}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TurnBlock({ turn, live, status, startedAt, now, artifacts, onSelectArtifact, onMemoryDecision, onAnswer }) {
  const [open, setOpen] = useState(true);
  const pending = live && status === "working";
  return (
    <div className="space-y-5">
      {turn.at ? <div className="text-center text-[12px] text-[#a0a0a0]">{new Date(turn.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div> : null}
      {turn.text ? (
        <div className="flex justify-end">
          <div className="max-w-[84%] whitespace-pre-wrap rounded-[20px] bg-[#edf3ff] px-4 py-2.5 text-[14px] leading-[1.55] text-[#242933]">{turn.text}</div>
        </div>
      ) : null}
      {turn.tools.length || pending ? (
        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 border-b border-[#ededed] pb-1.5 text-left text-[13px] text-[#969696] hover:text-[#555555]">
            <span>{turn.tools.length} step{turn.tools.length === 1 ? "" : "s"}{pending ? " · Working" : ""}{live && startedAt ? ` · ${elapsedLabel(startedAt, now)}` : ""}</span><span aria-hidden="true">{open ? "⌄" : "›"}</span>
          </button>
          {open ? (
            <ol className="mt-2">
              {pending && !turn.tools.length ? <li role="status" className="flex items-center gap-2 py-1 text-[13px] text-[#777777]"><span className="animate-pulse text-[#a7a7a7]">✳</span> Thinking through task…</li> : null}
              {turn.tools.map((event, index) => <TaskRow key={`${event.at}-${event.step}-${index}`} event={event} />)}
              {pending && turn.tools.length > 0 ? <li role="status" className="flex items-center gap-2 py-1 text-[13px] text-[#777777]"><span className="animate-pulse text-[#a7a7a7]">✳</span> Working on response…</li> : null}
            </ol>
          ) : null}
        </div>
      ) : null}
      {turn.plan && !(live && status === "working") ? <OperatingPlan plan={turn.plan} /> : null}
      {turn.question ? <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#1c1a16]">{turn.question}</div> : null}
      {live && status === "question" && turn.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {turn.options.map((option) => (
            <button key={option} type="button" onClick={() => onAnswer?.(option)} className="rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-[13px] text-[#171717] hover:bg-[#f4f1ea]">{option}</button>
          ))}
        </div>
      ) : null}
      {turn.report ? <div className="break-words text-[14px] leading-[1.7] text-[#242424] [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-[#2563a6] [&_a]:underline [&_h1]:mb-3 [&_h1]:text-[19px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f5f5f5] [&_pre]:p-3 [&_code]:text-[13px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.report}</ReactMarkdown>
      </div> : null}
      {live && status === "approval" ? (
        <div className="border border-[#e3e0db] bg-white px-3 py-3">
          <p className="text-[13px] text-[#0a0a0a]">Save this to the company memory?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onMemoryDecision?.("approve")} className="h-8 bg-[#0a0a0a] px-3 text-[12px] font-medium text-white">Approve</button>
            <button type="button" onClick={() => onMemoryDecision?.("decline")} className="h-8 border border-[#e3e0db] bg-white px-3 text-[12px] text-[#0a0a0a]">Don't save</button>
          </div>
        </div>
      ) : null}
      {turn.artifacts?.map((event, index) => {
        const artifact = artifactForEvent(event, artifacts);
        if (!artifact || artifact.kind === "note" || artifact.kind === "reply") return null;
        return <button key={`${event.at}-${index}`} type="button" onClick={() => onSelectArtifact?.(artifact.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[#e7e5e2] bg-[#faf9f7] px-4 py-3 text-left hover:bg-[#f2f0ec]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4387db]"><FileText size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-[#202020]">{artifact.title}</span><span className="block text-[12px] text-[#858585]">{artifact.contentType === "application/pdf" ? "PDF" : artifact.contentType?.startsWith("image/") ? "Image" : "Document"} · Saved artifact</span></span>
          <span className="shrink-0 text-[12px] text-[#555555]">Open in Preview ↗</span>
        </button>;
      })}
    </div>
  );
}

export function TaskTranscript({ messages, events, status, startedAt, operatingPlan, artifacts = [], onSelectArtifact, error, onMemoryDecision, onAnswer, draft = "", progressDraft = "" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "working") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);
  const turns = conversationTurns(events, messages, operatingPlan);
  if (turns.length && status === "working") {
    const latest = turns[turns.length - 1];
    if (!latest.report && draft) latest.report = draft;
    if (progressDraft && !latest.tools.some((event) => event.step === "progress" && String(event.detail || "").trim().startsWith(progressDraft.trim()))) {
      latest.tools.push({ at: "draft", step: "progress", detail: progressDraft });
    }
  }
  if (!turns.length && !error) return null;
  return (
    <div className="mx-auto w-full max-w-[900px] space-y-12 pt-6 pb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {turns.map((turn, index) => (
        <TurnBlock
          key={turn.id || index}
          turn={turn}
          live={index === turns.length - 1}
          status={status}
          startedAt={startedAt}
          now={now}
          artifacts={artifacts}
          onSelectArtifact={onSelectArtifact}
          onMemoryDecision={onMemoryDecision}
          onAnswer={onAnswer}
        />
      ))}
      {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
    </div>
  );
}

export function ActiveTaskPlan({ events, messages, status, operatingPlan }) {
  if (status !== "working") return null;
  const turns = conversationTurns(events, messages, operatingPlan);
  return <OperatingPlan plan={turns.at(-1)?.plan} />;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function linksIn(text) {
  return [...String(text || "").matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map((match) => match[0].replace(/[.,]$/, ""));
}

function artifactUrl(artifact) {
  try {
    const url = new URL(artifact?.storageLocation || "");
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
}

export function TaskPreview({ status, events, places, sources, report, artifacts = [], selectedArtifact, onSelectArtifact, onCreatePdf, pdfError }) {
  const [width, setWidth] = useState(520);
  const [showEnvironment, setShowEnvironment] = useState(true);
  const [tab, setTab] = useState("preview");
  const [openUrl, setOpenUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const drag = useRef(null);
  useEffect(() => {
    if (selectedArtifact?.contentType !== "application/pdf" || !selectedArtifact.body) { setPdfUrl(""); return undefined; }
    const bytes = Uint8Array.from(atob(selectedArtifact.body), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedArtifact]);
  useEffect(() => {
    if (selectedArtifact?.id) { setOpenUrl(""); setTab("preview"); }
  }, [selectedArtifact?.id]);
  const sourceRows = useMemo(() => {
    const rows = [];
    const seen = new Set();
    const add = (url, title) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      rows.push({ url, title: title || hostOf(url) });
    };
    for (const source of sources || []) add(source.url, source.title);
    for (const place of places || []) add(place.website, place.name);
    for (const event of events || []) {
      for (const url of linksIn(event.detail)) add(url, hostOf(url));
    }
    for (const url of linksIn(report)) add(url, hostOf(url));
    return rows;
  }, [events, places, report, sources]);

  useEffect(() => {
    function move(event) {
      if (!drag.current) return;
      const screen = window.innerWidth || 1;
      const max = Math.floor(screen * 0.5);
      const next = Math.min(max, Math.max(300, drag.current.startWidth + (drag.current.x - event.clientX)));
      const wide = next / screen >= 0.4;
      setWidth(next);
      setShowEnvironment(!wide);
      window.dispatchEvent(new CustomEvent("hm-task-preview", { detail: { wide } }));
    }
    function up() { drag.current = null; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const previewUrl = openUrl || sourceRows[0]?.url || "";
  const showArtifact = !openUrl && Boolean(selectedArtifact);
  const storedUrl = artifactUrl(selectedArtifact);
  return (
    <aside className="relative hidden min-h-0 shrink-0 bg-[#f6f5f1] lg:flex" style={{ width }}>
      <button
        type="button"
        aria-label="Resize preview"
        className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize hover:bg-[#117dff]"
        onMouseDown={(event) => { drag.current = { x: event.clientX, startWidth: width }; }}
      />
      {showEnvironment ? <div className="absolute right-full top-4 z-20 mr-3 w-[260px] overflow-hidden rounded-2xl border border-[#e6e2da] bg-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 border-b border-[#f0ece6] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-1 text-[13px] font-semibold text-[#171717]">Environment</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#404040]">
          <FileText size={14} className="text-[#8a847c]" />
          <span className="min-w-0 flex-1 truncate">{status === "working" ? "Agent is working" : status === "question" ? "Waiting for you" : status === "approval" ? "Waiting for approval" : status === "complete" ? "Run finished" : "Idle"}</span>
        </div>
        <div className="border-t border-[#f0ece6] px-3 py-2 text-[12px] font-semibold text-[#404040]">Artifacts</div>
        {artifacts.length ? artifacts.map((artifact) => (
          <button key={artifact.id} type="button" onClick={() => { setOpenUrl(""); onSelectArtifact?.(artifact.id); setTab("preview"); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#262626] hover:bg-[#f7f6f3]">
            <FileText size={13} className="shrink-0 text-[#8a847c]" />
            <span className="min-w-0 flex-1 truncate">{artifact.title}</span>
          </button>
        )) : <p className="px-3 pb-3 text-[12px] text-[#929292]">Reports and generated files appear here.</p>}
      </div> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[#e3e0db] bg-white">
        <div className="flex items-center gap-2 border-b border-[#eeeae4] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          {[["preview", "Preview"], ["artifacts", "Artifacts"], ["computer", "Computer"], ["sources", "Sources"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`ml-1 rounded-full px-2.5 py-1 text-[12px] ${tab === id ? "bg-[#171717] text-white" : "text-[#525252]"}`}>{label}</button>
          ))}
        </div>
        <div className={`min-h-0 flex-1 ${tab === "preview" && selectedArtifact?.contentType === "application/pdf" && !openUrl ? "overflow-hidden" : "overflow-auto"}`}>
          {tab === "preview" ? (
            showArtifact ? (
              selectedArtifact.contentType === "application/pdf" && (pdfUrl || storedUrl) ? (
                <div className="flex h-full min-h-0 flex-col bg-white">
                  <div className="flex min-h-0 shrink-0 items-center gap-3 border-b border-[#eeeae4] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#303030]" title={selectedArtifact.title}>{selectedArtifact.title}</span>
                    <a href={pdfUrl || storedUrl} download={selectedArtifact.title} className="shrink-0 text-[12px] text-[#2563a6] underline">Download PDF</a>
                  </div>
                  <iframe title={selectedArtifact.title} src={pdfUrl || storedUrl} className="min-h-0 w-full flex-1 border-0" />
                </div>
              ) :
              <article className="mx-auto max-w-[780px] break-words px-7 py-8 text-[14px] leading-[1.7] text-[#242424] [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-[#2563a6] [&_a]:underline [&_h1]:mb-4 [&_h1]:text-[23px] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-semibold [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#858585]">{selectedArtifact.contentType === "text/markdown" ? "Markdown report" : selectedArtifact.contentType}</p>
                <h1 className="mb-5 text-[18px] font-semibold">{selectedArtifact.title}</h1>
                {selectedArtifact.contentType === "text/markdown" ? <button type="button" onClick={() => onCreatePdf?.(selectedArtifact.id)} className="mb-5 rounded-md border border-[#d7d7d7] px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5]">Generate PDF</button> : null}
                {pdfError ? <p role="alert" className="text-red-700">PDF failed: {pdfError}</p> : null}
                {selectedArtifact.contentType === "text/markdown" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedArtifact.body}</ReactMarkdown>
                  : selectedArtifact.contentType === "text/plain" ? <pre className="whitespace-pre-wrap font-sans">{selectedArtifact.body}</pre>
                  : selectedArtifact.contentType === "text/html" ? <iframe title={selectedArtifact.title} sandbox="" srcDoc={selectedArtifact.body} className="h-[70vh] w-full border border-[#e3e0db]" />
                  : selectedArtifact.contentType?.startsWith("image/") && (storedUrl || selectedArtifact.body) ? <img src={storedUrl || `data:${selectedArtifact.contentType};base64,${selectedArtifact.body}`} alt={selectedArtifact.title} className="max-w-full" />
                  : <p>Preview unavailable for {selectedArtifact.contentType}. {storedUrl ? <a href={storedUrl} target="_blank" rel="noopener noreferrer">Open stored output</a> : "No file was saved."}</p>}
              </article>
            ) : previewUrl ? <iframe title="Source website" src={previewUrl} className="h-full w-full border-0 bg-white" />
              : <p className="p-6 text-[13px] text-[#737373]">Generated artifacts appear here. Select a source to view its website.</p>
          ) : null}
          {tab === "computer" ? <p className="p-6 text-[13px] text-[#737373]">The computer view opens when a step needs a screen the browser cannot read.</p> : null}
          {tab === "artifacts" ? <ul className="divide-y divide-[#f0ece6]">
            {artifacts.length === 0 ? <li className="px-4 py-3 text-[13px] text-[#a3a3a3]">No saved outputs yet.</li> : artifacts.map((artifact) => (
              <li key={artifact.id}><button type="button" onClick={() => { setOpenUrl(""); onSelectArtifact?.(artifact.id); setTab("preview"); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#faf9f4]">
                <FileText size={16} className="shrink-0 text-[#8a847c]" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{artifact.title}</span><span className="text-[11px] text-[#858585]">{artifact.kind} · {new Date(artifact.createdAt).toLocaleString()}</span></span>
              </button></li>
            ))}
          </ul> : null}
          {tab === "sources" ? (
            <ul className="divide-y divide-[#f0ece6]">
              {sourceRows.length === 0 ? <li className="px-4 py-3 text-[13px] text-[#a3a3a3]">Web search links show up here.</li> : sourceRows.map((source) => (
                <li key={source.url}>
                  <button type="button" onClick={() => { setOpenUrl(source.url); setTab("preview"); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#faf9f4]">
                    <Link2 size={14} className="shrink-0 text-[#8a847c]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[#171717]">{source.title}</span>
                      <span className="block truncate text-[11px] text-[#117dff]">{source.url}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
