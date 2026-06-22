# Prompt 3.5 ytdlp Singleton Provider Guard

Run: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T200540Z-prompt35-ytdlp-singleton-guard`

## Implemented option

Option B — whop-auto-specific wrapper script, plus canonical docs/test coverage.

Created:

- `/opt/crypto-tuber-ranked/scripts/start-whop-auto-workers.sh`
- `/opt/crypto-tuber-ranked/docs/ops/ytdlp-singleton-provider.md`
- `/opt/crypto-tuber-ranked/tests/ytdlp-singleton-wrapper.test.ts`

The wrapper does not run `docker compose down`, does not restart the stack, and does not stop healthy workers.

Safe command embedded by wrapper:

```bash
docker compose -f /opt/crypto-tuber-ranked/docker-compose.yml -p whop-auto up -d --no-deps --no-recreate hermes-worker channel-agent-worker
```

`--no-deps` is required because the shared compose file contains `depends_on: ytdlp-pot-provider` for workers. `--no-recreate` is required to avoid stopping/recreating already-running healthy whop-auto workers.

## Verification commands

- `bash -n /opt/crypto-tuber-ranked/scripts/start-whop-auto-workers.sh` => rc `0`
- `node --import tsx --test /opt/crypto-tuber-ranked/tests/ytdlp-singleton-wrapper.test.ts` => rc `0`
- `/opt/crypto-tuber-ranked/scripts/start-whop-auto-workers.sh --check` => rc `0`
- `/opt/crypto-tuber-ranked/scripts/start-whop-auto-workers.sh --print-command` => rc `0`
- `docker compose -f /opt/crypto-tuber-ranked/docker-compose.yml config --services` => rc `0`

## Post checks

- `whop_auto_ytdlp_absent`: `True`
- `crypto_provider_running_healthy`: `True`
- `ping_4416_http_200`: `True`
- `whop_auto_hermes_worker_running`: `True`
- `whop_auto_channel_agent_worker_running`: `True`
- `crypto_hermes_worker_running`: `True`
- `no_new_restart_loops`: `True`
- `protected_paths_exist`: `True`
- `disk_inodes_safe`: `True`
- `master_state_updated`: `False`
- `wrapper_exists_executable`: `True`
- `wrapper_syntax_ok`: `True`
- `wrapper_test_passed`: `True`
- `wrapper_check_mode_passed`: `True`
- `wrapper_print_command_safe`: `True`
- `compose_config_services_dry_run_ok`: `True`
- `raw_discovery_artifacts_redacted`: `True`
- `legacy_capture_artifacts_redacted`: `True`

## Security remediation

Prompt 3.5 emergency log `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/EMERGENCY_HALT_20260621T202048Z.json` records that raw route discovery initially captured secret-bearing `.env.hermes` lines. Affected artifacts were redacted in place without printing secret values; final receipt reports no remaining raw `SESSION_SECRET` assignments in the clean-kitchen docs or Prompt 3.5 run artifacts.
- `all_success_pre_state_update`: `True`
