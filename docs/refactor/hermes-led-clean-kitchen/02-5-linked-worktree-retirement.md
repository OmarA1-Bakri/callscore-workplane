# Prompt 2.5 Linked Worktree Retirement & Protected-State Cleanup

Run: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement`

Disk before: 83.52% used, free 26529157120 bytes.

Disk after: 81.37% used, free 29987917824 bytes.

Recovered by df delta: 3458760704 bytes.

Protected stale-state metadata rows: 63. Contents were not copied or printed.

## Actions

- `/srv/agents/crypto-tuber-ranked` | `DELETED_AFTER_PROTECTED_METADATA_CAPTURE` | deleted `True` | skipped `False` | recovered `650731520`
- `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z` | `DELETED_AFTER_PROTECTED_METADATA_CAPTURE` | deleted `False` | skipped `False` | recovered `61575168`
- `/srv/agents/repos/callscore-stale-infra-cleanup` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `17833984`
- `/srv/whop-auto/workspace/callscore-db-portability` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `1318494208`
- `/tmp/callscore-pr38-build` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `1278242816`
- `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `109883392`
- `/srv/agents/repos/Claude_Code_Automations-measurement-pack-001` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `7467008`
- `/srv/agents/repos/Claude_Code_Automations-pr10-master-clean` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `7454720`
- `/srv/agents/repos/Claude_Code_Automations_callscore_launch_sweep_clean` | `GIT_WORKTREE_RETIRED` | deleted `True` | skipped `False` | recovered `7471104`

## Preserved

- `/opt/crypto-tuber-ranked`
- `/opt/crypto-tuber-ranked/docker-compose.yml`
- `/opt/callscore/secrets/youtube-cookies.txt`
- `/srv/agents/repos/callscore-workplane`
- `/srv/agents/database-migration` remains `BLOCKED_NEEDS_OPERATOR_APPROVAL`.

## Supplemental remediation

Protected-state content copy discovered in prior Prompt 2 capture was removed; metadata-only manifest remains authoritative. Pre-canonical root-owned empty directory was removed with sudo after non-sudo exact deletion cleared contents but could not remove the directory.

- Supplemental: protected-state content copy from Prompt 2 capture removed: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/unique-source-docs/pre-canonical-20260526T063909Z/google-client-secrets.json`; metadata only retained.
