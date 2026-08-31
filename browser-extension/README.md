# SINGULANCE Browser Companion

This optional Manifest V3 extension creates a visible Chrome tab group named
`HIVEMIND`. It complements the isolated Cloudflare Browser used by HyperAgents;
it does not copy cookies into Cloudflare, use the debugger API, or scrape pages
in the background.

For local testing, open `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select this directory. Open SINGULANCE, click the
extension action, and the active tab is placed into the `HIVEMIND` group.

Only the production and preview SINGULANCE origins receive the narrow message
bridge. Commands are allowlisted and require a user-visible action.
