import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TaskPreview, TaskTranscript, agentInstanceName, applyNativeStreamFrame, applySocketMessage, normalizeStreamText, taskOrbState } from "./TaskAgentRoom";

jest.mock("react-markdown", () => ({ __esModule: true, default: ({ children }) => <div>{children}{String(children).includes("https://source.example") ? <a href="https://source.example/page">Source</a> : null}</div> }));
jest.mock("remark-gfm", () => () => null);
jest.mock("./PdfCanvasPreview", () => ({ __esModule: true, default: () => <span>PDF pages</span> }));
jest.mock("thinking-orbs", () => ({ ThinkingOrb: ({ state, size, gravity, style, color }) => <span data-orb-state={state} data-orb-size={size} data-orb-gravity={gravity?.sprite ? "pointer" : "none"} data-orb-color={color} style={style} /> }), { virtual: true });

test("streaming text cannot create an unbounded blank transcript tail", () => {
  expect(normalizeStreamText("\n\n\n\n     \n\nFirst words\n\n\n\nNext")).toBe("First words\n\nNext");
  expect(normalizeStreamText("   \r\n\t\r\nAnswer")).toBe("Answer");
});

test("renders saved report in preview and opens artifacts from the rail", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "11111111-1111-4111-8111-111111111111", kind: "report", title: "German competitors", contentType: "text/markdown", body: "## Verified vendors\n\nParloa", createdAt: "2026-09-26T12:00:00Z" };
  const onSelectArtifact = jest.fn();
  const container = document.createElement("div");
  container.innerHTML = '<div id="hm-room-environment-slot"></div><div id="preview-root"></div>';
  document.body.appendChild(container);
  const root = createRoot(container.querySelector("#preview-root"));
  const onConnectApps = jest.fn();
  act(() => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[{ url: "https://example.com", title: "Example" }]} report="" artifacts={[artifact]} selectedArtifact={artifact} onSelectArtifact={onSelectArtifact} employee={{ name: "Maya" }} onConnectApps={onConnectApps} />));
  expect(container.textContent).toContain("Maya");
  expect(container.querySelector('[data-orb-state="solving"]')).toBeTruthy();
  act(() => [...container.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === "Hide environment").click());
  expect(container.textContent).not.toContain("Connect apps");
  act(() => [...container.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === "Show environment").click());
  expect(container.textContent).toContain("Verified vendors");
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Connect apps")).click());
  expect(onConnectApps).toHaveBeenCalledTimes(1);
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Files 1")).click());
  expect(container.textContent).toContain("German competitors");
  const artifactButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Artifacts");
  act(() => artifactButton.click());
  const reportButtons = [...container.querySelectorAll("button")].filter((button) => button.textContent.includes("German competitors"));
  act(() => reportButtons[reportButtons.length - 1].click());
  expect(onSelectArtifact).toHaveBeenCalledWith(artifact.id);
  act(() => root.unmount());
  container.remove();
});

test("orb follows live task phase", () => {
  expect(taskOrbState("working", [{ step: "parallel_search" }])).toBe("searching");
  expect(taskOrbState("working", [{ step: "hivemind_connected_task" }])).toBe("searching");
  expect(taskOrbState("working", [{ step: "report" }])).toBe("composing");
  expect(taskOrbState("question", [])).toBe("solving");
  expect(taskOrbState("working", [{ step: "workrun", detail: "queued" }])).toBe("solving");
});

test("empty room keeps Preview closed and hides environment after user speaks", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  container.innerHTML = '<div id="hm-room-environment-slot"></div><div id="preview-root"></div>';
  document.body.appendChild(container);
  const root = createRoot(container.querySelector("#preview-root"));
  act(() => root.render(<TaskPreview status="idle" events={[]} places={[]} sources={[]} report="" artifacts={[]} hasContent={false} employee={{ name: "Maya" }} />));
  expect(container.querySelector("aside")?.className).toContain("hidden");
  expect(container.querySelector('[aria-label="Room environment"]')).toBeTruthy();
  act(() => root.render(<TaskPreview status="working" events={[{ step: "user", detail: "Hello" }]} places={[]} sources={[]} report="" artifacts={[]} hasContent={false} employee={{ name: "Maya" }} />));
  expect(container.querySelector('[aria-label="Room environment"]')).toBeNull();
  expect(container.querySelector('[aria-label="Show environment"]')).toBeTruthy();
  act(() => root.unmount());
  container.remove();
});

