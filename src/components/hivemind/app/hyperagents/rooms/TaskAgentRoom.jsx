import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileText, Globe2, Grid2X2Plus, Link2, Settings2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownMessage from "../../shared/MarkdownMessage";
import { createPortal } from "react-dom";
import { ThinkingOrb } from "thinking-orbs";
import { macArrow } from "./cursors";
import apiClient from "../../shared/api-client";

const PdfCanvasPreview = React.lazy(() => import("./PdfCanvasPreview"));

const AGENT_HOST = isPreviewTaskRoom()
  ? "hivemind-task-agents-preview.amarsai2005.workers.dev"
  : "hivemind-task-agents.amarsai2005.workers.dev";

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
    if (saved === `session-${orgId}-${roomId}`) return saved;
  } catch { /* fall back to the shared company run */ }
  return `session-${orgId}-${roomId}`;
}

function elapsedLabel(startedAt, now) {
  if (!startedAt) return "";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export function applySocketMessage(current, parsed) {
  if (parsed && parsed.type === "cf_agent_state" && parsed.state && typeof parsed.state === "object") {
    const saved = Array.isArray(parsed.state.events) ? parsed.state.events : [];
    const latestSavedAt = saved.length ? Date.parse(saved[saved.length - 1].at) : -Infinity;
    const keys = new Set(saved.map((event) => `${event.at}\u0000${event.step}\u0000${event.detail}`));
    // The direct event frame can outrun an older durable-state replay. Keep
    // those newer rows until the next snapshot includes them, without reviving
    // events pruned from the server's bounded history.
    const pending = (current?.events || []).filter((event) =>
      Date.parse(event.at) >= latestSavedAt && !keys.has(`${event.at}\u0000${event.step}\u0000${event.detail}`));
    return { ...parsed.state, events: [...saved, ...pending].slice(-300) };
  }
  if (parsed && typeof parsed.step === "string" && typeof parsed.at === "string") {
    const prior = current?.events || [];
    if (prior.some((event) => event.at === parsed.at && event.step === parsed.step && event.detail === parsed.detail)) return current;
    const events = [...prior, parsed].slice(-300);
    return { ...(current || {}), events };
  }
  return current;
}

export function applyNativeStreamFrame(current, parsed) {
  if (parsed?.type !== "cf_agent_use_chat_response" || typeof parsed.body !== "string") return current;
  let frame;
  try { frame = JSON.parse(parsed.body); } catch { return current; }
  if (frame?.type === "text-start") return { ...current, native: "" };
  if (frame?.type !== "text-delta" || typeof frame.delta !== "string" || !frame.delta) return current;
  return { ...current, native: `${current.native || ""}${frame.delta}`.slice(-6000) };
}

export function useTaskAgentStream({ enabled, orgId, userId, roomId }) {
  const [agentState, setAgentState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [previewRequest, setPreviewRequest] = useState({ id: "", serial: 0 });
  const [pdfError, setPdfError] = useState("");
  const [workRun, setWorkRun] = useState(null);
  const [toolApproval, setToolApproval] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [draft, setDraft] = useState({ progress: "", report: "", native: "" });
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
    const connect = async () => {
      if (closed) return;
      const name = agentInstanceName(orgId, roomId);
      if (!roomId || !name.startsWith(`session-${orgId}-`)) return;
      let ticket;
      try {
        ({ data: { ticket } } = await apiClient.controlPlane.post("/v1/hyper/room-ticket", { agent_name: name }));
      } catch {
        if (!closed) { setError("Room authorization failed."); retry = window.setTimeout(connect, 3000); }
        return;
      }
      if (closed) return;
      const socket = new WebSocket(`wss://${AGENT_HOST}/agents/hivemind-task-agent/${encodeURIComponent(name)}?ticket=${encodeURIComponent(ticket)}`);
      socketRef.current = socket;
      socket.onopen = () => { setError(""); socket.send(JSON.stringify({ type: "artifact-list" })); socket.send(JSON.stringify({ type: "workrun-control", decision: "status" })); flushQueued(); };
      socket.onmessage = (event) => {
        let parsed = null;
        try { parsed = JSON.parse(event.data); } catch { parsed = null; }
        if (!parsed) return;
        if (parsed.type === "workrun-control-result") {
          if (parsed.error) setError(parsed.error);
          else { setWorkRun(parsed.result); setError(""); }
          return;
        }
        if (parsed.type === "connection-continue-result") {
          setConnectionStatus(parsed.status || "NOT_CONNECTED");
          return;
        }
        if (parsed.type === "cf_agent_use_chat_response") {
          setDraft((current) => applyNativeStreamFrame(current, parsed));
          return;
        }
        if (parsed.type === "progress-draft" || parsed.type === "report-draft") {
          setDraft((current) => ({
            ...current,
            native: "",
            [parsed.type === "report-draft" ? "report" : "progress"]:
              (parsed.reset ? "" : current[parsed.type === "report-draft" ? "report" : "progress"]) + String(parsed.delta || ""),
          }));
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
        if (parsed.type === "cf_agent_chat_messages") {
          const pending = (parsed.messages || []).flatMap((message) => message.parts || []).find((part) => part.state === "approval-requested" && part.approval?.id);
          setToolApproval(pending ? { toolCallId: pending.toolCallId, name: pending.toolName || String(pending.type || "tool").replace(/^tool-/, ""), input: pending.input } : null);
          return;
        }
        setAgentState((current) => applySocketMessage(current, parsed));
        if (parsed.type === "cf_agent_state") {
          const rows = parsed.state?.events || [];
          const lastUser = rows.findLastIndex((item) => item.step === "user");
          if (rows.slice(lastUser + 1).some((item) => item.step === "report" || item.step === "completion")) setDraft({ progress: "", report: "", native: "" });
        }
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
    const terminal = events.slice(userIndex + 1).reverse().find((item) => ["question", "approval", "completion", "workrun-recovery"].includes(item.step));
    setStatus(terminal?.step === "completion" ? "complete" : terminal?.step || "working");
    setStartedAt(Date.parse(events[userIndex].at));
  }, [agentState]);

  const start = useCallback(async ({ message, company, website, market, modePreference = "auto" }) => {
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
      modePreference: ["auto", "company", "direct"].includes(modePreference) ? modePreference : "auto",
    };
    const socket = socketRef.current;
    setError("");
    setStatus("working");
    setDraft({ progress: "", report: "", native: "" });
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

  const controlWorkRun = useCallback((decision) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "workrun-control", decision }));
  }, []);

  const selectArtifact = useCallback((id) => {
    setPreviewRequest((current) => ({ id, serial: current.serial + 1 }));
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

  const decideToolApproval = useCallback((approved) => {
    const socket = socketRef.current;
    if (!toolApproval?.toolCallId || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "cf_agent_tool_approval", toolCallId: toolApproval.toolCallId, approved, autoContinue: true }));
    setToolApproval(null);
  }, [toolApproval]);

  const continueConnection = useCallback((toolkit) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "connection-continue", decision: toolkit }));
  }, []);

  const events = useMemo(() => Array.isArray(agentState?.events) ? agentState.events : [], [agentState?.events]);
  const report = useMemo(() => {
    const found = [...events].reverse().find((event) => event.step === "report" && event.detail);
    return found ? found.detail : "";
  }, [events]);

  return {
    workRun,
    controlWorkRun,
    events,
    places: Array.isArray(agentState?.places) ? agentState.places : [],
    sources: Array.isArray(agentState?.sources) ? agentState.sources : [],
    toolGroups: Array.isArray(agentState?.toolGroups) ? agentState.toolGroups : [],
    catalogStage: agentState?.catalogStage || "",
    operatingPlan: agentState?.operatingPlan || null,
    report,
    artifacts,
    selectedArtifact,
    previewRequest,
    createPdf,
    pdfError,
    toolApproval,
    connectionStatus,
    continueConnection,
    decideToolApproval,
    selectArtifact,
    status,
    error,
    startedAt,
    messages,
    draft,
    start,
    decideMemory,
    answer,
  };
}

