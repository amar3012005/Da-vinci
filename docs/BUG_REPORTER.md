# Bug reporter release checklist

This independent outer-frontend feature is disabled until configured. It does not change Brain, Runtime, Open Dot, scheduling, or model configuration.

The Worker adds a small same-origin script to app HTML (including proxied native chat) only when all required bindings/configuration are present. The popup supports explicit browser-permission screenshot capture or PNG/JPEG/WebP upload, local black-rectangle redaction, text and a maximum 30-second microphone recording, local preview/removal, and explicit consent before send. Browser permission denial falls back to upload/text. It does not collect console logs, local storage, cookies, query strings, or background recordings.

## Required configuration before release

Obtain the actual admin recipient and sending address from the user. Do not assume support@ or invent a recipient.

1. Onboard the sender domain to Cloudflare Email Service; verify the destination if required by the account's sending mode.
2. Add a `send_email` binding named `BUG_REPORT_EMAIL`, restricted by `destination_address` to the approved admin address and `allowed_sender_addresses` to the approved sender.
3. Add the native rate-limiter binding `BUG_REPORT_RATE_LIMITER`, with a unique namespace ID and `simple: { limit: 3, period: 60 }`.
4. Set `BUG_REPORT_FROM`, `BUG_REPORT_TO`, and only then `BUG_REPORTS_ENABLED=true`. No source defaults point at a real mailbox.
5. Generate binding types with the installed Wrangler before release. This owner is JavaScript; no duplicated handwritten binding interfaces are added.

Example structure (replace placeholders before validation; not a deployable config):

```json
{
  "send_email": [{ "name": "BUG_REPORT_EMAIL", "destination_address": "<approved-admin-email>", "allowed_sender_addresses": ["<approved-sender-email>"] }],
  "ratelimits": [{ "name": "BUG_REPORT_RATE_LIMITER", "namespace_id": "<unique-numeric-id>", "simple": { "limit": 3, "period": 60 } }],
  "vars": { "BUG_REPORT_FROM": "<approved-sender-email>", "BUG_REPORT_TO": "<approved-admin-email>", "BUG_REPORTS_ENABLED": "true" }
}
```

No R2 storage is needed: attachments go directly through the native email binding to the approved admin. The Worker does not persist attachments. The receiving mailbox retains report contents under the administrator's own retention policy; set that policy before rollout. Do not suggest that email attachments expire automatically.

## Access and limits

- Only Next and Runtime app authorities; POST requires an exact same-origin Origin and a valid existing company session, revalidated with the Control Plane bootstrap. Only that cookie crosses to its established owner; bearer/native credentials and client-supplied tenant IDs do not.
- Native rate limit keyed by verified organization/user; fail closed without binding. Three reports per minute per Cloudflare location by deployment configuration; this is not a strict global quota.
- Streamed body cap 3 MB, each attachment 2 MB, remark 4,000 characters; one screenshot and one audio file, exact MIME allowlist plus signature validation. This leaves headroom for base64 email overhead below the documented 5 MiB email size.
- Server strips query/hash from the page and uses a fixed sender and recipient; user cannot turn the endpoint into an arbitrary mail relay.
- Delivery is awaited. A timeout/failure can have an unknown outcome, so the client never retries automatically and instructs the user not to duplicate it.

## Verification / release

Run `node --test scripts/bug-reporter.test.mjs` and existing affected Worker routing tests. Browser-check popup keyboard focus, screenshot upload/redaction, capture permission denial, microphone start/stop, audio preview/removal and narrow viewport. Use a mocked email binding for implementation tests; no real email has been sent.

The optional local browser proof is `node scripts/bug-reporter-browser-proof.mjs` with Playwright available (or `PLAYWRIGHT_MODULE` pointing to an already installed module). It uses installed Chrome, a fake local endpoint and synthetic microphone audio; it never contacts production or sends email. The desktop and 320px screenshots are written to the system temporary directory. Real screen-permission capture and final mailbox delivery must still be tested after reviewed configuration.

After recipient configuration and coordinator release approval, promote through the existing guarded Da-vinci Worker path from latest `origin/main`, retain rollback version, and verify both app authorities. A real controlled delivery to the approved admin mailbox is the final acceptance gate. Current implementation tests do not prove inbox delivery.

Official references:
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/configuration/send-bindings/
- https://developers.cloudflare.com/email-service/platform/limits/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
