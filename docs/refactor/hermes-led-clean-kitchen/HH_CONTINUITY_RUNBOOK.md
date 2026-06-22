# HH Continuity Runbook

Generated: 2026-06-22T17:40:44Z

## Inspect VM health

```bash
hostname; whoami; uptime; df -h /; df -i /; free -h
```

## Inspect Docker health

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
python3 - <<'PY'
import http.client
c=http.client.HTTPConnection('localhost',4416,timeout=5); c.request('GET','/ping'); r=c.getresponse(); print(r.status, r.reason); c.close()
PY
```

## Inspect scheduler health

```bash
HERMES_HOME=/srv/agents/hermes hermes cron list
ls -lah /srv/agents/hermes/cron/output | tail
```

## Inspect DB read-only through worker container

```bash
docker exec crypto-tuber-ranked-hermes-worker-1 sh -lc 'cd /app && node --import tsx -e "const db=(await import(\"./src/lib/db.ts\")).default; const rows=await db.query(\"select (select count(*) from videos)::text as videos, (select count(*) from pipeline_jobs)::text as pipeline_jobs\"); console.log(JSON.stringify(rows[0])); await db.closeDatabasePoolForTests();"'
```

## Inspect repo dirty state

```bash
cd /opt/crypto-tuber-ranked && git status --short
cd /srv/agents/repos/callscore-workplane && git status --short
```

## Inspect receipts

```bash
ls -lah /srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen | tail
cat /srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/observability/receipt-index.json | head
```

## Check Netlify direct backup route

Read: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/netlify-direct-backup-exception.md` and `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/netlify-route-hardening-report.md`. Netlify direct API remains approved only for website-hosting recovery/backup.

## Check Composio MCP reachability

```bash
HERMES_HOME=/srv/agents/hermes hermes mcp test composio
```

## What not to touch

- Secrets/cookies/env values.
- Docker volumes and DB state.
- Active compose without backup/test.
- Active runtime source without git plan.
- Blacklisted `/srv/agents/repos/Claude_Code_Automations`.

## Emergency halt conditions

Disk/inodes >=95%, active container crash after deletion, protected cookie/compose inaccessible to runtime, unexpected broad deletion, secret printed, production API/worker unreachable, or uncertainty over active/protected path.

## Canonical docs

- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/master-state.json`
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/FINAL_VERIFICATION_REPORT.md`
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/FINAL_CLEAN_KITCHEN_HANDOVER.md`
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/FINAL_DELETION_REPORT.md`
- `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/NEXT_ACTIONS.md`
