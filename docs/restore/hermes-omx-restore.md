# Hermes/OMX restore plan

Status: completed manifest-backed plan on 20260618T081229Z; raw protected roots are restored from the full Hetzner snapshot when needed, with metadata manifests in Git.

Evidence:
- `protected/hermes-vault/metadata/hermes-omx-manifest-20260618T063257Z.json`
- `protected/omx-vault/metadata/hermes-omx-manifest-20260618T063257Z.json`
- `/srv/agents/repos/callscore-workplane/docs/migration/receipts/backup-proof-20260618T080540Z.json

## Protected roots

- `/srv/agents/hermes`
- `/home/omar/.hermes`
- `/srv/agents/interop/omx-inbox`
- `/srv/agents/repos/.omx`
- `/srv/agents/repos/Claude_Code_Automations/workplane/.omx`
- `/opt/crypto-tuber-ranked/.omx`

## Restore policy

1. Do not delete, flatten, rename, or casually clean Hermes/OMX material.
2. Preserve absolute paths, ownership, modes, timestamps, symlinks, and executable bits.
3. Use the Hetzner snapshot as raw fallback for full protected-root recovery.
4. Use metadata manifests to verify expected root presence and sizes.
5. Do not write to D: during restore planning or rehearsal.