test("source and report links open in Preview; artifact selection restores artifact", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "report-1", kind: "report", title: "Market report", contentType: "text/markdown", body: "Evidence: https://source.example/page", createdAt: "2026-09-26T12:00:00Z" };
  const selectArtifact = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  const render = (selectedArtifact, previewRequest) => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[{ url: "https://source.example/page", title: "Source" }]} report="" artifacts={[artifact]} selectedArtifact={selectedArtifact} previewRequest={previewRequest} onSelectArtifact={selectArtifact} />);
  act(() => render(artifact));
  act(() => container.querySelector("article a[href='https://source.example/page']").click());
  expect(container.querySelector("iframe[title='Source website']")?.getAttribute("src")).toBe("https://source.example/page");
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "Artifacts").click());
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Market report")).click());
  expect(selectArtifact).toHaveBeenCalledWith("report-1");
  expect(container.textContent).toContain("Evidence: https://source.example/page");
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "Sources").click());
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent.includes("source.example/page")).click());
  act(() => render({ ...artifact }));
  expect(container.querySelector("iframe[title='Source website']")?.getAttribute("src")).toBe("https://source.example/page");
  act(() => render(artifact, { id: artifact.id, serial: 1 }));
  expect(container.textContent).toContain("Evidence: https://source.example/page");
  act(() => root.unmount());
});

test("renders captured PNG from artifact body without external storage URL", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "image-1", kind: "image", title: "ICARUS screenshot.png", contentType: "image/png", body: "iVBORw0KGgo=", createdAt: "2026-09-26T12:00:00Z" };
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[]} report="" artifacts={[artifact]} selectedArtifact={artifact} />));
  expect(container.querySelector("img[alt='ICARUS screenshot.png']")?.getAttribute("src")).toBe("data:image/png;base64,iVBORw0KGgo=");
  expect(container.textContent).toContain("Download PNG");
  act(() => root.unmount());
});

test("shows pending tool approval and keeps room identity scoped", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onToolApproval = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TaskTranscript messages={[]} events={[]} status="working" toolApproval={{ toolCallId: "call-1", name: "hivemind_connected_task", input: { action: "execute_write" } }} onToolApproval={onToolApproval} />));
  expect(container.textContent).toContain("Approve connected app write?");
  act(() => container.querySelector("button").click());
  expect(onToolApproval).toHaveBeenCalledWith(true);
  expect(agentInstanceName("org", "room")).toBe("session-org-room");
  act(() => root.unmount());
});

test("shows streamed progress before final report", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [{ at: "2026-09-26T12:00:00Z", step: "user", detail: "Check Gmail status" }];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" draft={{ progress: "I’m checking the connection receipt.", report: "Draft answer is arriving." }} />));
  expect(container.textContent).not.toContain("Draft answer is arriving.");
  act(() => jest.advanceTimersByTime(24));
  expect(container.textContent).toContain("Dr");
  expect(container.textContent).not.toContain("Draft answer is arriving.");
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("I’m checking the connection receipt.");
  expect(container.textContent).toContain("Draft answer is arriving.");
  act(() => root.unmount());
  jest.useRealTimers();
});

test("rapid company-report chunks paint before the provider pauses", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [{ at: "2026-09-26T12:00:00Z", step: "user", detail: "Research Hamburg banks" }];
  for (let count = 1; count <= 8; count += 1) {
    act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" draft={{ report: "Hamburg prospect report".slice(0, count * 3) }} />));
    act(() => jest.advanceTimersByTime(5));
  }
  expect(container.textContent).toContain("Ham");
  expect(container.textContent).not.toContain("Hamburg prospect report");
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("Hamburg prospect report");
  act(() => root.unmount());
  jest.useRealTimers();
});

test("company report draft is visible while the durable run is still working", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Research Hannover insurers" },
    { at: "2026-09-26T12:00:01Z", step: "workrun-index", detail: "run active" },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" draft={{ report: "First verified finding" }} />));
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("Drafting answer…");
  expect(container.textContent).toContain("First verified finding");
  act(() => root.unmount());
  jest.useRealTimers();
});

test("a direct event frame is visible immediately and does not duplicate its durable state replay", () => {
  const event = { at: "2026-09-26T12:00:01Z", step: "tool-call", detail: '{"id":"call-1","phase":"started"}' };
  const live = applySocketMessage({ events: [] }, event);
  expect(live.events).toEqual([event]);
  expect(applySocketMessage(live, event).events).toHaveLength(1);
  expect(applySocketMessage(live, { type: "cf_agent_state", state: { events: [event] } }).events).toHaveLength(1);
});

