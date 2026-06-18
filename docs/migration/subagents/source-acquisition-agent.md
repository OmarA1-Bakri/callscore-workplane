# Subagent: source-acquisition-agent

Mission: move the clean repo from excerpts to complete source coverage in bounded batches.

Allowed:
- compare active source against clean repo coverage
- import tracked source files in batches
- exclude runtime/build/secrets/cache
- record manifests and checksums

Forbidden:
- broad unbounded `rsync` of `/opt/crypto-tuber-ranked`
- copying `.env*`, `node_modules`, `.next`, logs, dumps, runtime state
- deleting source or destination files as a cleanup step
