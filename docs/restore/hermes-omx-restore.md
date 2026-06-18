# Hermes/OMX restore plan

Hermes and OMX are protected runtime/control domains.

Policy:
- Do not delete, flatten, rename, or casually clean Hermes/OMX material.
- Preserve absolute paths, ownership, modes, timestamps, and symlinks.
- In this low-space migration, use manifest-only evidence plus the existing Hetzner full image as raw fallback unless an explicitly approved local archive strategy is recorded.
- Do not write to D-drive.

Protected roots:
- `/srv/agents/hermes`
- `/home/omar/.hermes`
- `/srv/agents/interop/omx-inbox`
- `/srv/agents/repos/.omx`
- `/srv/agents/repos/Claude_Code_Automations/workplane/.omx`
- `/opt/crypto-tuber-ranked/.omx`
