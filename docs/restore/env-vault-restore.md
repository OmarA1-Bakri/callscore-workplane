# Env vault restore plan

Raw env files are restore-critical and must not be manually recreated.

Source of truth:
- `protected/env-vault/files/` for raw local copies, ignored by Git
- `protected/env-vault/metadata/` for manifests, key names, sha256, mode, owner/group, mtime, symlink target
- D-drive Hetzner image is raw fallback only; do not write to D-drive

Restore rule:
- restore exact absolute paths
- restore mode/owner/group where practical
- verify sha256 against manifest
- never print env values in logs
