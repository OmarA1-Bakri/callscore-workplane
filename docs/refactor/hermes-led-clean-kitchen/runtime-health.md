# CK-P6 Runtime Health Receipt

Generated: 2026-06-21T18:40:24Z
Task: `t_b6cab860`
Scope: read-only runtime stabilisation investigation for `ytdlp-pot-provider` and cleanup-regression separation.

## Verdicts

| Surface | Decision | Confidence | Reason codes | Public-impact safety note |
|---|---:|---:|---|---|
| `crypto-tuber-ranked-ytdlp-pot-provider-1` | publish internal health: healthy | 0.95 | `HEALTHY_PRIMARY`, `PING_OK`, `RESTART_COUNT_ZERO` | Internal evidence only; no public scoring/ranking mutation. |
| `whop-auto-ytdlp-pot-provider-1` | review | 0.94 | `DUPLICATE_COMPOSE_PROJECT`, `HOST_PORT_4416_COLLISION`, `RESTART_LOOP_PREEXISTING` | Do not stop/remove automatically because sibling `whop-auto-*` workers are also running; route mutation through non-founder/operator review. |
| Cleanup regression claim | suppress | 0.93 | `BASELINE_ALREADY_UNHEALTHY`, `P5_NO_DELETION`, `CURRENT_ROOT_CAUSE_PORT_CONFLICT` | Do not attribute this to clean-kitchen deletion work; no deletion/mutation occurred in this run. |

## Live evidence collected

### Docker compose projects

Command: `docker compose ls`

```text
NAME                  STATUS                      CONFIG FILES
crypto-tuber-ranked   running(2)                  /opt/crypto-tuber-ranked/docker-compose.yml
oauth-mcp-gateway     running(1)                  /srv/agents/oauth-mcp-gateway/docker-compose.yml
whop-auto             restarting(1), running(2)   /opt/crypto-tuber-ranked/docker-compose.yml
```

### Project/service state

Command: `docker compose -p whop-auto -f /opt/crypto-tuber-ranked/docker-compose.yml ps` and `docker compose -p crypto-tuber-ranked -f /opt/crypto-tuber-ranked/docker-compose.yml ps`

```text
whop-auto-channel-agent-worker-1   Up 19 hours
whop-auto-hermes-worker-1          Up 19 hours
whop-auto-ytdlp-pot-provider-1     Restarting (0) ...

crypto-tuber-ranked-hermes-worker-1        Up 20 hours
crypto-tuber-ranked-ytdlp-pot-provider-1   Up 20 hours (healthy)
```

### Container inspect summary

- `whop-auto-ytdlp-pot-provider-1`
  - image: `brainicism/bgutil-ytdlp-pot-provider:1.3.1-node`
  - compose project: `whop-auto`
  - compose source: `/opt/crypto-tuber-ranked/docker-compose.yml`
  - network mode: `host`
  - restart policy: `unless-stopped`
  - restart count: `1117`
  - state: `restarting`, `Pid=0`, `ExitCode=0`, not OOM-killed
  - health: `unhealthy`
- `crypto-tuber-ranked-ytdlp-pot-provider-1`
  - image: `brainicism/bgutil-ytdlp-pot-provider:1.3.1-node`
  - compose project: `crypto-tuber-ranked`
  - compose source: `/opt/crypto-tuber-ranked/docker-compose.yml`
  - network mode: `host`
  - restart policy: `unless-stopped`
  - restart count: `0`
  - state: `running`
  - health: `healthy`

### Health endpoint

Command: read-only HTTP probe against localhost.

```text
http://127.0.0.1:4416/       -> 404
http://127.0.0.1:4416/health -> 404
http://127.0.0.1:4416/ping   -> 200 {"server_uptime":70245.558138816,"version":"1.3.1"}
```

This matches the compose healthcheck in `/opt/crypto-tuber-ranked/docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:4416/ping').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
```

### Root-cause evidence

The active compose service uses `network_mode: host`; therefore every project instance tries to bind the same host port `4416`.

Observed restart-loop log signature for the unhealthy duplicate, redacted and summarized only:

```text
Could not listen on [::]:4416 ... Error: listen EADDRINUSE: address already in use ...
Could not listen on 0.0.0.0:4416 ... Error: listen EADDRINUSE: address already in use ...
```

The healthy `crypto-tuber-ranked` provider already answers `/ping` on `127.0.0.1:4416`, so the duplicate `whop-auto` provider cannot bind the same host port.

## Cleanup-regression separation

Evidence that this was pre-existing relative to CK cleanup work:

- `receipts/refactor/hermes-led-clean-kitchen/prompt1-baseline-20260621T181500Z.json` already recorded:
  - `whop-auto-ytdlp-pot-provider-1`: `state=restarting`, `health=unhealthy`
  - `crypto-tuber-ranked-ytdlp-pot-provider-1`: `state=running`, `health=healthy`
- `receipts/refactor/hermes-led-clean-kitchen/01-runtime-routing-cleanup-receipt.json` lines 1052-1083 repeat the same split and include `preexisting_warnings`:
  - `whop-auto-ytdlp-pot-provider-1 was restarting/unhealthy in prior prompt/baseline if still observed; not caused by this cleanup unless new regression recorded`
- CK-P5 handoff states deletion performed by worker: `NO`, mutation commands executed: `0`.

Conclusion: current evidence supports a pre-existing duplicate host-port collision, not a cleanup-induced regression.

## Operational recommendation

1. Keep the `crypto-tuber-ranked` provider as the primary healthy POT provider for current production runtime.
2. Route `whop-auto` duplicate project cleanup/stabilisation to non-founder/operator review before mutation. A safe follow-up review should answer whether `whop-auto-hermes-worker-1` and `whop-auto-channel-agent-worker-1` are intentional active workers or stale duplicates before stopping/removing their companion POT provider.
3. If approved later, use exact compose-project-scoped action, not broad Docker cleanup:
   - candidate review command: `docker compose -p whop-auto -f /opt/crypto-tuber-ranked/docker-compose.yml ps`
   - candidate mutation after approval only: stop/remove or reconfigure duplicate `whop-auto` project/service.
4. Do not run `docker system prune`, remove images, or delete `/opt/crypto-tuber-ranked` while this remains an active runtime dependency.

## Safety notes

- No container stop/start/restart/remove was executed by this task.
- No env files, cookies, private keys, DB credentials, or secret-bearing files were read.
- Raw POT provider logs can contain token-like values; future receipts must use redacted summaries rather than copying raw logs.
- This receipt does not mutate public ranking, creator scoring, production DB rows, Whop, public marketing, or provider settings.