test("an older state replay does not erase a newer live tool call", () => {
  const user = { at: "2026-09-26T12:00:00Z", step: "user", detail: "Research Hamburg" };
  const call = { at: "2026-09-26T12:00:02Z", step: "tool-call", detail: '{"id":"call-2","name":"browser_markdown","phase":"started"}' };
  const live = applySocketMessage({ events: [user] }, call);
  const replayed = applySocketMessage(live, { type: "cf_agent_state", state: { events: [user] } });
  expect(replayed.events).toEqual([user, call]);
  const caughtUp = applySocketMessage(replayed, { type: "cf_agent_state", state: { events: [user, call] } });
  expect(caughtUp.events).toEqual([user, call]);
});

test("native Agent stream frames show partial text before persisted report arrives", () => {
  jest.useFakeTimers();
  const started = applyNativeStreamFrame({ progress: "", report: "", native: "old" }, { type: "cf_agent_use_chat_response", body: JSON.stringify({ type: "text-start", id: "text-1" }) });
  const partial = applyNativeStreamFrame(started, { type: "cf_agent_use_chat_response", body: JSON.stringify({ type: "text-delta", id: "text-1", delta: "Checking" }) });
  expect(partial.native).toBe("Checking");
  const container = document.createElement("div");
  const root = createRoot(container);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  act(() => root.render(<TaskTranscript messages={[]} events={[{ at: "2026-09-26T12:00:00Z", step: "user", detail: "Research" }]} status="working" draft={partial} />));
  act(() => jest.advanceTimersByTime(120));
  expect(container.textContent).toContain("Checking");
  act(() => root.unmount());
  jest.useRealTimers();
});

test("completing a live run does not flush its final sentence at once", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const user = { at: "2026-09-26T12:00:00Z", step: "user", detail: "Explain" };
  act(() => root.render(<TaskTranscript messages={[]} events={[user]} status="working" draft={{ report: "The first" }} />));
  act(() => jest.advanceTimersByTime(24));
  const report = { at: "2026-09-26T12:00:01Z", step: "report", detail: "The first sentence arrives smoothly." };
  act(() => root.render(<TaskTranscript messages={[]} events={[user, report, { at: "2026-09-26T12:00:02Z", step: "completion", detail: "complete" }]} status="complete" draft={{}} />));
  expect(container.textContent).not.toContain(report.detail);
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain(report.detail);
  act(() => root.unmount());
  jest.useRealTimers();
});

test("company final answer follows tool and governance receipts, then reveals progressively", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const user = { at: "2026-09-26T12:00:00Z", step: "user", detail: "Create a pitch deck" };
  const playbook = { at: "2026-09-26T12:00:01Z", step: "playbook_get", detail: "local:fundraising.pitch-deck" };
  const report = { at: "2026-09-26T12:00:02Z", step: "report", detail: "# Investor deck\n\nThe completed slide narrative." };
  const review = { at: "2026-09-26T12:00:03Z", step: "post_run_jev", detail: '{"status":"evaluated"}' };
  const render = (events, status) => root.render(<TaskTranscript messages={[]} events={events} status={status} draft={{ report: report.detail, native: "Raw intermediate model text" }} />);
  act(() => render([user, playbook, report], "working"));
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("Opened a task");
  expect(container.textContent).toContain("Drafting answer…");
  expect(container.textContent).toContain("Investor deck");
  expect(container.textContent).not.toContain("Raw intermediate model text");
  act(() => render([user, playbook, report, review], "working"));
  expect(container.textContent).toContain("post run jev");
  expect(container.textContent).toContain("Drafting answer…");
  act(() => render([user, playbook, report, review, { at: "2026-09-26T12:00:04Z", step: "completion", detail: "deliverable_ready" }], "complete"));
  expect(container.textContent).not.toContain("Drafting answer…");
  // The visible draft becomes the saved answer in place; it must not replay.
  expect(container.textContent).toContain("The completed slide narrative.");
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("The completed slide narrative.");
  act(() => root.unmount());
  jest.useRealTimers();
});

