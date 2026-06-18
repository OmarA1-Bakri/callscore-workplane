# CallScore replacement readiness report

Generated: 2026-06-18T06:32:57Z run packet

## Scope

This report records the evidence produced from `callscore-mcp-subagent-migration-pack` for the clean CallScore workplane repository at `/srv/agents/repos/callscore-workplane`.

Source packet copied from Omar bare-metal machine over Tailscale:

- `C:\Users\albak\Downloads\callscore-mcp-subagent-migration-pack.tgz`
- `C:\Users\albak\Downloads\callscore-mcp-subagent-migration-pack.tgz.sha256`
- `C:\Users\albak\Downloads\callscore-agentic-workplane-full-system (2).html`

SHA-256 verification passed:

- `736d9a9e2874d95ccbe29d5edf27cff0f0c64f106d459b13fdacab35576b85c1  callscore-mcp-subagent-migration-pack.tgz`

## Evidence ledger

Primary run directory:

- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/`

Core evidence:

- `first-command-packet-wrapper.log` — bootstrap + MCP artifact discovery + MCP graph extraction + space preflight + protected-domain manifest.
- `remaining-command-packet-wrapper-2.log` — env vault, product import, control component import, restore docs.
- `remediation-rerun-wrapper.log` — corrected scoped env vault preservation and patched control component import.
- `final-coverage-checks.log` — final product/control coverage proofs.
- `validation-final.log` — final validation and secret scan after evidence normalization and credential sanitization.

Stable ledgers:

- `/srv/agents/repos/callscore-workplane/ledgers/migration-index.json`
- `/srv/agents/repos/callscore-workplane/ledgers/mcp-ledger.yaml`
- `/srv/agents/repos/callscore-workplane/ledgers/codebase-memory-artifacts.yaml`
- `/srv/agents/repos/callscore-workplane/ledgers/service-ledger.yaml`
- `/srv/agents/repos/callscore-workplane/ledgers/verification-ledger.yaml`

## Completed boxes

The following migration-index boxes are complete with evidence:

- `baseline_locked`
- `mcp_artifacts_discovered`
- `mcp_graph_ledgers_extracted`
- `existing_ledgers_loaded`
- `subagent_board_active`
- `space_budget_recorded`
- `protected_domains_manifested`
- `env_vault_dry_run_complete`
- `env_vault_apply_complete`
- `product_source_gap_reported`
- `product_source_batch_imported`
- `control_components_gap_reported`
- `control_components_batch_imported`
- `restore_docs_created`
- `db_restore_plan_created`
- `validation_suite_passed`
- `secret_scan_passed`
- `replacement_readiness_report_complete`

## Final coverage proof

From `final-coverage-checks.log`:

- Product tracked-source coverage: `product_missing_count=0`.
- Product hash mismatches: `product_changed_or_hash_mismatch_count=0`.
- Control component destination coverage: `control_missing_destination_count=0` across 8 components.

## Validation proof

From `validation-final.log`:

- Ledger/metadata JSON files checked: 23.
- JSON errors: 0.
- Migration-index boxes complete: 18/18.
- Canonical import evidence active for product/control gap and import boxes: yes.
- Durable codebase-memory CLI evidence: 1 project, 30,293 nodes, 76,064 edges.
- Raw env vault files present locally: 96.
- Raw env vault files tracked by Git: 0.
- Raw env vault files unignored by Git: 0.
- Forbidden runtime/vendor dirs present after remediation: none.
- Trackable new files scanned for secret candidates: 2,765.
- Secret findings: 0.

## Codebase-memory MCP / CLI use

- Existing codebase-memory MCP artifacts consumed from `/srv/agents/system-index/codebase-memory/callscore-index-20260617T101728Z`.
- Extracted three SQLite graph DB ledgers:
  - `opt-crypto-tuber-ranked.db`
  - `srv-agents-repos-Claude_Code_Automations.db`
  - `srv-whop-auto-plugin.db`
- `codebase-memory-mcp` CLI verified at `/home/omar/.local/bin/codebase-memory-mcp`, version `0.8.1`.
- Durable CLI evidence was regenerated under `/srv/agents/system-index/codebase-memory/callscore-workplane-cli-20260618T063257Z` and persisted into:
  - `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-index.log`
  - `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-projects.json`
  - `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T063257Z/codebase-memory-cli-architecture.json`
- The durable CLI architecture evidence reports 30,293 nodes and 76,064 edges for `/srv/agents/repos/callscore-workplane` after product/control imports.

## Corrective notes

Two packet-script defects were found and handled during execution:

1. `05_env_vault_preserve_space_gated.py` default roots could rediscover the clean repo's own `protected/env-vault/files` tree when scanning broad `/srv/agents`. The failed partial raw vault copy was removed only from the generated ignored vault destination, then preservation was rerun with scoped roots and skip guards. Final raw vault count is 96 and ignored from Git.
2. `09_control_components_batch_import.sh` did not exclude `.venv`, causing a generated virtualenv copy under `control-plane/hh-control-bridge/.venv`. That generated untracked destination was removed, the script was patched to skip `.venv`/`venv`/`.tox`, and the control import was rerun. Final forbidden runtime dir check passed.
3. The imported `data-plane/transcript-acquisition/vpn-ytdlp/docker-compose.yml` initially contained literal OpenVPN values from the source restore component. The clean workplane copy was sanitized to require `OPENVPN_USER` and `OPENVPN_PASSWORD` from the restored env vault instead of embedding values in Git-trackable YAML.

No production repo source, providers, D-drive/H-drive, services, timers, database, or deployments were mutated.

## Remaining gates before replacement cutover

The clean workplane now has source/control coverage and restore skeletons, but replacement cutover remains gated. Before any actual replacement, require:

1. Operator approval for exact cutover target and rollback window.
2. Full restore rehearsal plan execution in staging, especially PostgreSQL backup/restore.
3. Service ledger completion from live HHVM inventory without restarting services.
4. Three-agent validation of this evidence pack and any follow-up remediation.
5. Commit review to ensure only intended trackable files are staged; raw env vault files must remain ignored.
