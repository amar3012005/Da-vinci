/**
 * SyncConfigPanel — RED tests (component does not exist yet).
 * Stack: CRA + React 18, Jest + @testing-library/react.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Module under test — intentionally missing; every test will fail RED.
import SyncConfigPanel from "../SyncConfigPanel";

// Mock api-client so no real HTTP is made.
jest.mock("../../../../../api-client", () => ({
  triggerSync: jest.fn(),
  saveSyncConfig: jest.fn(),
}));

const SCOPE_OPTIONS = [
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
];

const DEFAULT_PROPS = {
  webhookActive: false,
  intervalMinutes: 15,
  intervalOptions: [5, 15, 30, 60],
  scopeOptions: SCOPE_OPTIONS,
  selectedScopes: ["notes"],
  lastSyncAt: "2026-05-18T10:00:00Z",
  onSave: jest.fn(),
  onTriggerSync: jest.fn(),
};

// --- Status pill ---------------------------------------------------------

describe("status pill", () => {
  it("shows 'Live' when webhookActive is true", () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} webhookActive={true} />);
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it("shows 'Polling • every N' when webhookActive is false", () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} webhookActive={false} intervalMinutes={15} />);
    expect(screen.getByText(/polling/i)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });
});

// --- Interval dropdown ---------------------------------------------------

describe("interval dropdown", () => {
  it("calls onSave with new intervalMinutes when selection changes and Save is clicked", async () => {
    const onSave = jest.fn();
    render(<SyncConfigPanel {...DEFAULT_PROPS} onSave={onSave} intervalMinutes={15} />);

    const select = screen.getByRole("combobox", { name: /interval/i });
    await userEvent.selectOptions(select, "30");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ intervalMinutes: 30 }));
  });
});

// --- Scope toggles -------------------------------------------------------

describe("scope toggles", () => {
  it("updates aria-pressed when a scope toggle is clicked", async () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} selectedScopes={[]} />);

    const notesBtn = screen.getByRole("button", { name: /notes/i });
    expect(notesBtn).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(notesBtn);

    expect(notesBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the Scope section when scopeOptions is empty", () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} scopeOptions={[]} />);
    expect(screen.queryByText(/scope/i)).not.toBeInTheDocument();
  });
});

// --- Sync Now button -----------------------------------------------------

describe("Sync Now button", () => {
  it("calls onTriggerSync when pressed", async () => {
    const onTriggerSync = jest.fn().mockResolvedValue(undefined);
    render(<SyncConfigPanel {...DEFAULT_PROPS} onTriggerSync={onTriggerSync} />);

    await userEvent.click(screen.getByRole("button", { name: /sync now/i }));

    expect(onTriggerSync).toHaveBeenCalledTimes(1);
  });

  it("disables Sync Now button while sync is pending", async () => {
    let resolve;
    const onTriggerSync = jest.fn(
      () => new Promise((res) => { resolve = res; })
    );
    render(<SyncConfigPanel {...DEFAULT_PROPS} onTriggerSync={onTriggerSync} />);

    await userEvent.click(screen.getByRole("button", { name: /sync now/i }));

    expect(screen.getByRole("button", { name: /sync now/i })).toBeDisabled();

    resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sync now/i })).not.toBeDisabled()
    );
  });
});

// --- lastSyncAt ----------------------------------------------------------

describe("lastSyncAt", () => {
  it("shows 'Never synced' when lastSyncAt is null", () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} lastSyncAt={null} />);
    expect(screen.getByText(/never synced/i)).toBeInTheDocument();
  });

  it("renders a formatted date when lastSyncAt is provided", () => {
    render(<SyncConfigPanel {...DEFAULT_PROPS} lastSyncAt="2026-05-18T10:00:00Z" />);
    // Component must render something that is NOT "Never synced".
    expect(screen.queryByText(/never synced/i)).not.toBeInTheDocument();
  });
});
