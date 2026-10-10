# Cloudflare public asset audit — 2026-10-10

The React build copies `public/` wholesale. This audit changes only the
Cloudflare packaging step; source assets and other build targets are retained.
Base source: `da0f97bfc8aa3ab176feba1a945b619626ce22ab`.

## Exclusions

| Assets | Files | Reason |
| --- | ---: | --- |
| `fall-frames/` | 193 | `FallScene.jsx` is paused in `MobileHomepage.jsx` and absent from the application import graph. |
| Legacy artwork listed in `scripts/cloudflare-public-asset-usage.mjs` | 18 | No reachable page, stylesheet, Worker, generated rendering, or retained public document refers to these assets. |

Removed from the deployment directory: **211 files / 22.03 MiB**.
Cloudflare artifact: **913 files / 76.9 MiB**, down from 1,124 files / 98.9 MiB.
No file under `public/` is deleted or modified by pruning.

## Preserved assets

- Horizon animation: all 164 frames, including the mobile/static fallback and
  SceneBridge frame. Sovereign animation: all 121 frames. Sovereign descent:
  all 161 frames. These are generated URL sequences, not individual literal URLs.
- Every language/namespace file in `locales/`: the i18n backend constructs paths
  dynamically. Every installer script: Connectors selects scripts dynamically.
- Runtime character, onboarding art, login illustration, orbit icon, active
  cover/srcset images, research images, social preview, PWA icons and manifests.
- Worker header metadata, service worker, discovery/security documents, setup
  resources, and uncertain/unreferenced fixtures or historical endpoint assets.
  Absence of a literal filename alone is not an exclusion policy.

## Safety checks

`auditPublicAssetExclusions()` uses esbuild's actual import graph rooted at
`src/index.js`; paused, unimported component text is not treated as active.
It additionally checks all source stylesheets, retained public text documents,
Worker code and generated public renderings. Basenames and sequence directory
names capture relative URLs, srcsets and the current dynamic frame construction.
If a removed asset becomes reachable again, the build fails before pruning.

`verify-cloudflare-public-assets.mjs` checks that every retained public file is
present byte-for-byte (except compiled `index.html`), that excluded files are
absent, and that final JS/CSS/HTML/JSON, including lazy chunks, contains no
excluded references. Both checks run on every Cloudflare build.

Tests cover dynamic frame references, re-enabled imports, public manifest
references and stylesheet references. The actual repository audit checks 317
reachable source files and 441 documents. Full compilation and the asset
boundary check pass. The application entry remains `main.f846a84f.js` and CSS
`main.84ce9682.css`, matching the pre-cleanup artifact; page code is unchanged.

## Decisions and release status

Use explicit, reviewed build-only exclusions. Preserve uncertain files instead
of automatically deleting everything absent from a grep result. Guard against
re-enabling the paused animation. No cache/Worker routing change, promotion,
deployment or live-page acceptance is part of this task.
