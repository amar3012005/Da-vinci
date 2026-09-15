# SINGULANCE Da-vinci contract consumer

Before changing the HIVE-MIND shell, Cloudflare Worker, authentication routing,
native Harness admission, or production delivery, read the pinned platform
contract in `platform-contract.json`.

Da-vinci owns the web shell and Cloudflare edge Worker. It does not own Core
authorization, durable HIVE memory, Composio credentials, or native Harness
plugin behavior. Release only the Worker/frontend when it is the changed
artifact; use the canonical contract for all cross-service changes.
