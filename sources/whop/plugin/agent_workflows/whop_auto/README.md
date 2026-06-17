# Whop Pipeline Plugin

Personal automation for safely adopting, deploying, scaffolding, commerce-launching, and marketing Whop apps on Vercel.

The plugin is a TypeScript MCP server. It is designed for audited autonomy: local state, consent events, provider readback, sanitized planner output, and resume-safe terminal states sit in front of Whop and Vercel mutations.

## Simple Startup

From this directory:

```bash
cd agent_workflows/whop_auto
npm ci
npm run healthcheck
npm run start:mcp
```

For the Hetzner Docker runtime:

```bash
cd agent_workflows/whop_auto
docker compose -f docker-compose.hetzner.yml build whop-auto
docker compose -f docker-compose.hetzner.yml run --rm whop-auto node /app/dist/healthcheck.js
docker compose -f docker-compose.hetzner.yml run --rm whop-auto
```

Do not run the Docker MCP service with `up -d`. MCP uses stdio, so the container must stay attached to the caller.

## Hermes Runtime Requirement

The successful production automation path is Hermes-first:

- The Hetzner VM must stay online.
- Docker and Docker Compose must run on the Hetzner VM.
- The Whop plugin checkout must exist on the Hetzner VM.
- Runtime state, target repos, and secrets must live on the Hetzner VM.
- The desktop must not be required for startup, healthcheck, MCP execution, target repo access, event logs, registry state, or provider credentials.

The desktop is allowed for development, review, and pushing code to GitHub. It is not part of the production runtime.

Recommended Hermes layout:

```text
/srv/whop-auto/
  plugin/      # git checkout containing agent_workflows/whop_auto
  state/       # durable automation state
  workspace/   # target app repos mounted into /workspace
  secrets/     # Docker secret source files, never committed
```

Hermes startup from the VM:

```bash
cd /srv/whop-auto/plugin/agent_workflows/whop_auto
cp hetzner.env.example .env.hetzner
mkdir -p /srv/whop-auto/state /srv/whop-auto/workspace /srv/whop-auto/secrets
id -u omar
id -g omar
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml build whop-auto
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto node /app/dist/healthcheck.js
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto
```

Set `WHOP_AUTO_UID` and `WHOP_AUTO_GID` in `.env.hetzner` to the values reported by `id -u omar` and `id -g omar`. The `.env.hetzner` file is VM-local deployment config and must stay out of git.


## CallScore canonical production note (2026-06-15)

For CallScore, this Whop Auto workspace is a governed commerce/entitlement automation surface, not the CallScore app source of truth. The CallScore app repo is `/opt/crypto-tuber-ranked`, production hosting is Netlify, and production data source is local HH PostgreSQL plus HH Read API. Stale Vercel or Neon assumptions in older Whop Auto docs are not CallScore production evidence.

Before any CallScore Whop/provider/customer/payment/pricing mutation, load `/opt/crypto-tuber-ranked/docs/ops/callscore-gtm-agent-registry.json` and require manifest, diff, rollback path, approval receipt, local auth, explicit safe classification, `FINANCIAL_GATE`, `PRODUCTION_GATE`, and `SECRET_GATE`. Read-only provider health, manifest diff, entitlement dry-run, webhook safe replay, and activation review remain allowed.

## What This Automates

Current local MCP entrypoints:

- `status.collect`: read-only status report for a target repo.
- `whop.adopt`: bind an existing repo to existing Whop and Vercel resources.
- `whop.deploy`: push the current branch, wait for Vercel, promote production, and update Whop iframe state when consent allows it.
- `whop.reconcile`: repair safe local manifest/registry drift without mutating providers.
- `whop.scaffold`: create infrastructure for a new Whop app and Vercel project under audited consent.
- `whop.commerceLaunch`: create a hidden-first product, plan, checkout, optional promo chain, then require separate publish consent.
- `whop.market`: draft-only sanitized marketing planner. It performs no provider writes.

Installed skill folders currently include:

- `skills/whop-adopt`
- `skills/whop-deploy`
- `skills/whop-market`

The scaffold and commerce-launch entrypoints exist at the MCP layer; expose them through skills only after their operator prompts are written and validated.

## Runtime Modes

The same server runs in two modes.

Desktop mode:

- Uses the OS keychain through `@napi-rs/keyring`.
- Stores event logs and registry under `~/.whop-pipeline`.
- Starts with `npm run start:mcp`.

Container mode:

