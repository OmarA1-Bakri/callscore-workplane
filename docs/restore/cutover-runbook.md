# CallScore controlled-full cutover and rollback runbook

Status: completed plan on 20260618T081339Z. This is a no-op production cutover because live HH already passes the operational gates; no restart, deployment, DB write, provider/payment mutation, or public send is required.

Evidence:

- Backup proof: `/srv/agents/repos/callscore-workplane/docs/migration/receipts/backup-proof-20260618T080540Z.json`
- Inventory receipt: `/srv/agents/repos/callscore-workplane/docs/migration/receipts/full-operation-inventory-20260618T081229Z.json`
- Restore rehearsal: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/restore-rehearsal.json`
- Application validation: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-app-validation.json`
- PostgreSQL inventory: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-postgres-inventory.json`
- Systemd inventory: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-systemd-inventory.json`
- Docker inventory: `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-docker-summary.json`

## Cutover decision

Current HH/CallScore state is treated as canonical when all of these pass:

1. Hetzner snapshot `398616103` is available and delete-protected.
2. Restore rehearsal passes env-vault, systemd, Docker compose, PostgreSQL schema, and no-D-write checks.
3. `npm run workplane:status` exits 0.
4. `npm run freshness:check` exits 0.
5. `npm run audit:pipeline -- --summary --allow-partial-shadow` exits 0.
6. `npm run verify:public` exits 0.
7. `npm run verify:public -- --source live --base-url https://call-score.com` exits 0.
8. GTM registry JSON validation and test suite exit 0.
9. Core services and containers are active/running according to `service-ledger.yaml`.

## Rollback triggers

- `call-score.com` live public verify fails.
- HH Read API health fails or source is not `hh_read_api`.
- Workplane status exits nonzero or loses OK/CONTROLLED_FULL-equivalent readiness.
- `callscore-read-api.service` or `callscore-enqueue.service` becomes inactive/failed.
- `crypto-tuber-ranked-hermes-worker-1` stops unexpectedly.
- PostgreSQL read-only probe fails or core row counts unexpectedly zero.
- Trackable secret scan finds live secret material.
- Operator issues STOP or rollback instruction.

## Rollback sequence

1. Stop new autonomous mutations/actions immediately.
2. Do not write to D:; use D only as receipt/evidence source.
3. For host-level rollback, restore/rebuild from Hetzner snapshot `398616103`.
4. For repo-only issues, revert latest CallScore/workplane commits rather than touching the host snapshot.
5. Restore env files from protected env vault or snapshot; verify SHA-256; never print values.
6. Start/enable services according to `ledgers/service-ledger.yaml` only after verification.
7. Re-run public verify, Workplane status, DB read-only row probes, and GTM registry tests before reopening autonomous lanes.
