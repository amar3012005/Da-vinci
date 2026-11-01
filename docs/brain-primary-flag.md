# Brain primary flag

One Cloudflare Flagship string flag, `brain-primary`, on the existing `FLAGS` binding (app `2e89fbd3-7496-459b-a507-f1017d444dd9`), decides which Brain chat is primary:

- `company` (default; also used when the flag is missing, unreadable or any other value): Overview, New chat, the Chat tile, the sidebar and mobile Brain chat open the Company Brain at `https://brain-runner.singulancelabs.com/dots/dot_company_brain`. The packaged iOS app opens it as the native room, including on cold start at `/overview/new`.
- `harness`: the Worker no longer redirects `/hivemind/app/overview` and `/overview/new`, and the SPA stops intercepting Brain chat links, so the old DSH harness chat is served as before.

No code deploy is needed and the old runner is not contacted when `company` is primary.

## Flip

Cloudflare dashboard > Compute > Flagship > app `hivemind-web` flags > `brain-primary` > set the default variation (create the string flag with variations `company` and `harness` on first use), or the Flagship API. Roll back by setting it back to `company` (or `harness`). The Worker re-reads the flag every 15 s per isolate; the web shell and packaged apps cache it 30 s, so a flip is live within about 45 s (reload to see it sooner).

Read the live value: `curl -s https://next.singulancelabs.com/__hivemind/feature-flags/brain-primary` returns `{"primary":"company"}`.

## Code

- `cloudflare/brain-primary.mjs`: flag read with fallback and the public route.
- `cloudflare/runtime-open-dot.mjs`: `brainInstantRedirect(request, primary)`.
- `src/components/hivemind/app/shared/brain-primary.js`: `brainPrimary()`, `peekBrainPrimary()`, `useBrainPrimary()` for the shell and for the native room opener.
