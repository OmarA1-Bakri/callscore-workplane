# Prompt 2.5 Deletion Report

Run: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement`

Disk recovered: `3458760704` bytes.

- `/srv/agents/crypto-tuber-ranked` | type `raw exact path deletion` | class `DELETED_AFTER_PROTECTED_METADATA_CAPTURE` | deleted `True` | rc `0` | recovered `650731520` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__crypto-tuber-ranked.json`
- `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z` | type `raw exact path deletion` | class `DELETED_AFTER_PROTECTED_METADATA_CAPTURE` | deleted `False` | rc `1` | recovered `61575168` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/opt__crypto-tuber-ranked.pre-canonical-20260526T063909Z.json`
- `/srv/agents/repos/callscore-stale-infra-cleanup` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `17833984` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__repos__callscore-stale-infra-cleanup.json`
- `/srv/whop-auto/workspace/callscore-db-portability` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `1318494208` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__whop-auto__workspace__callscore-db-portability.json`
- `/tmp/callscore-pr38-build` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `1278242816` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/tmp__callscore-pr38-build.json`
- `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `109883392` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__repos__Claude_Code_Automations-marketing-launch-ready.json`
- `/srv/agents/repos/Claude_Code_Automations-measurement-pack-001` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `7467008` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__repos__Claude_Code_Automations-measurement-pack-001.json`
- `/srv/agents/repos/Claude_Code_Automations-pr10-master-clean` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `7454720` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__repos__Claude_Code_Automations-pr10-master-clean.json`
- `/srv/agents/repos/Claude_Code_Automations_callscore_launch_sweep_clean` | type `git worktree removal` | class `GIT_WORKTREE_RETIRED` | deleted `True` | rc `0` | recovered `7471104` | receipt `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T-prompt25-linked-worktree-retirement/srv__agents__repos__Claude_Code_Automations_callscore_launch_sweep_clean.json`

## Still blocked

- `/srv/agents/repos/crypto-tuber-ranked` => `BLOCKED_COMMON_GIT_RISK`: common repo not deleted in Prompt 2.5; common .git preservation rule; deletion/classification can be separate later phase after worktree retirement verification
- `/srv/agents/repos/Claude_Code_Automations` => `BLOCKED_COMMON_GIT_RISK`: common repo explicitly not approved for deletion in Prompt 2.5
- `/srv/agents/database-migration` => `BLOCKED_NEEDS_OPERATOR_APPROVAL`: DB/migration protected data; no explicit operator approval to delete in current prompt

## Supplemental remediation

- Removed protected-state content copy from previous capture: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/unique-source-docs/pre-canonical-20260526T063909Z/google-client-secrets.json`; metadata retained in `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/protected-stale-state-manifest.json`.
- Completed pre-canonical snapshot deletion with `sudo -n rm -rf --one-file-system -- "/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z"`; exists_after `False`.

- Supplemental: protected-state content copy from Prompt 2 capture removed: `/srv/agents/repos/callscore-workplane/docs/refactor/hermes-led-clean-kitchen/canonical-capture/unique-source-docs/pre-canonical-20260526T063909Z/google-client-secrets.json`; metadata only retained.
