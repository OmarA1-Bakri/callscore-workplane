# Docker/container restore plan

Status: skeleton generated; inventory must be completed from HHVM before replacement.

Policy:
- Inventory only. Do not restart containers during migration.
- Record image, command, ports, volumes, networks, env-file references, health checks, and restore command.

Observed containers to document:
- `crypto-tuber-ranked-hermes-worker-1`
- `crypto-tuber-ranked-ytdlp-pot-provider-1`
- `hh-oauth-mcp-gateway`
- `hermes-whop-automation-tunnel`
