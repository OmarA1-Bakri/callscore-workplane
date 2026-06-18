# Docker/container restore plan

Status: completed from live HH read-only inventory on 20260618T081229Z. No containers were restarted or modified.

Evidence:
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-docker-summary.json`
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/restore-rehearsal.json`

## Live containers

| Container | State | Image | Network mode | Restart policy |
|---|---:|---|---|---|
| `crypto-tuber-ranked-hermes-worker-1` | running | `crypto-tuber-ranked-hermes-worker:latest` | `host` | {'Name': 'unless-stopped', 'MaximumRetryCount': 0} |
| `crypto-tuber-ranked-ytdlp-pot-provider-1` | running | `brainicism/bgutil-ytdlp-pot-provider:1.3.1-node` | `host` | {'Name': 'unless-stopped', 'MaximumRetryCount': 0} |
| `hh-oauth-mcp-gateway` | running | `oauth-mcp-gateway-oauth-mcp-gateway` | `host` | {'Name': 'unless-stopped', 'MaximumRetryCount': 0} |
| `hermes-whop-automation-tunnel` | running | `cloudflare/cloudflared:latest` | `host` | {'Name': 'unless-stopped', 'MaximumRetryCount': 0} |

## Compose sources validated

The rehearsal parsed these compose files with `docker compose config --no-interpolate`:

- `apps/callscore-web/docker-compose.yml`
- `data-plane/transcript-acquisition/vpn-ytdlp/docker-compose.yml`
- `control-plane/oauth-mcp-gateway/docker-compose.yml`

All compose parses exited 0. VPN OpenVPN credentials remain `${OPENVPN_USER:?restore from env vault}` and `${OPENVPN_PASSWORD:?restore from env vault}`; no literal VPN secrets are present.

## Restore sequence

1. Restore env files and secret-mounted files first; never print their values.
2. Build or pull images named in the inventory.
3. Run `docker compose config --no-interpolate` on each compose file.
4. Start only the required compose services after systemd/env/DB checks pass.
5. Verify with `docker ps`, `docker inspect` redacted env keys, health status, and application-level checks.
