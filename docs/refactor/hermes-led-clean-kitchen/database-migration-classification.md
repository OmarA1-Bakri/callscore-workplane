# Database Migration Classification

Path: `/srv/agents/database-migration`

Classification: `BLOCKED_NEEDS_OPERATOR_APPROVAL`

Exists: `True`

Size bytes: `878132059`

Purpose: database migration workspace or artifact directory; deletion requires operator approval if DB dumps/migration scripts exist

References: process=0, docker=0, systemd=0, cron=0, compose=0

Protected hits: `1`

DB/migration-like files: `3`

Decision: do not delete in this phase. Operator approval required if present.
