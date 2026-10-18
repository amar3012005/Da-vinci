# Native event recovery

The exact `/plugins/events` transport always reaches its native runner, including before a native cookie is present. It must return an event stream or a real native error; redirects and successful HTML documents are rejected. Responses are private and not cached. Session/RPC authorization remains owned by the runner.

The outer chat host keeps observing its original native mount after a slow30-second connection. It shows Reconnecting and an explicit reload control while the native connection owns reconnect/backoff. When the composer appears later, the same mount becomes visible. Cancellation still disconnects the observer. No second client, replay loop, user-message resend or new session is created by this recovery.

Cloudflare QUIC retransmission errors are independent of this routing/mount repair. Verify the same stream over HTTP/2 and HTTP/3 on the affected client before claiming transport resolution. The documented hostname workaround removes Alt-Svc through a response-header Transform Rule; a zone-wide HTTP/3 disable is a more reliable temporary isolation test because HTTPS DNS records can also advertise HTTP/3. The configured Wrangler OAuth grant has zone read, without Zone Settings or Transform Rules edit permissions. No zone protocol setting was changed by this release.