test("draft handoff neither blanks nor restarts a sentence when the saved wording changes", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const user = { at: "2026-09-26T12:00:00Z", step: "user", detail: "Greet me" };
  act(() => root.render(<TaskTranscript messages={[]} events={[user]} status="working" draft={{ report: "Hello from a streaming draft." }} />));
  act(() => jest.advanceTimersByTime(240));
  expect(container.textContent).toContain("Hello from a stream");
  act(() => root.render(<TaskTranscript messages={[]} events={[user]} status="working" draft={{}} />));
  expect(container.textContent).toContain("Hello from a stream");
  const report = { at: "2026-09-26T12:00:01Z", step: "report", detail: "Hello from Elena, the employee." };
  act(() => root.render(<TaskTranscript messages={[]} events={[user, report]} status="complete" draft={{}} />));
  act(() => jest.advanceTimersByTime(12));
  expect(container.textContent).toContain("Hello from Elena");
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain(report.detail);
  act(() => root.unmount());
  jest.useRealTimers();
});

test("server confirmation of an optimistic turn keeps its text animation", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const message = { id: "local-turn", at: "2026-09-26T12:00:00Z", text: "Greet me" };
  const draft = { report: "Streaming continues through confirmation." };
  act(() => root.render(<TaskTranscript messages={[message]} events={[]} status="working" draft={draft} />));
  act(() => jest.advanceTimersByTime(120));
  const before = container.textContent.match(/Streaming[^·]*/)?.[0] || "";
  expect(before.length).toBeGreaterThan(5);
  act(() => root.render(<TaskTranscript messages={[message]} events={[{ at: "2026-09-26T12:00:01Z", step: "user", detail: message.text }]} status="working" draft={draft} />));
  expect(container.textContent).toContain(before);
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain(draft.report);
  act(() => root.unmount());
  jest.useRealTimers();
});

test("keeps completed thought and duration visible after answer and next turn", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Who are you?" },
    { at: "2026-09-26T12:00:03Z", step: "report", detail: "I am Milo." },
    { at: "2026-09-26T12:00:04Z", step: "completion", detail: "done" },
    { at: "2026-09-26T12:01:00Z", step: "user", detail: "Next question" },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" />));
  expect(container.textContent).toContain("Thought · Worked · 4s");
  expect(container.textContent).toContain("I am Milo.");
  act(() => root.unmount());
});

test("shows an in-flight runtime browser capture once, then its saved result", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Fetch example.com" },
    { at: "2026-09-26T12:00:01Z", step: "tool-call", detail: JSON.stringify({ id: "call-1", name: "browser_capture", phase: "started", target: "https://example.com" }) },
    { at: "2026-09-26T12:00:02Z", step: "tool-call", detail: JSON.stringify({ id: "call-1", name: "browser_capture", phase: "returned", durationMs: 900, result: '{"artifactId":"image-1","title":"Example screenshot.jpg"}' }) },
    { at: "2026-09-26T12:00:03Z", step: "completion", detail: "complete" },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="complete" />));
  expect(container.textContent.match(/browser_capture/g)).toHaveLength(1);
  expect(container.textContent).toContain("Returned");
  const row = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("browser_capture"));
  act(() => row.click());
  expect(container.textContent).toContain("Example screenshot.jpg");
  expect(container.textContent).toContain("900 ms");
  expect(container.textContent).toContain("https://example.com");
  act(() => root.unmount());
});

test("keeps each plan with its originating turn and holds artifact cards until completion", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const artifact = { id: "report-1", kind: "report", title: "Research report", contentType: "text/markdown" };
  const first = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Research competitors" },
    { at: "2026-09-26T12:00:01Z", step: "operating-plan-state", detail: JSON.stringify({ tasks: [{ id: 1, title: "Check sources", status: "active" }] }) },
    { at: "2026-09-26T12:00:02Z", step: "artifact", detail: JSON.stringify({ id: artifact.id }), },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={first} status="working" artifacts={[artifact]} />));
  expect(container.textContent).toContain("Check sources");
  expect(container.textContent).not.toContain("Research report");
  const next = [...first, { at: "2026-09-26T12:00:03Z", step: "completion", detail: "done" }, { at: "2026-09-26T12:01:00Z", step: "user", detail: "Hello" }];
  act(() => root.render(<TaskTranscript messages={[]} events={next} status="working" artifacts={[artifact]} operatingPlan={{ tasks: [{ id: 2, title: "Wrong next plan", status: "active" }] }} />));
  expect(container.textContent).toContain("Check sources");
  expect(container.textContent).not.toContain("Wrong next plan");
  expect(container.textContent).toContain("Research report");
  act(() => root.unmount());
});