- Activated when `WHOP_PIPELINE_SECRET_DIR` is set.
- Uses file-backed secrets under `/var/lib/whop-pipeline/secrets`.
- Can read bootstrap secrets from `/run/secrets`.
- Stores durable state under `/var/lib/whop-pipeline`.
- Runs as a non-root Linux user in the Docker image.

## Prerequisites

- Node.js 20 or newer. The Docker image pins Node `20.11.1`.
- npm.
- Git.
- For local verification: platform-local `node_modules`. Do not reuse Windows-installed `node_modules` inside WSL.
- For Docker: a working Docker daemon on the target host.
- Whop Company API key with the required developer/company scopes.
- Vercel token for the target team.
- Vercel GitHub App installed on the GitHub owner that hosts the app repo.

Before live infrastructure work, update `bin/whop-state-mcp/src/config.ts`:

```ts
vercelTeamSlug: "INSTALL_CONFIG"
```

Replace `INSTALL_CONFIG` with the intended Vercel team slug.

## Credentials

Credential values must not be committed, printed, or baked into Docker images.

Required logical secret paths:

- `whop/__company__/api-key`
- `vercel/__team__/token`

Desktop mode reads those from the OS keychain.

Container mode reads the same logical paths from encoded secret filenames. The current Docker Compose file expects:

- `docker/secrets/d2hvcC9fX2NvbXBhbnlfXy9hcGkta2V5.secret`
- `docker/secrets/dmVyY2VsL19fdGVhbV9fL3Rva2Vu.secret`

Those files are local deployment material and must stay out of git.

## Local Development Commands

Install dependencies:

```bash
npm ci
```

Run the healthcheck:

```bash
npm run healthcheck
```

Run the MCP server over stdio:

```bash
npm run start:mcp
```

Typecheck:

