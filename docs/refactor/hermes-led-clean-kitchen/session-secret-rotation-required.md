# SESSION_SECRET Rotation Required

Status: `pending_controlled_maintenance`

Incident:

- `SESSION_SECRET` was captured into clean-kitchen artefacts during Prompt 3.5 route discovery.
- Prompt 3.6 redacted affected artefacts in place or stubbed unsafe env-bearing artefact copies.
- No secret values are included in this document.
- Final scan status: `pass`.

Required next action:

- Rotate `SESSION_SECRET` at the next controlled maintenance window.
- Do not rotate in Prompt 3.6.
- Rotation must include app/runtime impact assessment before change.
- Confirm session/cookie/auth impact, deployment/restart requirements, rollback plan, and verification checks before applying rotation.