const HIDDEN_STEPS = new Set(["artifact", "completion", "approval", "user", "task_updated"]);
const isSetupEvent = (event) => event.step === "workrun" && (event.detail === "queued" || event.detail === "Loading authenticated context" || String(event.detail || "").startsWith("starting "));

function toolLabel(step) {
  const labels = {
    "operating-plan": "Thinking",
    playbook_list: "Listed the methods",
    playbook_list_local: "Chose the task",
    playbook_get: "Opened a task",
    reset_tools: "Opened the tools",
    hivemind_meta: "Checked HIVEMIND",
    hivemind_connected_task: "Checked connected apps",
    hivemind_recall: "Recalled the company",
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

function useSmoothText(target, active, holdOnEmpty = false) {
  const text = String(target || "");
  const [visible, setVisible] = useState(() => active ? "" : text);
  const animated = useRef(active);
  const targetRef = useRef(text);
  const visibleRef = useRef(visible);
  const timerRef = useRef(null);
  if (active) animated.current = true;
  targetRef.current = text;
  visibleRef.current = visible;
  useEffect(() => {
    const stop = () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    if (!text && holdOnEmpty) { stop(); return; }
    if (!animated.current || !text) {
      stop();
      setVisible(text);
      return;
    }
    // Keep one clock while provider chunks update the target. Restarting this
    // interval on every token starves painting when chunks arrive <12ms apart.
    if (timerRef.current !== null) return;
    timerRef.current = window.setInterval(() => {
      const nextText = targetRef.current;
      if (visibleRef.current === nextText) { stop(); return; }
      setVisible((current) => {
        if (current === nextText) return current;
        // A saved report can differ slightly from the provider's partial JSON
        // draft. Rebase at the already displayed length instead of typing it
        // again from the first character.
        if (!nextText.startsWith(current)) return nextText.slice(0, Math.min(current.length, nextText.length));
        const remaining = nextText.length - current.length;
        // One character for short bursts; catch up within about a second for
        // larger provider chunks so display animation never stalls the run.
        const count = Math.min(24, Math.max(1, Math.ceil(remaining / 80)));
        return nextText.slice(0, current.length + count);
      });
    }, 12);
  }, [text, holdOnEmpty]);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
  }, []);
  return visible;
}

