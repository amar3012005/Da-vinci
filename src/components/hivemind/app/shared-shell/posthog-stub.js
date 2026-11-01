// The sidebar shell never starts PostHog (only the app's own index.js does), so the 200 KB client is replaced by this inert object in the shell bundles.
const posthog = { identify() {}, group() {}, capture() {}, init() {}, reset() {} };
export default posthog;
