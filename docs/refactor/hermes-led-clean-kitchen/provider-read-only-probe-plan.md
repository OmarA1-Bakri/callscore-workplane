# Provider Read-Only Probe Plan

No provider read-only probes beyond toolbox status/listing were run in Prompt 8.

For each provider, a future probe must define:

- route visibility evidence
- what may be read
- what must not be read
- required receipt path
- success condition
- halt condition

Composio-routed providers cannot be probed until Composio is visible and verified.

YouTube/ytdlp read-only probe is limited to local ping and container status. Cookie file access is forbidden.

Netlify read-only probe must stop before deploy/build/config mutation.

Whop read-only probe must stop before pricing/payment/plan/config mutation.
