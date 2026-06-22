# Final Verification Report

Generated: 2026-06-22T17:40:44Z

## Disk / inode

- Initial used bytes: `131593781248`
- Current used bytes: `89237012480`
- Disk-level recovered bytes: `42356768768`
- Current disk: `58.0% used`, `65133940736` bytes free
- Current inode use: `16.0%`

## Verification checklist

| Check | Status | Evidence |
|---|---|---|
| Repo routing matrix is current | PASS | repo-routing-matrix.json and canonical-code-map.json exist; final runtime map restated here. |
| /opt/crypto-tuber-ranked classification is correct | PASS | ACTIVE_RUNTIME_DEPENDENCY / canonical runtime repo. |
| /opt/callscore/secrets protected | PASS | Exists; protected; no secret content read. |
| youtube-cookies.txt readable/runtime usable | PASS_WITH_NOTE | Host user omar cannot read root:root 600 file; runtime workers mount it read-only and ytdlp provider ping is 200 OK. |
| Active containers mapped | PASS | Docker compose labels and mounts checked. |
| Duplicate Docker service conflict fixed/blocked | PASS | Single healthy crypto-tuber-ranked-ytdlp-pot-provider-1; duplicate conflict resolved earlier. |
| Agent workplanes exist/specified | PASS | 16 agent workplanes with SOUL/TOOLS/HEARTBEAT/GATES/RECEIPTS/MANIFEST. |
| Observability contracts exist | PASS | observability/*.json contracts exist. |
| Receipts durable or indexed | PASS | receipt-index exists; receipt root durable under workplane. |
| Third-party routing matrix exists | PASS | provider/composio route docs and matrices exist. |
| Netlify direct backup exception documented | PASS | netlify-direct-backup-exception.md exists. |
| Whop runtime vs automation documented | PASS | whop-runtime-direct-exception.md and Whop route hardening reports exist. |
| Gemma transcript pipeline map exists | PASS | Prompt 8 deliverables exist and tests passed 26/26. |
| Prompt dedupe reduced clutter or blockers clear | PASS_WITH_BLOCKERS | 294 stopped-profile duplicate skill dirs symlinked; active CMO duplicates and drift preserved. |
| Framework plan exists | PASS | Prompt 10 deliverables complete. |
| All deletions have receipts | PASS | master-state tracks 59 deleted paths with receipts. |
| Disk usage improved | PASS | Prompt1 baseline used 131593781248 bytes; current used 89237012480 bytes; delta 42356768768 bytes. |
| Inode usage safe | PASS | Current inode use 16.0%. |
| No secrets printed | PASS | Final verification did not print secret values; earlier accidental config line remains not reproduced. |
| No protected paths deleted | PASS | Protected secrets, active compose, Docker volumes/DB preserved. |
| Local block image backup untouched if visible | PASS_WITH_NOTE | /mnt/d/CallScore-VM-backups not visible from HH; no action attempted there. |
| If backup path not visible, record no modification attempted | PASS | Recorded in final report and receipt. |

## Runtime map

```json
{
  "canonical_runtime_repo": "/opt/crypto-tuber-ranked",
  "canonical_compose": "/opt/crypto-tuber-ranked/docker-compose.yml",
  "control_workplane_repo": "/srv/agents/repos/callscore-workplane",
  "receipts_root": "/srv/agents/repos/callscore-workplane/receipts/",
  "clean_kitchen_docs": "/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/",
  "protected_secrets_root": "/opt/callscore/secrets",
  "youtube_cookie": "/opt/callscore/secrets/youtube-cookies.txt root:root 600; mounted read-only into active Hermes workers",
  "containers": [
    {
      "name": "whop-auto-hermes-worker-1",
      "project": "whop-auto",
      "service": "hermes-worker",
      "status": "running",
      "cookie_mount": "/opt/callscore/secrets/youtube-cookies.txt -> /run/secrets/youtube-cookies.txt readonly=true"
    },
    {
      "name": "whop-auto-channel-agent-worker-1",
      "project": "whop-auto",
      "service": "channel-agent-worker",
      "status": "running"
    },
    {
      "name": "crypto-tuber-ranked-hermes-worker-1",
      "project": "crypto-tuber-ranked",
      "service": "hermes-worker",
      "status": "running",
      "cookie_mount": "/opt/callscore/secrets/youtube-cookies.txt -> /run/secrets/youtube-cookies.txt readonly=true"
    },
    {
      "name": "crypto-tuber-ranked-ytdlp-pot-provider-1",
      "project": "crypto-tuber-ranked",
      "service": "ytdlp-pot-provider",
      "status": "running healthy"
    },
    {
      "name": "hh-oauth-mcp-gateway",
      "status": "running"
    },
    {
      "name": "hermes-whop-automation-tunnel",
      "status": "running"
    }
  ],
  "db_readonly_check": {
    "videos": "16861",
    "pipeline_jobs": "909"
  },
  "agents": "16 full canonical agents manifested with heartbeat proof",
  "profiles": "8 full canonical profiles manifested",
  "composio": "Hermes MCP Composio connected; 7 tools discovered",
  "netlify_exception": "documented direct backup exception",
  "whop_exception": "runtime auth/webhook/entitlement direct exception documented; automation uses Composio"
}
```
