# Composio Repair Plan

## Observed status

Composio is canonical but not visible in the current HH toolbox status or provider-route toolbox search.

## Likely dependency

A missing/unauthorized Composio MCP server connection or unavailable provider bridge.

## Safe repair sequence

1. Obtain explicit operator approval for Composio repair.
2. Inspect available connector/MCP configuration metadata only.
3. Re-authorize or reconnect Composio through the approved setup path.
4. Do not mutate any downstream provider during repair.
5. Run toolbox status again.
6. Run provider registry search again.
7. Record Composio as visible_but_not_verified.
8. Only later run approved read-only provider probes one provider at a time.

## Non-goals

- No OAuth app changes in this phase.
- No credential reads.
- No provider dashboard changes.
- No provider mutation.
- No email/message/social send.

## Approval gates

- OAUTH_CONFIG_GATE for OAuth/app repair.
- CREDENTIAL_ROTATION_GATE for any secret/credential change.
- PROVIDER_MUTATION_GATE for any provider action beyond route visibility.

## Rollback

If a repair attempt causes unexpected provider access or unsafe state, stop, record emergency receipt, and revert connection/config changes through the approved provider UI or connector manager.
