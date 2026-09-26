import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TaskPreview, TaskTranscript, agentInstanceName } from "./TaskAgentRoom";

jest.mock("react-markdown", () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock("remark-gfm", () => () => null);

test("renders saved report in preview and opens artifacts from the rail", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "11111111-1111-4111-8111-111111111111", kind: "report", title: "German competitors", contentType: "text/markdown", body: "## Verified vendors\n\nParloa", createdAt: "2026-09-26T12:00:00Z" };
  const onSelectArtifact = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[{ url: "https://example.com", title: "Example" }]} report="" artifacts={[artifact]} selectedArtifact={artifact} onSelectArtifact={onSelectArtifact} />));
  expect(container.textContent).toContain("Verified vendors");
  const artifactButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Artifacts");
  act(() => artifactButton.click());
  const reportButtons = [...container.querySelectorAll("button")].filter((button) => button.textContent.includes("German competitors"));
  act(() => reportButtons[reportButtons.length - 1].click());
  expect(onSelectArtifact).toHaveBeenCalledWith(artifact.id);
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
