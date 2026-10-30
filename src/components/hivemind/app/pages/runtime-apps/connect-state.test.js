import { readFileSync } from "node:fs";
import path from "node:path";
import { connectBlock, connectErrorMessage } from "./connect-state";

const FALLBACK = "This app can't be connected right now. We're on it.";

describe("connect error text", () => {
  it("shows the server's safe message, never the raw axios status line", () => {
    expect(connectErrorMessage({ response: { data: { error: "Too many sign-in attempts. Wait a minute, then try again." } }, message: "Request failed with status code 429" }, FALLBACK))
      .toBe("Too many sign-in attempts. Wait a minute, then try again.");
    expect(connectErrorMessage({ message: "Request failed with status code 400" }, FALLBACK)).toBe(FALLBACK);
    expect(connectErrorMessage({ message: "Network Error" }, FALLBACK)).toBe(FALLBACK);
    expect(connectErrorMessage(new Error("Allow pop-ups for this page."), FALLBACK)).toBe("Allow pop-ups for this page.");
    expect(connectErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe("connect block", () => {
  it("blocks Sign in only for rows Core marks not connectable", () => {
    expect(connectBlock(null)).toBeNull();
    expect(connectBlock({ slug: "gmail" })).toBeNull();
    expect(connectBlock({ connectable: true })).toBeNull();
    expect(connectBlock({ connectable: false, connectMode: "blocked" })).toBe("unavailable");
    expect(connectBlock({ connectable: false, connectMode: "no_auth" })).toBe("no_sign_in");
  });
});

describe("Apps page copy", () => {
  const source = readFileSync(path.join(__dirname, "AppsDirectory.jsx"), "utf8");
  const en = JSON.parse(readFileSync(path.join(__dirname, "../../../../../../public/locales/en/dashboard.json"), "utf8"));

  it("never says Dot in UI copy, in the page or the dictionary", () => {
    expect(source).not.toMatch(/\bdots?\b/i);
    expect(JSON.stringify(en.runtimeApps)).not.toMatch(/\bdots?\b/i);
  });

  it("routes the connect copy through the dashboard dictionary", () => {
    expect(en.runtimeApps.tryAsking).toBe("Try asking an employee");
    expect(en.runtimeApps.signInNote).toContain("Your employees never see your password");
    expect(en.runtimeApps.connectUnavailable).toBe(FALLBACK);
    for (const key of ["signInNote", "tryAsking", "connectUnavailable", "signIn"]) expect(source).toContain(`runtimeApps.${key}`);
  });
});
