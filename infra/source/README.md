# Hermes Macro Environment (hermes-infra)

This repository defines the canonical, version-controlled infrastructure for the `hermes-agent-box` Hetzner server and all managed services.

## Status: WIP — BLOCKED

**Do not deploy yet.** This skeleton is staged while the Workplane Docker migration (parallel agent) completes. Once that work merges, this repo will absorb the new container definitions and become the single source of truth for all environment state.

## Layout

```
environments/hermes-agent-box/
  docker-compose.yml       # Server-level orchestration
  .env.template            # Required env vars (no secrets)
  setup.sh / teardown.sh   # One-command bootstrap / destroy
  manifests/               # apt, pip, systemd manifests

services/
  library/                 # assets catalog + cron backups
  composio/                # secret manager gateway
  ollama/                  # LLM inference service
  cloudflared/             # tunnel ingress

scripts/
  bootstrap.sh             # Zero to running agent (future)
  backup.sh                # Periodic backups
  sync-library.sh          # Refresh catalog from canonical source

manifests/
  crontab.txt              # Canonical cron schedule
  apt-packages.txt         # System dependencies
  systemd/                 # Service unit files
```

## Design Principles

- One repo = one environment state
- Secrets live in Composio only; `.env.*` files are never committed
- All paths are absolute and machine-agnostic under `/srv/agents/`
- Services are Dockerized where possible; host binaries managed by manifests

## Usage (Future)

```bash
cd /srv/agents/infra
./scripts/bootstrap.sh        # Idempotent setup
./services/library/compose up -d
```

## Backup & Migration

The entire `/srv/agents/infra` directory plus `/srv/agents/library` and `~/.hermes/config.yaml` constitute a portable environment. Restore on a fresh machine:

1. Clone this repo to `/srv/agents/infra`
2. Run `./scripts/bootstrap.sh`
3. Populate Composio workspace secrets
4. `docker compose up -d`

## Contact
Omar Al-Bakri — omar@thegent.uk