function TaskRow({ event, live }) {
  const thinking = event.step === "operating-plan" || event.step === "progress";
  const detail = String(event.detail || "").trim();
  const smoothDetail = useSmoothText(detail, live && thinking);
  let call = null;
  if (event.step === "tool-call") {
    try { call = JSON.parse(detail); } catch { /* show raw event below */ }
  }
  const isSearch = event.step === "parallel_search" || event.step === "composio_web_search";
  const [open, setOpen] = useState(false);
  if (event.step === "workrun") return <li role="status" className="py-1 text-[13px] text-[#777777]">{detail === "queued" ? "Task queued" : detail.startsWith("starting ") ? "Preparing task" : detail}</li>;
  if (thinking) return <li className="py-2 text-[14px] leading-6 text-[#303030]"><MarkdownMessage streaming={live}>{smoothDetail}</MarkdownMessage></li>;
  if (call?.name) {
    const result = (() => {
      if (call.result == null) return "No result details recorded for this call.";
      try { return JSON.stringify(JSON.parse(call.result), null, 2); } catch { return String(call.result); }
    })();
    return <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 py-1.5 text-left text-[13px] text-[#858b94] hover:text-[#262626]">
        <span aria-hidden="true" className="w-4 shrink-0 text-center">▣</span>
        <code className="min-w-0 truncate text-[12px]">{call.name}</code>
        <span>{call.phase === "failed" ? "· Failed" : call.phase === "started" ? "· Running" : "· Returned"}</span>
        <span aria-hidden="true" className="ml-auto">{open ? "⌄" : "›"}</span>
      </button>
      {open ? <div className="mb-2 rounded-lg bg-[#f7f8fa] px-3 py-2 text-[12px] leading-relaxed text-[#767676]">
        {call.target ? <p className="mb-1 break-all">Target: {call.target}</p> : null}
        {Number.isFinite(call.durationMs) ? <p className="mb-1">Duration: {call.durationMs} ms</p> : null}
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words">{call.phase === "started" ? "Waiting for result…" : result}</pre>
      </div> : null}
    </li>;
  }
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

const orbLabel = (state) => state === "searching" ? "Working…" : state === "composing" ? "Dreaming…" : "Thinking…";
const orbGravity = (state) => state === "searching" ? { sprite: macArrow } : undefined;

function conversationTurns(events, messages) {
  const turns = [];
  let current = null;
  const matchedMessages = new Set();
  for (const event of events) {
    if (event.step === "user") {
      if (current && !current.finishedAt) current.finishedAt = event.at;
      const matchingMessage = messages
        .filter((message) => message.text === event.detail && !matchedMessages.has(message.id) && Math.abs(Date.parse(message.at) - Date.parse(event.at)) < 120000)
        .sort((a, b) => Math.abs(Date.parse(a.at) - Date.parse(event.at)) - Math.abs(Date.parse(b.at) - Date.parse(event.at)))[0];
      if (matchingMessage) matchedMessages.add(matchingMessage.id);
      current = { id: matchingMessage?.id || event.at, at: event.at, text: event.detail, tools: [], artifacts: [], report: "", question: "", options: [], plan: null };
      turns.push(current);
      continue;
    }
    if (!current) {
      current = { id: "earlier", text: "", tools: [], artifacts: [], report: "", question: "", options: [], plan: null };
      turns.push(current);
    }
    if (event.step === "question") {
      try {
        const body = JSON.parse(event.detail);
        current.question = typeof body.question === "string" ? body.question : "";
        current.options = Array.isArray(body.options) ? body.options.filter((option) => typeof option === "string" && option.trim()) : [];
      } catch { current.question = event.detail; }
      continue;
    }
    if (event.step === "completion") current.finishedAt = event.at;
    if (event.step === "workrun-recovery") current.finishedAt = undefined;
    if (event.step === "operating-plan-state") {
      try { current.plan = JSON.parse(event.detail); } catch { /* Keep the last valid plan for this turn. */ }
      continue;
    }
    if (event.step === "tool-call") {
      let call;
      try { call = JSON.parse(event.detail); } catch { call = null; }
      const existing = call?.id && current.tools.findIndex((item) => {
        if (item.step !== "tool-call") return false;
        try { return JSON.parse(item.detail).id === call.id; } catch { return false; }
      });
      if (typeof existing === "number" && existing >= 0) {
        let previous;
        try { previous = JSON.parse(current.tools[existing].detail); } catch { previous = {}; }
        current.tools[existing] = { ...event, detail: JSON.stringify({ ...previous, ...call }) };
      }
      else current.tools.push(event);
      continue;
    }
    // A tool's native receipt sits between its started and returned events.
    // Keep the distinct call row and avoid rendering that receipt twice.
    if (current.tools.some((item) => {
      if (item.step !== "tool-call") return false;
      try { const call = JSON.parse(item.detail); return call.name === event.step && call.phase === "started"; }
      catch { return false; }
    })) continue;
    if (event.step === "artifact") current.artifacts.push(event);
    else if (event.step === "report") current.report = event.detail;
    else if (!HIDDEN_STEPS.has(event.step) && !isSetupEvent(event) && !(event.step === "parallel_search" && event.detail === "parallel-ai-gateway")) current.tools.push(event);
  }
  for (const message of messages.slice(-1)) {
    if (!matchedMessages.has(message.id)) turns.push({ id: message.id, at: message.at, text: message.text, tools: [], artifacts: [], report: "", question: "", options: [], plan: null });
  }
  return turns.filter((turn) => turn.text || turn.tools.length || turn.report || turn.artifacts.length);
}

function artifactForEvent(event, artifacts) {
  let receipt;
  try { receipt = JSON.parse(event.detail); } catch { receipt = null; }
  return artifacts.find((artifact) => artifact.id === receipt?.id)
    || artifacts.find((artifact) => event.detail === `${artifact.kind} ${artifact.title}`);
}

function OperatingPlan({ plan }) {
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

function TurnBlock({ turn, live, status, startedAt, now, draft, artifacts, onSelectArtifact, onMemoryDecision, onAnswer }) {
  const [open, setOpen] = useState(true);
  const pending = live && status === "working";
  const finished = Boolean(turn.finishedAt) || (live && status === "complete");
  // A company report is saved before artifact, governance, and review receipts
  // finish. Keep its final answer behind those steps; direct replies still show
  // their provider draft as soon as it arrives.
  const companyRun = Boolean(turn.plan?.tasks?.length) || turn.tools.some((event) => ["playbook_get", "workrun-index"].includes(event.step));
  const reportText = companyRun && !finished ? "" : turn.report || (pending ? draft?.report || "" : "");
  const smoothReport = useSmoothText(reportText, pending, pending || Boolean(turn.report));
  const progressDraft = pending ? draft?.progress || (companyRun ? "" : draft?.native || "") : "";
  const smoothProgressDraft = useSmoothText(progressDraft, pending);
  const duration = turn.at && (turn.finishedAt || (pending && startedAt))
    ? elapsedLabel(Date.parse(turn.at), turn.finishedAt ? Date.parse(turn.finishedAt) : now)
    : "";
  return (
    <div className="space-y-5">
      {turn.at ? <div className="text-center text-[12px] text-[#a0a0a0]">{new Date(turn.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div> : null}
      {turn.text ? (
        <div className="flex justify-end">
          <div className="max-w-[84%] whitespace-pre-wrap rounded-[20px] bg-[#edf3ff] px-4 py-2.5 text-[14px] leading-[1.55] text-[#242933]">{turn.text}</div>
        </div>
      ) : null}
      {turn.tools.length || pending || finished ? (
        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 border-b border-[#ededed] pb-1.5 text-left text-[13px] text-[#969696] hover:text-[#555555]">
            <span>{turn.tools.length ? `${turn.tools.length} step${turn.tools.length === 1 ? "" : "s"}` : finished ? "Thought" : "Thinking"}{pending ? " · Working" : finished ? " · Worked" : ""}{duration ? ` · ${duration}` : ""}</span><span aria-hidden="true">{open ? "⌄" : "›"}</span>
          </button>
          {open ? (
            <ol className="mt-2">
              {pending && !turn.tools.length ? <li role="status" className="flex items-center gap-2 py-1 text-[13px] text-[#555]"><ThinkingOrb state="solving" size={20} theme="light" color="#111111" dotSize={1.2} /> Thinking…</li> : null}
              {turn.tools.map((event, index) => <TaskRow key={`${event.at}-${event.step}-${index}`} event={event} live={pending} />)}
              {pending && turn.tools.length > 0 ? <li role="status" className="flex items-center gap-2 py-1 text-[13px] text-[#555]"><ThinkingOrb state={taskOrbState(status, turn.tools)} size={20} theme="light" color="#111111" dotSize={1.2} gravity={orbGravity(taskOrbState(status, turn.tools))} /> {orbLabel(taskOrbState(status, turn.tools))}</li> : null}
              {pending && progressDraft && !progressDraft.trimStart().startsWith("{") && !turn.tools.some((event) => event.step === "progress" && event.detail === progressDraft) ? <li role="status" className="whitespace-pre-wrap py-1 text-[13px] leading-5 text-[#555555]">{smoothProgressDraft}</li> : null}
            </ol>
          ) : null}
        </div>
      ) : null}
      <OperatingPlan plan={turn.plan} />
      {turn.question ? <MarkdownMessage className="text-[15px] text-[#1c1a16]">{turn.question}</MarkdownMessage> : null}
      {live && status === "question" && turn.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {turn.options.map((option) => (
            <button key={option} type="button" onClick={() => onAnswer?.(option)} className="rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-[13px] text-[#171717] hover:bg-[#f4f1ea]">{option}</button>
          ))}
        </div>
      ) : null}
      {smoothReport ? <MarkdownMessage streaming={pending} className="text-[14px] text-[#242424]">{smoothReport}</MarkdownMessage> : null}
      {finished && turn.artifacts?.map((event, index) => {
        const artifact = artifactForEvent(event, artifacts);
        if (!artifact || artifact.kind === "note" || artifact.kind === "reply") return null;
        return <button key={`${event.at}-${index}`} type="button" onClick={() => onSelectArtifact?.(artifact.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[#e7e5e2] bg-[#faf9f7] px-4 py-3 text-left hover:bg-[#f2f0ec]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4387db]"><FileText size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-[#202020]">{artifact.title}</span><span className="block text-[12px] text-[#858585]">{artifact.contentType === "application/pdf" ? "PDF" : artifact.contentType?.startsWith("image/") ? "Image" : "Document"} · Saved artifact</span></span>
          <span className="shrink-0 text-[12px] text-[#555555]">Open in Preview ↗</span>
        </button>;
      })}
      {live && status === "approval" ? (
        <div className="border border-[#e3e0db] bg-white px-3 py-3">
          <p className="text-[13px] text-[#0a0a0a]">Save this to the company memory?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onMemoryDecision?.("approve")} className="h-8 bg-[#0a0a0a] px-3 text-[12px] font-medium text-white">Approve</button>
            <button type="button" onClick={() => onMemoryDecision?.("decline")} className="h-8 border border-[#e3e0db] bg-white px-3 text-[12px] text-[#0a0a0a]">Don't save</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TaskTranscript({ messages, events, status, startedAt, operatingPlan, draft, artifacts = [], onSelectArtifact, error, toolApproval, onToolApproval, onMemoryDecision, onAnswer, workRun, onControlWorkRun, connectionStatus, onContinueConnection }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "working") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);
  const turns = conversationTurns(events, messages);
  const connectionEvents = events.filter((event) => ["connection-required", "connection-ready"].includes(event.step));
  const lastConnection = connectionEvents.at(-1);
  let connection = null;
  if (lastConnection?.step === "connection-required") {
    try { connection = JSON.parse(lastConnection.detail); } catch { /* malformed receipt */ }
  }
  if (!connection && toolApproval?.input?.action === "execute_write") {
    const guidance = [...events].reverse().find((event) => /https:\/\/connect\.composio\.dev\/link\//i.test(event.detail || ""));
    const url = guidance?.detail?.match(/https:\/\/connect\.composio\.dev\/link\/[a-zA-Z0-9_-]+/)?.[0];
    if (url) connection = { toolkit: String(toolApproval.input.toolkit || toolApproval.input.toolSlug || "app").split("_")[0].toLowerCase(), url };
  }
  const connectionUrl = (() => { try { const url = new URL(connection?.url); return url.protocol === "https:" && url.hostname === "connect.composio.dev" ? url.href : ""; } catch { return ""; } })();
  const connectionActive = connectionStatus?.toUpperCase() === "ACTIVE" || lastConnection?.step === "connection-ready";
  const writeInput = toolApproval?.input?.action === "execute_write" ? toolApproval.input : null;
  const writeArguments = writeInput?.arguments && typeof writeInput.arguments === "object" ? writeInput.arguments : {};
  const writeAction = writeInput?.toolSlug === "GMAIL_CREATE_EMAIL_DRAFT" ? "Create one Gmail draft" : String(writeInput?.toolSlug || "Connected app write").replaceAll("_", " ").toLowerCase();
  if (!turns.length && !error && !toolApproval) return null;
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
          draft={draft}
          artifacts={artifacts}
          onSelectArtifact={onSelectArtifact}
          onMemoryDecision={onMemoryDecision}
          onAnswer={onAnswer}
        />
      ))}
      {connection && !connectionActive ? <div className="rounded-xl border border-[#dedee2] bg-[#fafaf9] p-4 text-[13px] text-[#262626]" role="status">
        <p className="font-semibold">Connect {connection.toolkit} to continue</p>
        <p className="mt-1 text-[#666]">Authorize account in connection window. Then confirm connection here. Work stays in this room.</p>
        <div className="mt-3 flex gap-3">
          {connectionUrl ? <a href={connectionUrl} target="_blank" rel="noreferrer" className="rounded bg-[#171717] px-3 py-1.5 text-white">Connect {connection.toolkit}</a> : null}
          <button type="button" onClick={() => onContinueConnection?.(connection.toolkit)} className="rounded border border-[#ddd] px-3 py-1.5">{connectionStatus?.toUpperCase() === "EXPIRED" ? "Refresh connection" : "Continue"}</button>
        </div>
        {connectionStatus && connectionStatus.toUpperCase() !== "ACTIVE" ? <p className="mt-2 text-[#777]">Connection: {connectionStatus.toLowerCase()}</p> : null}
      </div> : null}
      {toolApproval && (!connection || connectionActive) ? <div className="rounded-lg border border-[#e3e0db] bg-white p-4 text-[13px] text-[#262626]">
        <p className="font-semibold">Approve {writeInput ? writeAction : toolApproval.name}?</p>
        {writeInput ? <div className="mt-2 space-y-1 text-[#666]">
          {Object.entries(writeArguments).filter(([key]) => !["user_id", "account_id"].includes(key)).map(([key, value]) => <p key={key}><span className="font-medium">{key.replaceAll("_", " ")}:</span> {typeof value === "string" ? value : JSON.stringify(value)}</p>)}
          {writeInput.toolSlug === "GMAIL_CREATE_EMAIL_DRAFT" ? <p>No email will be sent.</p> : null}
        </div> : <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-[#666]">{JSON.stringify(toolApproval.input || {}, null, 2)}</pre>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onToolApproval?.(true)} className="rounded bg-[#171717] px-3 py-1.5 text-white">Approve</button>
          <button type="button" onClick={() => onToolApproval?.(false)} className="rounded border border-[#ddd] px-3 py-1.5">Deny</button>
        </div>
      </div> : null}
      {onControlWorkRun && turns.length ? <details className="text-xs text-[#666]" onToggle={(event) => { if (event.currentTarget.open) onControlWorkRun("status"); }}>
        <summary className="cursor-pointer">WorkRun recovery</summary>
        <p className="mt-2">{workRun?.status || "Checking…"} · {workRun?.checkpoints?.length || 0} durable checkpoints</p>
        <div className="my-2 flex gap-3">
          <button type="button" onClick={() => onControlWorkRun("status")}>Refresh status</button>
          {workRun?.status === "running" ? <button type="button" onClick={() => onControlWorkRun("pause")}>Pause work</button> : null}
          {["paused", "errored", "terminated"].includes(workRun?.status) ? <button type="button" onClick={() => onControlWorkRun("resume")}>Resume work</button> : null}
        </div>
        <ol>{(workRun?.checkpoints || []).map((item) => <li key={item.stage}>{item.stage}</li>)}</ol>
      </details> : null}
      {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
    </div>
  );
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

export function taskOrbState(status, events = []) {
  if (status !== "working") return "solving";
  const step = [...events].reverse().find((event) => !["user", "workrun"].includes(event.step))?.step || "";
  if (/search|recall|browser|maps|hivemind_meta/.test(step)) return "searching";
  if (/connected|composio|connector/.test(step)) return "searching";
  if (/artifact|pdf|render|report|draft/.test(step)) return "composing";
  return "solving";
}

export function TaskPreview({ status, events, places, sources, report, artifacts = [], selectedArtifact, previewRequest, onSelectArtifact, onCreatePdf, pdfError, employee, employeeAvatar, onConnectApps, onOpenSettings, hasContent = true }) {
  const [width, setWidth] = useState(520);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showEnvironment, setShowEnvironment] = useState(true);
  const [tab, setTab] = useState("preview");
  const [selection, setSelection] = useState({ type: "auto" });
  const [pdfUrl, setPdfUrl] = useState("");
  const drag = useRef(null);
  useEffect(() => {
    if (events?.some((event) => event.step === "user")) setShowEnvironment(false);
  }, [events]);
  useEffect(() => {
    if (previewRequest?.id) { setSelection({ type: "artifact", id: previewRequest.id }); setTab("preview"); setPanelOpen(true); }
  }, [previewRequest?.id, previewRequest?.serial]);
  useEffect(() => {
    if (selectedArtifact?.contentType !== "application/pdf" || !selectedArtifact.body) { setPdfUrl(""); return undefined; }
    const bytes = Uint8Array.from(atob(selectedArtifact.body), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedArtifact]);
  const openUrl = selection.type === "source" ? selection.url : "";
  const openArtifact = (id) => { setSelection({ type: "artifact", id }); onSelectArtifact?.(id); setTab("preview"); setPanelOpen(true); };
  const openSource = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
      setSelection({ type: "source", url: parsed.href });
      setTab("preview");
    } catch { /* Ignore invalid source URLs. */ }
  };
  const sourceRows = useMemo(() => {
    const rows = [];
    const seen = new Set();
    const add = (url, title) => {
      try {
        const parsed = new URL(url);
        if (!["https:", "http:"].includes(parsed.protocol) || seen.has(parsed.href)) return;
        seen.add(parsed.href);
        rows.push({ url: parsed.href, title: title || hostOf(parsed.href) });
      } catch { /* Ignore invalid source URLs. */ }
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
      setWidth(next);
      window.dispatchEvent(new CustomEvent("hm-task-preview", { detail: { wide: next / screen >= 0.4 } }));
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
  const showArtifact = !openUrl && Boolean(selectedArtifact) && (selection.type !== "artifact" || selection.id === selectedArtifact.id);
  const storedUrl = artifactUrl(selectedArtifact);
  const environmentSlot = typeof document === "undefined" ? null : document.getElementById("hm-room-environment-slot");
  const orbState = taskOrbState(status, events);
  const activeOrb = status === "working";
  const imageUrl = /^image\/(png|jpeg|webp|gif)$/.test(selectedArtifact?.contentType || "")
    ? (storedUrl || (selectedArtifact?.body ? `data:${selectedArtifact.contentType};base64,${selectedArtifact.body}` : ""))
    : "";
  return (<>
    {environmentSlot ? createPortal(showEnvironment ? (
      <div className="w-[288px] rounded-[18px] border border-[#dedede] bg-white px-3 py-2.5 text-[#252525] shadow-[0_10px_28px_rgba(0,0,0,0.09)]" aria-label="Room environment">
        <div className="flex items-center gap-1.5 border-b border-[#f0f0f0] pb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 flex-1 text-[11px] text-[#858585]">Environment</span>
          <button type="button" onClick={() => setShowEnvironment(false)} aria-label="Hide environment" className="text-[11px] text-[#777] hover:text-[#222]">Hide</button>
        </div>
        <div className="flex items-center gap-2.5 py-2 text-[13px]">
          {employeeAvatar || <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7efff] text-sm">✦</span>}
          <span className="min-w-0 flex-1 truncate font-medium">{employee?.name || "HyperAgent"}</span>
          <ThinkingOrb state={orbState} size={20} theme="light" color="#111111" dotSize={1.2} gravity={orbGravity(orbState)} paused={!activeOrb} aria-label={`Agent ${status || "idle"}`} />
          {onOpenSettings ? <button type="button" onClick={onOpenSettings} aria-label="Room instructions" className="text-[#777] hover:text-[#222]"><Settings2 size={16} /></button> : null}
        </div>
        <button type="button" onClick={onConnectApps} disabled={!onConnectApps} className="flex w-full items-center gap-2 border-t border-[#f0f0f0] py-2 text-left text-[12px] hover:text-[#2563a6] disabled:cursor-default">
          <Grid2X2Plus size={15} /><span className="flex-1">Connect apps</span><ChevronRight size={14} className="text-[#aaa]" />
        </button>
        <div className="flex items-center gap-3 border-t border-[#f0f0f0] pt-2 text-[11px] text-[#777]">
          <button type="button" onClick={() => setTab("artifacts")} className="hover:text-[#252525]">Files {artifacts.length}</button>
          <a href="/hivemind/app/usage" className="hover:text-[#252525]">Credits used</a>
        </div>
      </div>
    ) : <button type="button" onClick={() => setShowEnvironment(true)} aria-label="Show environment" className="rounded-full border border-[#dedede] bg-white px-3 py-1 text-[11px] text-[#777] shadow-sm">Environment</button>, environmentSlot) : null}
    {hasContent && !panelOpen ? <button type="button" aria-label="Open preview panel" onClick={() => setPanelOpen(true)} className="hidden shrink-0 border-l border-[#e3e0db] bg-white px-3 text-[12px] text-[#555] hover:text-[#171717] lg:block">Preview ›</button> : null}
    <aside className={`relative min-h-0 shrink-0 bg-[#f6f5f1] ${hasContent && panelOpen ? 'hidden lg:flex' : 'hidden'}`} style={{ width }}>
      <button
        type="button"
        aria-label="Resize preview"
        className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize hover:bg-[#117dff]"
        onMouseDown={(event) => { drag.current = { x: event.clientX, startWidth: width }; }}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[#e3e0db] bg-white">
        <div className="flex items-center gap-2 border-b border-[#eeeae4] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          {[["preview", "Preview"], ["artifacts", "Artifacts"], ["computer", "Computer"], ["sources", "Sources"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`ml-1 rounded-full px-2.5 py-1 text-[12px] ${tab === id ? "bg-[#171717] text-white" : "text-[#525252]"}`}>{label}</button>
          ))}
          <button type="button" aria-label="Close preview panel" onClick={() => setPanelOpen(false)} className="ml-auto rounded p-1 text-[#777] hover:bg-[#f1f1f1] hover:text-[#171717]"><X size={16} /></button>
        </div>
        <div className={`min-h-0 flex-1 ${tab === "preview" && selectedArtifact?.contentType === "application/pdf" && !openUrl ? "overflow-hidden" : "overflow-auto"}`}>
          {tab === "preview" ? (
            showArtifact && selectedArtifact.contentType === "application/pdf" && (pdfUrl || storedUrl) ? (
              <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="flex min-h-0 shrink-0 items-center gap-3 border-b border-[#eeeae4] px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#303030]" title={selectedArtifact.title}>{selectedArtifact.title}</span>
                  <a href={pdfUrl || storedUrl} download={selectedArtifact.title} className="shrink-0 text-[12px] text-[#2563a6] underline">Download PDF</a>
                </div>
                {selectedArtifact.body ? <div className="min-h-0 flex-1 overflow-auto"><React.Suspense fallback={<p className="p-4 text-sm text-[#737373]">Loading PDF…</p>}><PdfCanvasPreview body={selectedArtifact.body} /></React.Suspense></div>
                  : <iframe title={selectedArtifact.title} src={storedUrl} className="min-h-0 w-full flex-1 border-0" />}
              </div>
            ) : showArtifact && imageUrl ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-[#eeeae4] px-3 py-2 text-[12px]">
                  <span className="min-w-0 truncate font-medium">{selectedArtifact.title}</span>
                  <a href={imageUrl} download={selectedArtifact.title} className="shrink-0 text-[#2563a6] underline">Download PNG</a>
                </div>
                <div className="min-h-0 flex-1 overflow-auto"><img src={imageUrl} alt={selectedArtifact.title} className="block h-auto w-full" /></div>
              </div>
            ) : showArtifact ? (
              <article onClick={(event) => { const link = event.target.closest?.("a[href]"); if (link && event.currentTarget.contains(link)) { const url = link.getAttribute("href"); if (/^https?:\/\//i.test(url || "")) { event.preventDefault(); openSource(url); } } }} className="mx-auto max-w-[780px] break-words px-7 py-8 text-[14px] leading-[1.7] text-[#242424] [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-[#2563a6] [&_a]:underline [&_h1]:mb-4 [&_h1]:text-[23px] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-semibold [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#858585]">{selectedArtifact.contentType === "text/markdown" ? "Markdown report" : selectedArtifact.contentType}</p>
                <h1 className="mb-5 text-[18px] font-semibold">{selectedArtifact.title}</h1>
                {selectedArtifact.contentType === "text/markdown" ? <button type="button" onClick={() => onCreatePdf?.(selectedArtifact.id)} className="mb-5 rounded-md border border-[#d7d7d7] px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5]">Generate PDF</button> : null}
                {pdfError ? <p role="alert" className="text-red-700">PDF failed: {pdfError}</p> : null}
                {selectedArtifact.contentType === "text/markdown" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedArtifact.body}</ReactMarkdown>
                  : selectedArtifact.contentType === "text/plain" ? <pre className="whitespace-pre-wrap font-sans">{selectedArtifact.body}</pre>
                  : selectedArtifact.contentType === "text/html" ? <iframe title={selectedArtifact.title} sandbox="" srcDoc={selectedArtifact.body} className="h-[70vh] w-full border border-[#e3e0db]" />
                  : <p>Preview unavailable for {selectedArtifact.contentType}. {storedUrl ? <a href={storedUrl} target="_blank" rel="noopener noreferrer">Open stored output</a> : "No file was saved."}</p>}
              </article>
            ) : selection.type === "artifact" ? <p className="p-6 text-[13px] text-[#737373]">Loading artifact preview…</p>
              : previewUrl ? <div className="flex h-full min-h-0 flex-col"><div className="flex items-center gap-2 border-b border-[#eeeae4] px-3 py-2 text-[12px]"><span className="min-w-0 flex-1 truncate" title={previewUrl}>{previewUrl}</span><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#2563a6] underline">Open site</a></div><iframe key={previewUrl} title="Source website" src={previewUrl} className="min-h-0 w-full flex-1 border-0 bg-white" /></div>
              : <p className="p-6 text-[13px] text-[#737373]">Generated artifacts appear here. Select a source to view its website.</p>
          ) : null}
          {tab === "computer" ? <p className="p-6 text-[13px] text-[#737373]">The computer view opens when a step needs a screen the browser cannot read.</p> : null}
          {tab === "artifacts" ? <ul className="divide-y divide-[#f0ece6]">
            {artifacts.length === 0 ? <li className="px-4 py-3 text-[13px] text-[#a3a3a3]">No saved outputs yet.</li> : artifacts.map((artifact) => (
              <li key={artifact.id}><button type="button" onClick={() => openArtifact(artifact.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#faf9f4]">
                <FileText size={16} className="shrink-0 text-[#8a847c]" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{artifact.title}</span><span className="text-[11px] text-[#858585]">{artifact.kind} · {new Date(artifact.createdAt).toLocaleString()}</span></span>
              </button></li>
            ))}
          </ul> : null}
          {tab === "sources" ? (
            <ul className="divide-y divide-[#f0ece6]">
              {sourceRows.length === 0 ? <li className="px-4 py-3 text-[13px] text-[#a3a3a3]">Web search links show up here.</li> : sourceRows.map((source) => (
                <li key={source.url}>
                  <button type="button" onClick={() => openSource(source.url)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#faf9f4]">
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
  </>);
}
