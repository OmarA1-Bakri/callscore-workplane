# Systemd restore plan

Status: skeleton generated; inventory must be completed from HHVM before replacement.

Policy:
- Do not restart or modify current services during inventory.
- Record unit file, environment file references, working directory, exec command, dependencies, timers, ports, and verify command.
- Raw env files belong in `protected/env-vault`, not Git.

Required units to inventory:
- `callscore-daily-pipeline.service`
- `callscore-daily-pipeline.timer`
- `callscore-enqueue.service`
- `callscore-read-api.service`
- `hh-control-bridge.service`
- `hermes-worker.service`
- `agent-snapshot.service`
- `agent-snapshot.timer`
