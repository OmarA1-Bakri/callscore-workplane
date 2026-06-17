# Hermes / OMX Protection Policy

Hermes and OMX are restore-critical system domains. They are not disposable tech debt.

## Protected roots

### Hermes

- `/srv/agents/hermes`
- `/home/omar/.hermes`
- related service/runtime references from `hh-control-bridge`, OAuth MCP gateway, and agent startup bundles

### OMX

- `/srv/agents/interop/omx-inbox`
- `/srv/agents/repos/.omx`
- `/srv/agents/repos/Claude_Code_Automations/workplane/.omx`
- `/opt/crypto-tuber-ranked/.omx`

## Rules

1. Do not delete Hermes or OMX material during cleanup.
2. Do not flatten or merge Hermes/OMX paths into generic folders.
3. Preserve original absolute paths in manifests.
4. Preserve ownership, mode, timestamps, and symlink information where possible.
5. Do not push raw Hermes/OMX runtime vaults to GitHub unless encrypted and explicitly approved.
6. Treat sessions, provider accounts, memories, caches, inboxes, state snapshots, and runtime configs as sensitive restore assets.
7. Clean repo can contain manifests, restore scripts, source excerpts, docs, and checksums; raw runtime belongs in protected vaults and full VM backup.

## Restore principle

The clean repo should know exactly what Hermes/OMX assets exist and where they restore to, but raw sensitive payloads should be restored from protected local vaults or the full D-drive VM backup.