```bash
npm exec -- tsc --noEmit
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Check production dependency advisories:

```bash
npm audit --omit=dev
```

Full local verification gate:

```bash
npm exec -- tsc --noEmit
npm run build
npm test
npm audit --omit=dev
```

## Docker And Hetzner Commands

All commands in this section are intended to run on the Hetzner VM from `/srv/whop-auto/plugin/agent_workflows/whop_auto`, not from the desktop.

Prepare VM-owned directories:

```bash
mkdir -p /srv/whop-auto/state /srv/whop-auto/workspace /srv/whop-auto/secrets
```

Build the image:

```bash
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml build whop-auto
```

Run the container healthcheck:

```bash
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto node /app/dist/healthcheck.js
```

Start the MCP server attached to stdio:

```bash
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto
```

Inspect Docker-managed volumes:

```bash
docker volume ls | grep whop
```

Run a one-off shell inside the runtime image:

```bash
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto sh
```

The compose file intentionally does not publish ports. Outbound network access is required for live Whop and Vercel operations, but MCP itself must not be exposed publicly.

## Claude/Codex MCP Configuration

Local `.mcp.json`:

```json
{
  "mcpServers": {
    "whop-state": {
      "command": "node",
      "args": ["--import", "tsx", "./bin/whop-state-mcp/src/index.ts"]
    },
    "whop": {
      "url": "https://mcp.whop.com/sse"
    },
    "vercel": {
      "url": "https://mcp.vercel.com/sse"
    }
  }
}
```

Production autonomy should use the local `whop-state` tools for audited workflows. Direct Whop and Vercel MCP endpoints are useful for manual research, but they do not replace local consent, event logging, sanitization, and resume protection.

For Docker/Hermes, point the MCP command at the attached compose run:

```bash
cd /srv/whop-auto/plugin/agent_workflows/whop_auto
docker compose --env-file .env.hetzner -f docker-compose.hetzner.yml run --rm -T whop-auto
```

## Recommended Operating Order

1. Run `status.collect` against the target repo.
2. If the repo already has Whop/Vercel resources, use `whop.adopt`.
3. If local state drift exists, use `whop.reconcile`.
4. For existing adopted apps, use `whop.deploy`.
5. For new infrastructure from zero, use `whop.scaffold`.
6. For selling setup, use `whop.commerceLaunch`.
7. For marketing planning, use `whop.market`.

Do not call the suite "full Whop operation" until infrastructure, commerce, and core operations are all implemented and verified. The current `whop.market` entrypoint is draft-only and intentionally blocks live publish/send/spend/create/update/delete actions.

## Safety Model

The plugin is built around these invariants:

- Append audit events before remote mutation.
- Require exact consent for public-visible, billed/financial, credential, destructive, and remote-create/update actions.
- Re-read provider state after mutation before reporting success.
- Use payload hashes for sensitive inputs instead of raw sales copy, URLs, promo codes, affiliate codes, customer data, provider errors, or SDK request/response bodies.
- Stop on ambiguous targets, payload changes, owner mismatch, missing observed proof, or unknown remote outcome.
- Keep destructive cleanup and high-risk finance/admin surfaces blocked unless a later spec explicitly gates them.

## Marketing Mode

`whop.market` creates sanitized drafts only. It can plan:

- checkout attribution
- promo strategy
- affiliate/referral strategy
- marketplace positioning
- visibility, waitlist, and pricing rollout

Planner-facing input and output must use IDs, enums, numeric prices, counts, timestamps, and `sha256:<64 hex>` hashes. Raw checkout URLs, redirect URLs, promo codes, affiliate codes, sales copy, reviews, support text, forum text, customer names, customer emails, media URLs, provider errors, and SDK bodies must not enter planner or critic context.

If a live marketing action is requested, `whop.market` returns `blocked-by-policy`.

## State And Logs

Desktop paths:

- Event logs: `~/.whop-pipeline/events/<runId>.jsonl`
- Registry: `~/.whop-pipeline/registry.json`
- Target repo manifest: `<target-repo>/.whop-pipeline.json`

Container paths:

- Durable state: `/var/lib/whop-pipeline`
- Secret store: `/var/lib/whop-pipeline/secrets`
- Bootstrap secrets: `/run/secrets`
- Workspace mount: `/workspace`

Hetzner host paths:

- Checkout: `/srv/whop-auto/plugin`
- Durable state: `/srv/whop-auto/state`
- Target repo workspace: `/srv/whop-auto/workspace`
- Secret source files: `/srv/whop-auto/secrets`

If these paths are missing or point to desktop-mounted storage, the deployment is not production-ready.

## First Run For An Existing App

1. Rotate any previously exposed Whop Company API key in the Whop dashboard.
2. Store the rotated Whop key at `whop/__company__/api-key`.
3. Store the Vercel token at `vercel/__team__/token`.
4. Verify the Vercel GitHub App is installed for the GitHub owner.
5. Replace `INSTALL_CONFIG` in `bin/whop-state-mcp/src/config.ts`.
6. Start the MCP server.
7. Run `status.collect` for the target repo.
8. Run `whop.adopt` with exact target IDs when available.
9. Run `whop.deploy` only after status/adopt is clean and the intended production domain is known.

## Troubleshooting

Healthcheck fails on credentials:

- Confirm the OS keychain paths in desktop mode.
- Confirm the encoded files exist under `docker/secrets` in Docker mode.
- Confirm Docker Compose mounts the secrets into `/run/secrets`.

`npm test` fails with an esbuild platform error:

- You are likely using `node_modules` installed from another OS, commonly Windows modules inside WSL.
- Remove/reinstall dependencies in the same shell/runtime that runs tests.
- Use `npm ci` from the target shell or run tests in Docker.

Docker `_ping` returns `500`:

- The local Docker daemon is unhealthy.
- Re-run Docker build and container health verification on a healthy local daemon or on the Hetzner instance.

MCP server exits immediately in Docker:

- Use `docker compose run --rm whop-auto`, not `docker compose up -d`.
- The server expects an attached stdio client.

Missing Vercel team configuration:

- Replace `INSTALL_CONFIG` in `bin/whop-state-mcp/src/config.ts`.
- Do not rely on a partially configured install for deploy/scaffold flows.

Live API operations fail:

- Run `status.collect` first.
- Check credentials and target ownership.
- Inspect the relevant event log by run ID.
- Do not retry blindly if the terminal state is `unknown-remote-state`, `payload-changed`, `ambiguous-target`, or `blocked-by-policy`.

## Reference Specs

- `docs/superpowers/specs/2026-04-22-whop-pipeline-plugin-design-rev5.md`
- `docs/superpowers/specs/2026-05-02-whop-agentic-autonomy-prd.md`
- `docs/superpowers/specs/2026-05-02-whop-agentic-autonomy-mcp-tool-contracts.md`
- `docs/superpowers/specs/2026-05-02-whop-agentic-autonomy-consent-risk-policy.md`
- `docs/superpowers/specs/2026-05-03-whop-autonomy-master-roadmap.md`
- `docs/superpowers/specs/2026-05-03-whop-commerce-launch-prd.md`
