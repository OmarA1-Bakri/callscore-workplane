# Runtime Routing and Cleanup Audit

Run: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T182522Z-runtime-cleanup`

Disk before: 87.73% used, free 19755655168 bytes.
Disk after: 83.27% used, free 26926526464 bytes.
Deleted: 13 paths. Recovered by df delta: 7170871296 bytes.

## Runtime routing proof

- `whop-auto-hermes-worker-1` service `hermes-worker` project `whop-auto` compose `/opt/crypto-tuber-ranked/docker-compose.yml` workdir `/opt/crypto-tuber-ranked` => ACTIVE_RUNTIME_DEPENDENCY
- `whop-auto-channel-agent-worker-1` service `channel-agent-worker` project `whop-auto` compose `/opt/crypto-tuber-ranked/docker-compose.yml` workdir `/opt/crypto-tuber-ranked` => ACTIVE_RUNTIME_DEPENDENCY
- `whop-auto-ytdlp-pot-provider-1` service `ytdlp-pot-provider` project `whop-auto` compose `/opt/crypto-tuber-ranked/docker-compose.yml` workdir `/opt/crypto-tuber-ranked` => ACTIVE_RUNTIME_DEPENDENCY
- `crypto-tuber-ranked-hermes-worker-1` service `hermes-worker` project `crypto-tuber-ranked` compose `/opt/crypto-tuber-ranked/docker-compose.yml` workdir `/opt/crypto-tuber-ranked` => ACTIVE_RUNTIME_DEPENDENCY
- `crypto-tuber-ranked-ytdlp-pot-provider-1` service `ytdlp-pot-provider` project `crypto-tuber-ranked` compose `/opt/crypto-tuber-ranked/docker-compose.yml` workdir `/opt/crypto-tuber-ranked` => ACTIVE_RUNTIME_DEPENDENCY
- `hh-oauth-mcp-gateway` service `oauth-mcp-gateway` project `oauth-mcp-gateway` compose `/srv/agents/oauth-mcp-gateway/docker-compose.yml` workdir `/srv/agents/oauth-mcp-gateway` => UNKNOWN_BLOCKED
- `hermes-whop-automation-tunnel` service `None` project `None` compose `None` workdir `None` => UNKNOWN_BLOCKED

## Protected active paths

- `/opt/crypto-tuber-ranked` ACTIVE_RUNTIME_DEPENDENCY
- `/opt/crypto-tuber-ranked/docker-compose.yml` active compose file
- `/opt/callscore/secrets/youtube-cookies.txt` PROTECTED_RUNTIME_STATE; content not read/printed
- `/srv/agents/repos/callscore-workplane` CONTROL_PLANE_ACTIVE

## Unknowns blocked

