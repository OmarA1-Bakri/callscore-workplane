# Legacy Repo Deletion Report

Run: `/srv/agents/repos/callscore-workplane/receipts/refactor/hermes-led-clean-kitchen/20260621T190926Z-prompt2-canonical-capture`

Deleted count: `0`


## Blocked

- `/srv/agents/crypto-tuber-ranked` => `BLOCKED_PROTECTED_STATE`
- `/srv/agents/repos/crypto-tuber-ranked` => `BLOCKED_LINKED_WORKTREES`
- `/srv/agents/repos/callscore-stale-infra-cleanup` => `BLOCKED_LINKED_WORKTREES`
- `/opt/crypto-tuber-ranked.pre-canonical-20260526T063909Z` => `BLOCKED_PROTECTED_STATE`
- `/srv/agents/database-migration` => `BLOCKED_NEEDS_OPERATOR_APPROVAL`
- `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready` => `BLOCKED_PROTECTED_STATE`
- `/srv/agents/repos/Claude_Code_Automations-measurement-pack-001` => `UNKNOWN_BLOCKED`
- `/srv/agents/repos/Claude_Code_Automations-pr10-master-clean` => `UNKNOWN_BLOCKED`
- `/srv/agents/repos/Claude_Code_Automations_callscore_launch_sweep_clean` => `UNKNOWN_BLOCKED`

## Prompt 2 supplement: Claude Code variants

These paths are linked worktrees sharing `/srv/agents/repos/Claude_Code_Automations/.git`; raw `rm -rf` blocked to avoid shared Git metadata damage.

- `/srv/agents/repos/Claude_Code_Automations-marketing-launch-ready` => `BLOCKED_LINKED_WORKTREES` branch `refs/heads/callscore/marketing-dispatch-pack-001` head `7e1a5fb8f14fcb409d9660d4d1be8e1ba4becf13`
- `/srv/agents/repos/Claude_Code_Automations-measurement-pack-001` => `BLOCKED_LINKED_WORKTREES` branch `refs/heads/callscore/asset-pack-001-measurement-packet` head `78944f60081f1a3994fe1689147841cf579798e3`
- `/srv/agents/repos/Claude_Code_Automations-pr10-master-clean` => `BLOCKED_LINKED_WORKTREES` branch `refs/heads/callscore/marketing-dispatch-pack-001-master` head `5846e233aa45f017bb1e9ea279c5efd59a27c318`
- `/srv/agents/repos/Claude_Code_Automations_callscore_launch_sweep_clean` => `BLOCKED_LINKED_WORKTREES` branch `refs/heads/chore/callscore-launch-domain-sweep-clean` head `e890f5b27ca36afb941e18be7e44b627ffed93ac`
