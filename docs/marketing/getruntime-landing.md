# Get Runtime landing page

Owner: Da-vinci outer frontend / Cloudflare Worker. No Core, Control Plane, Brain runner or Runtime Runner code changes.

## Brief and design

Reference: https://muse.ai/ and https://ai.meta.com/muse/ (visually inspected 18 October 2026). Runtime-specific original imagery and copy; no Meta logos, mascot, product footage or marketing claims copied.

{
  "palette": {
    "stage": "#181819",
    "surface": "#252628",
    "text": "#f6f6f4",
    "muted": "#a4a5a8",
    "action": "#568df7",
    "paper": "#f4f5f6"
  },
  "type": "Existing Inter for headings and body; regular 60px desktop hero, 40px mobile, no new font dependency.",
  "layout": "Muse-like full-height cover, centered character wordmark and rotating outcome. Slim fixed navigation. Below: large introduction scene; six alternating explanatory feature sections; user-controlled signal-to-result example; real account CTA; compact FAQs and legal footer.",
  "wireframe": "SINGULANCE                                            Log in\\n\\n                    Runtime portrait\\n               Runtime, AI that\\n                gets the work done.\\n\\n            Log in with your HIVEMIND account\\n              [ Continue to Runtime ]\\n\\n                    Learn more \u2193\\n-----------------------------------------------------------\\n              Built around your company.\\n                   [Team scene]\\n-----------------------------------------------------------\\n [Signal illustration]    Sees what needs attention.\\n Gets the right people... [Team illustration]\\n [Review illustration]    Checks the work...\\n-----------------------------------------------------------\\n             One signal. Work carried through.\\n          [Notice] [Plan] [Delegate] [Verify] [Ask]\\n-----------------------------------------------------------\\n            Ready to meet your superstaff?\\n                  [Open Runtime]\\n                     FAQs\\n                     Footer"
}

## Content sources and limits

Read Runtime Runner GOAL.md, docs/runtime/native-upgrades/runtime-README.md, hq-runtime-README.md, decision-README.md and proactive-cognition-README.md. Read HIVEMIND outputs/anticipatory-native-capability-map-2026-10-06.md. These documents distinguish product goals, source capabilities, staging limits and live acceptance. Public copy describes the operating model; it does not assert that all channels, app events or background workflows are enabled for every workspace. Calls and proactive workflows are qualified by configured services and permission. No invented customers, benchmarks, reviews or App Store availability. The clickable company workflow is explicitly illustrative.

## Authentication and host isolation

All sign-in/continue actions open the existing Runtime application entry at https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness. The landing does not collect credentials or create sessions. The getruntime host accepts only public GET/HEAD documents and assets; private routes are not proxied. Existing Brain and Runtime app hosts are unchanged.

## Assets

Eight original built-in image_gen assets. Runtime identity preserves the existing aged CRT head, amber face, olive hoodie and ochre patch. No flowers. Original PNGs and full prompts: HIVEMIND/outputs/getruntime-landing-20261018/. Optimized WebP assets: public/assets/getruntime/. Alpha is preserved on the portrait.

## Validation

Three React checks cover actual Runtime entry, keyboard workflow interaction and reduced motion. Six public-host checks cover host isolation, rendering identity, API denial, real missing-file errors, discovery and app redirect. Four existing Runtime routing checks pass. The broader ai-discovery-contract.test.mjs has two pre-existing failures, independently reproduced at the unchanged base 158a0f80: old robots content expectations and next-host robots redirect expectations. No weakening or unrelated policy edits were made to make those pass.

Browser checks: desktop and a real 390x844 embedded browser viewport; no horizontal overflow. This is browser responsive validation, not an iOS simulator claim.
