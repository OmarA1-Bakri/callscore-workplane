# CallScore Clean-Kitchen Protected Paths

Generated UTC: 2026-06-21T18:22:33Z

No deletion was performed for this phase. Secret/env values were not printed; environment keys may appear only where needed for runtime mapping.

## Hard gates

- `/opt/crypto-tuber-ranked` — protected active runtime dependency. Do not delete, move, rewrite, or clean until a later phase proves replacement and Omar/operator approval exists.
- `/opt/callscore/secrets/youtube-cookies.txt` — protected secret cookie file. Do not read, print, copy, delete, chmod, or rotate in cleanup work. It is observed as a read-only Docker bind mount.

## Protected inventory

| Path | Exists | Reason |
|---|---:|---|
| `/opt/crypto-tuber-ranked` | True | hard gate; active runtime source; dirty work captured in Prompt 1 |
| `/opt/crypto-tuber-ranked/docker-compose.yml` | True | active compose source per Docker labels/baseline |
| `/opt/callscore/secrets` | True | secret directory; never delete or inventory contents |
| `/opt/callscore/secrets/youtube-cookies.txt` | True | hard gate; secret cookie file; active read-only Docker bind mount; content never read; mounted by whop-auto-hermes-worker-1 -> /run/secrets/youtube-cookies.txt (ro); mounted by crypto-tuber-ranked-hermes-worker-1 -> /run/secrets/youtube-cookies.txt (ro) |
| `/srv/agents/repos/callscore-workplane` | True | current clean-kitchen workspace/control artifact path |
| `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen` | True | current clean-kitchen workspace/control artifact path |
| `/srv/agents/repos/callscore-workplane/apps/callscore-web` | True | current clean-kitchen workspace/control artifact path |
| `/srv/agents/repos/crypto-tuber-ranked` | True | known CallScore/crypto-tuber-ranked repo clone; classify unique work before cleanup |
| `/srv/agents/crypto-tuber-ranked` | True | known CallScore/crypto-tuber-ranked repo clone; classify unique work before cleanup |
| `/home/omar/.cloudflared/hermes-whop-automation.token` | True | mounted by hermes-whop-automation-tunnel -> /etc/cloudflared/token (ro); Cloudflare tunnel credential bind mount; secret-bearing |

## Active runtime evidence summary

- Docker containers observed: 8; active/restarting containers are treated as non-deleteable dependencies until their source and mounts are explicitly retired.
- `whop-auto-hermes-worker-1`: state=running, image=crypto-tuber-ranked-hermes-worker:latest, compose_project=whop-auto, compose_service=hermes-worker, mounts=/opt/callscore/secrets/youtube-cookies.txt -> /run/secrets/youtube-cookies.txt (ro)
- `whop-auto-channel-agent-worker-1`: state=running, image=crypto-tuber-ranked-hermes-worker:latest, compose_project=whop-auto, compose_service=channel-agent-worker, mounts=none
- `whop-auto-ytdlp-pot-provider-1`: state=restarting, image=brainicism/bgutil-ytdlp-pot-provider:1.3.1-node, compose_project=whop-auto, compose_service=ytdlp-pot-provider, mounts=none
- `crypto-tuber-ranked-hermes-worker-1`: state=running, image=b1369860652d, compose_project=crypto-tuber-ranked, compose_service=hermes-worker, mounts=/opt/callscore/secrets/youtube-cookies.txt -> /run/secrets/youtube-cookies.txt (ro)
- `crypto-tuber-ranked-ytdlp-pot-provider-1`: state=running, image=brainicism/bgutil-ytdlp-pot-provider:1.3.1-node, compose_project=crypto-tuber-ranked, compose_service=ytdlp-pot-provider, mounts=none
- `hh-oauth-mcp-gateway`: state=running, image=oauth-mcp-gateway-oauth-mcp-gateway, compose_project=oauth-mcp-gateway, compose_service=oauth-mcp-gateway, mounts=none
- `crypto-tuber-ranked-hermes-worker-1-neon-rollback-20260603-214652`: state=exited, image=79476f33a1dc, compose_project=crypto-tuber-ranked, compose_service=hermes-worker, mounts=/srv/whop-auto/workspace/crypto-tuber-ranked -> /app (rw)
- `hermes-whop-automation-tunnel`: state=running, image=cloudflare/cloudflared:latest, compose_project=None, compose_service=None, mounts=/home/omar/.cloudflared/hermes-whop-automation.token -> /etc/cloudflared/token (ro)

## Non-delete rules for later phases

- Never delete any path mounted by a running/restarting Docker container.
- Never delete `.env`, credential, token, cookie, DB, Docker volume, or systemd/cron referenced paths during bulk cleanup.
- Do not delete `/opt/crypto-tuber-ranked` or `/opt/callscore/secrets/youtube-cookies.txt` under any clean-kitchen phase unless a new explicit operator-approved hard gate supersedes this one.
- Any candidate under `/srv/agents/repos/crypto-tuber-ranked`, `/srv/agents/crypto-tuber-ranked`, or `apps/callscore-web` must pass unique-work classification before deletion.
