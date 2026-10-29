# Connectors page parity with Runtime apps

Status: implemented on `claude/connectors-parity`; not deployed. Requires the Core change in HIVEMIND `claude/connectors-list-parity` for the new fields; without it the page falls back to `connected` only.

## Where the page reads connections

- Toolkit grid (`ComposioToolkitBrowser.jsx`, `MobileConnectors.jsx`): `GET /v1/connectors/composio/toolkits` through `apiClient.listComposioToolkits`.
- Tiles (`Connectors.jsx`, including the LinkedIn Composio tile) and the mobile apps sheet: `GET /v1/connectors` through `apiClient.listOAuthConnectors`.
- Connect: `POST /v1/connectors/composio/:toolkit/connect` (`createComposioConnectLink`), which Core creates on the personal subject `hivemind:<userId>`. Reconnect uses the same call.

## One rule

Core derives one row per toolkit: the ACTIVE account (personal first, newest when both subjects hold one, tie to personal); expired-only is `reconnect`; no account is `available`. Runtime applies the same rule in `connected-apps/src/subjects.ts`.

## Change

- `shared/toolkit-connection.js` maps the Core fields `connection_status` and `connection_origin` to the card state (`connected`, `reconnect`, `available`) and an origin label.
- The desktop and mobile toolkit cards show `Connected · Personal|Workspace` and a `Reconnect` button for expired-only toolkits. A disconnect on the page resets the card to `available`.
- `Connectors.jsx` merged no live status for Composio tiles, so the LinkedIn tile always read Available. It now takes `connected` or `needs_reauth` and the chosen account from the `/v1/connectors` row.

## Evidence

`shared/toolkit-connection.test.js`. Core's `composio-connectors-parity.test.js` and the Runtime spec assert the same fixture rows.

## Release

Cloudflare Worker through the guarded frontend release (`hivemind-fe-deploy`), after Core is deployed.
