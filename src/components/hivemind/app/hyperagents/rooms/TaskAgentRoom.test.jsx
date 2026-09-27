import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TaskPreview, TaskTranscript, agentInstanceName } from "./TaskAgentRoom";

jest.mock("react-markdown", () => ({ __esModule: true, default: ({ children }) => <div>{children}{String(children).includes("https://source.example") ? <a href="https://source.example/page">Source</a> : null}</div> }));
jest.mock("remark-gfm", () => () => null);
jest.mock("./PdfCanvasPreview", () => ({ __esModule: true, default: () => <span>PDF pages</span> }));

test("renders saved report in preview and opens artifacts from the rail", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "11111111-1111-4111-8111-111111111111", kind: "report", title: "German competitors", contentType: "text/markdown", body: "## Verified vendors\n\nParloa", createdAt: "2026-09-26T12:00:00Z" };
  const onSelectArtifact = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  const onConnectApps = jest.fn();
  act(() => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[{ url: "https://example.com", title: "Example" }]} report="" artifacts={[artifact]} selectedArtifact={artifact} onSelectArtifact={onSelectArtifact} employee={{ name: "Maya" }} onConnectApps={onConnectApps} />));
  expect(container.textContent).toContain("Maya");
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
  expect(container.textContent).toContain("Approve hivemind_connected_task?");
  act(() => container.querySelector("button").click());
  expect(onToolApproval).toHaveBeenCalledWith(true);
  expect(agentInstanceName("org", "room")).toBe("session-org-room");
  act(() => root.unmount());
});

test("shows streamed progress before final report", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [{ at: "2026-09-26T12:00:00Z", step: "user", detail: "Check Gmail status" }];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" draft={{ type: "progress-draft", text: "I’m checking the connection receipt." }} />));
  expect(container.textContent).toContain("I’m checking the connection receipt.");
  act(() => root.unmount());
});

test("shows agent progress text without expanding a tool row", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Check Gmail status" },
    { at: "2026-09-26T12:00:00Z", step: "workrun", detail: "Loading authenticated context" },
    { at: "2026-09-26T12:00:01Z", step: "progress", detail: "I’ll check the Gmail connection receipt." },
  ];
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="working" />));
  expect(container.textContent).toContain("Loading authenticated context");
  expect(container.textContent).toContain("I’ll check the Gmail connection receipt.");
  expect(container.querySelectorAll("button[aria-expanded]")).toHaveLength(1);
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
