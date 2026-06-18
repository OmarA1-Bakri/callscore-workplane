# Systemd restore plan

Status: completed from live HH read-only inventory on 20260618T081229Z. No services were restarted or modified.

Evidence:
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-systemd-inventory.json`
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/restore-rehearsal.json`

## Inventory

| Unit | Live state | Unit-file state | Unit file | Working directory |
|---|---:|---:|---|---|
| `callscore-daily-pipeline.service` | inactive/dead | static | `/etc/systemd/system/callscore-daily-pipeline.service` | `/opt/crypto-tuber-ranked` |
| `callscore-daily-pipeline.timer` | active/waiting | enabled | `/etc/systemd/system/callscore-daily-pipeline.timer` | `` |
| `callscore-enqueue.service` | active/running | enabled | `/etc/systemd/system/callscore-enqueue.service` | `/opt/crypto-tuber-ranked` |
| `callscore-read-api.service` | active/running | enabled | `/etc/systemd/system/callscore-read-api.service` | `/opt/crypto-tuber-ranked` |
| `hh-control-bridge.service` | active/running | enabled | `/etc/systemd/system/hh-control-bridge.service` | `/srv` |
| `hermes-worker.service` | active/exited | enabled | `/etc/systemd/system/hermes-worker.service` | `/opt/crypto-tuber-ranked` |
| `agent-snapshot.service` | inactive/dead | static | `/etc/systemd/system/agent-snapshot.service` | `` |
| `agent-snapshot.timer` | active/waiting | enabled | `/etc/systemd/system/agent-snapshot.timer` | `` |

## Restore sequence

1. Restore repository/application files before enabling services.
2. Restore env files from `protected/env-vault/files/` to the exact absolute paths in the manifest; preserve mode/owner/group where practical.
3. Install unit files from `/etc/systemd/system/*.service` / `*.timer` equivalents using the inventory above as source of truth.
4. Run `sudo systemd-analyze verify <unit>` for each required unit before any start/enable.
5. Run `sudo systemctl daemon-reload` only after unit files are in place.
6. Enable timers/services according to the inventory above.
7. Start long-running services in dependency order: `callscore-read-api.service`, `callscore-enqueue.service`, `hh-control-bridge.service`, Docker-backed `hermes-worker.service`, then timers.
8. Verify using `systemctl is-active`, `systemctl list-timers`, `ss -ltnp`, and CallScore public/Workplane checks.

## Rehearsal result

`sudo -n systemd-analyze verify` passed for all required units in staging/read-only rehearsal. The command did not restart or mutate live services.
