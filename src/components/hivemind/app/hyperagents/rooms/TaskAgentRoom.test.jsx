import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TaskPreview, TaskTranscript } from "./TaskAgentRoom";

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

test("PDF fills preview beneath tabs", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "22222222-2222-4222-8222-222222222222", kind: "pdf", title: "German competitor report.pdf", contentType: "application/pdf", storageLocation: "https://example.com/report.pdf", body: "" };
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TaskPreview status="complete" events={[]} places={[]} sources={[]} report="" artifacts={[artifact]} selectedArtifact={artifact} />));
  expect(container.querySelector("article")).toBeNull();
  expect(container.querySelector('iframe[title="German competitor report.pdf"]')?.className).toContain("flex-1");
  act(() => root.unmount());
});

test("saved artifact appears beneath its creating turn", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const artifact = { id: "33333333-3333-4333-8333-333333333333", kind: "image", title: "Homepage screenshot.png", contentType: "image/png" };
  const events = [
    { at: "2026-09-26T12:00:00Z", step: "user", detail: "Capture homepage" },
    { at: "2026-09-26T12:00:01Z", step: "artifact", detail: JSON.stringify(artifact) },
    { at: "2026-09-26T12:00:02Z", step: "report", detail: "Screenshot captured." },
  ];
  const select = jest.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TaskTranscript messages={[]} events={events} status="complete" artifacts={[artifact]} onSelectArtifact={select} />));
  const card = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Homepage screenshot.png"));
  expect(card).toBeTruthy();
  expect(container.textContent.indexOf("Screenshot captured.")).toBeLessThan(container.textContent.indexOf("Homepage screenshot.png"));
  act(() => card.click());
  expect(select).toHaveBeenCalledWith(artifact.id);
  act(() => root.unmount());
});
