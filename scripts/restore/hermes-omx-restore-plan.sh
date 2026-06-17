#!/usr/bin/env bash
set -euo pipefail

cat <<'PLAN'
Hermes / OMX restore order:

1. Restore raw folders to original paths:
   /srv/agents/hermes
   /home/omar/.hermes
   /srv/agents/interop/omx-inbox
   /srv/agents/repos/.omx
   /srv/agents/repos/Claude_Code_Automations/workplane/.omx
   /opt/crypto-tuber-ranked/.omx

2. Restore owner and mode metadata where needed.
3. Restore runtime configuration from protected/env-vault or the full VM backup.
4. Verify read-only before restarting any service.
PLAN
