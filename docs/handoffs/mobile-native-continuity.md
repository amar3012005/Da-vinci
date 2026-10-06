# Mobile native app continuity

## Verified

- Development foundation on `codex/mobile-native-app-20261006`, bundled local React assets, both Capacitor platforms synced.
- Unsigned iOS simulator build installed and launched.
- Combined 36 React checks and four safe-area contracts passed.
- Mobile web corrections deployed as Worker `9c066038-9e32-4158-9b8a-5c0f80dfddb5`. Rollback: `76005805-fc7c-4a8e-a750-602c591c59dd`. No runner restart.
- Signed-in browser verified Brain connector sheet at reduced height, 16px search text, full-height Brain, Runtime frame without horizontal overflow, and team drawer. Temporary viewport reset.
- CRM still displays published version 1 and Qualified synthetic canary.

## Concrete blockers and next work

1. Packaged iOS displays Control plane unavailable: Core bootstrap omits credentialed CORS for `capacitor://localhost` and `https://localhost`. A supported native authentication and secure credential storage contract is required. Backend coordinator notified.
2. DSH session establishment, boot and module graph currently use relative same-origin endpoints. Add a native transport through the existing signed admission and native connection checks, preserving tenant boundaries. No wildcard CORS or bypass.
3. Android Java/SDK absent; user approval to accept Google's SDK agreement is pending. Generated Android source is not a verified APK.
4. After authentication: actual WebView session, keyboard, upload/download, audio, reconnect, physical-device and store acceptance checks remain. See `native/readiness.json`.

The native app is development-only, not store-ready. Web layout proof is not native chat end-to-end proof.