test("shows agent progress text without expanding a tool row", () => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Check Gmail status" },
    { at: "2026-09-26T12:00:00Z", step: "workrun", detail: "Loading authenticated context" },
    { at: "2026-09-26T12:00:01Z", step: "progress", detail: "I’ll check the Gmail connection receipt." },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" />));
  expect(container.textContent).not.toContain("Loading authenticated context");
  act(() => jest.advanceTimersByTime(1200));
  expect(container.textContent).toContain("I’ll check the Gmail connection receipt.");
  expect(container.querySelectorAll("button[aria-expanded]")).toHaveLength(1);
  act(() => root.unmount());
  jest.useRealTimers();
});

test("setup events stay out of transcript while compact solving orb appears", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Who are you?" },
    { at: "2026-09-26T12:00:01Z", step: "workrun", detail: "Loading authenticated context" },
    { at: "2026-09-26T12:00:02Z", step: "workrun", detail: "queued" },
    { at: "2026-09-26T12:00:03Z", step: "workrun", detail: "starting Singulance" },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" />));
  expect(container.textContent).not.toMatch(/Loading authenticated context|Task queued|Preparing task/);
  expect(container.querySelector('[data-orb-state="solving"][data-orb-size="20"]')).toBeTruthy();
  expect(container.querySelector('[data-orb-state="solving"]').getAttribute("data-orb-color")).toBe("#111111");
  act(() => root.unmount());
});

test("attaches saved output to creating turn and opens it in Preview", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "report-1", kind: "report", title: "Market report", contentType: "text/markdown" };
  const onSelectArtifact = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { step: "user", detail: "Write market report", at: "2026-09-26T12:00:00Z" },
    { step: "report", detail: "Report done", at: "2026-09-26T12:00:01Z" },
    { step: "artifact", detail: JSON.stringify({ id: artifact.id, kind: artifact.kind, title: artifact.title }), at: "2026-09-26T12:00:02Z" },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="complete" artifacts={[artifact]} onSelectArtifact={onSelectArtifact} />));
  const card = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Open in Preview"));
  expect(card.textContent).toContain("Market report");
  act(() => card.click());
  expect(onSelectArtifact).toHaveBeenCalledWith(artifact.id);
  act(() => root.unmount());
});

test("renders saved PDF bytes across full Preview height", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = jest.fn().mockReturnValue("blob:report-pdf");
  URL.revokeObjectURL = jest.fn();
  const artifact = { id: "pdf-1", kind: "pdf", title: "Market report.pdf", contentType: "application/pdf", body: btoa("%PDF-test") };
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => { root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[]} report="" artifacts={[artifact]} selectedArtifact={artifact} />); });
  expect(container.textContent).toContain("PDF pages");
  expect(container.querySelector('a[download="Market report.pdf"]')).toBeTruthy();
  act(() => root.unmount());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report-pdf");
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

test("connection banner precedes write approval until provider reports active", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [{ step: "user", at: "2026-09-27T23:00:00Z", detail: "Create Gmail draft" }, { step: "connection-required", at: "2026-09-27T23:00:01Z", detail: JSON.stringify({ toolkit: "gmail", url: "https://connect.composio.dev/link/test" }) }];
  const props = { messages: [], events, status: "working", toolApproval: { toolCallId: "call-1", name: "hivemind_connected_task", input: { action: "execute_write" } } };
  const onContinueConnection = jest.fn();
  act(() => root.render(<TaskTranscript {...props} onContinueConnection={onContinueConnection} />));
  expect(container.textContent).toContain("Connect gmail to continue");
  expect(container.textContent).not.toContain("Approve hivemind_connected_task?");
  expect(container.querySelector('a[href="https://connect.composio.dev/link/test"]')).toBeTruthy();
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "Continue").click());
  expect(onContinueConnection).toHaveBeenCalledWith("gmail");
  act(() => root.render(<TaskTranscript {...props} connectionStatus="ACTIVE" />));
  expect(container.textContent).toContain("Approve connected app write?");
  act(() => root.unmount());
});

test("old connected turn with link shows connection card before pending approval", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [{ step: "user", at: "2026-09-27T23:00:00Z", detail: "Create draft" }, { step: "progress", at: "2026-09-27T23:00:01Z", detail: "Connect https://connect.composio.dev/link/legacy123 first." }];
  act(() => root.render(<TaskTranscript events={events} messages={[]} toolApproval={{ toolCallId: "call-1", name: "hivemind_connected_task", input: { action: "execute_write", toolSlug: "GMAIL_CREATE_EMAIL_DRAFT" } }} />));
  expect(container.textContent).toContain("Connect gmail to continue");
  expect(container.textContent).not.toContain("Approve hivemind_connected_task?");
  act(() => root.unmount());
});
