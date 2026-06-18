# PostgreSQL backup and restore plan

Status: completed read-only live inventory and schema rehearsal on 20260618T081229Z. No production DB writes, migrations, backfills, or raw data dumps were performed.

Evidence:
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/live-postgres-inventory.json`
- `/srv/agents/repos/callscore-workplane/ledgers/run-20260618T080641Z/restore-rehearsal.json`

## Live database inventory

- Database: `callscore`
- Engine: `PostgreSQL 16.14 (Ubuntu 16.14-1.pgdg24.04+1) on aarch64-unknown-linux-gnu`
- Extensions: `plpgsql`
- Schema source: `schema.sql` plus `21` ordered files under `migrations/`.
- Exact row probes performed in `BEGIN READ ONLY` transaction.

Exact row counts captured:

- `creators`: 197
- `videos`: 16371
- `candles`: 35631855
- `pipeline_runs`: 439
- `pipeline_jobs`: 430
- `pipeline_job_events`: 2571
- `watchlists`: 0

## Rehearsal result

- `pg_dump --schema-only --schema=public --no-owner --no-privileges` succeeded.
- Temporary schema file contained `CREATE TABLE` statements.
- Temporary schema file contained no `COPY` or `INSERT` data rows.
- Temporary schema file was removed after verification.
- Raw production data dump was not written to Git.

## Restore sequence

1. Before any production cutover, create a fresh external raw dump outside Git using a secrets-safe shell with `DATABASE_URL` sourced but not printed.
2. Verify dump integrity with `pg_restore --list` for custom dumps or `psql --single-transaction --set ON_ERROR_STOP=on` against an isolated staging database.
3. Restore schema/migrations first, then data, then indexes/constraints if using split dumps.
4. Verify row counts for `creators`, `videos`, `candles`, `pipeline_runs`, `pipeline_jobs`, and `pipeline_job_events`.
5. Verify HH Read API and live public surface before declaring cutover complete.
6. Keep snapshot `398616103` as rollback anchor during the rollback window.
