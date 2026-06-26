================================================================================
  HERMES ENVIRONMENT CANONICAL STRUCTURE
  Unified Agent Infrastructure — Migration Plan
  Date: 2026-05-11
================================================================================

CURRENT STATE (PROBLEMS)
------------------------
Assets scattered across at least 6 locations:
  ~/.hermes/                  -- Hermes runtime home (config, cache, skills)
  /srv/agents/.agents/skills/ -- Another skills store (why? legacy)
  /srv/agents/hermes/         -- Application code + runtime data + secrets
  /srv/agents/repos/          -- Project repos (career-ops, composio, etc.)
  /srv/agents/worktrees/      -- Git worktrees
  /srv/agents/library/        -- Library tool (already canonical)

Overlapping concerns:
  - Skills live in ~/.hermes/skills/ AND /srv/agents/.agents/skills/
  - Configs live in ~/.hermes/config.yaml AND /srv/agents/hermes/.env
  - Secrets live in multiple .env files across repos
  - The Hermes app code is mixed with runtime data in /srv/agents/hermes/
  - No single git repo captures the whole environment

CANONICAL STRUCTURE (TARGET)
==============================

/srv/agents/                  # Root -- owned by omar:omar
  infra/                      # Infrastructure manifests (this is the env repo)
    README.md
    environments/
      hermes-agent-box/          # Per-machine environment definition
        docker-compose.yml
        systemd/
        cron/
        .env.template             # Keys only, NO values
        setup.sh                  # One-command bootstrap
        teardown.sh
    services/                   # Service-level configs
      library/
      composio/
      ollama/
      neon/
      cloudflared/
    scripts/                    # Shared automation scripts
      bootstrap.sh              # Master bootstrap
      backup.sh
      rotate-secrets.sh
  repos/                        # ALL project repos (existing, move nothing)
    career-ops/
    composio/
    crypto-tuber-ranked/
    hermes-library/
    [etc]
  worktrees/                    # Git worktrees (already here, keep)
  bin/                          # Custom binaries NOT in /usr/local/bin
    [currently empty? verify]
  backups/                      # Periodic backups
    library/
    skills/
  tmp/                          # Ephemeral working space

~/.hermes/                  # Hermes HOME -- stays as convention
  config.yaml               (-- managed by infra/services/hermes/)
  skills/                   (-- symlink to /srv/agents/repos/hermes-library/skills or keep?)
  plugins/
  prompts/
  cache/
  sessions/
  cron/

ENVIRONMENT REPO (infra/) STRUCTURE
======================================

infra/
  .git/                           # Version controlled
  README.md                       # "What is this, how to bootstrap"
  BOOTSTRAP.md                    # Step-by-step new machine setup
  environments/
    hermes-agent-box/
      docker-compose.yml          # All container definitions
      .env.template               # Required env keys (no values)
      setup.sh                    # ./setup.sh installs everything
      teardown.sh                 # ./teardown.sh clean removes
      manifests/
        crontab.txt               # All cron jobs for this machine
        apt-packages.txt          # System deps
        python-requirements.txt   # Python deps
        npm-packages.txt          # Node deps (if any)
  services/
    library/
      service.yaml                # How library is deployed
      cron.yaml                   # Library-specific jobs
    composio/
      service.yaml
    ollama/
      service.yaml
    neon/
      service.yaml
    cloudflared/
      service.yaml
  scripts/
    bootstrap.sh                  # Entry point: ./bootstrap.sh hermes-agent-box
    backup.sh                     # Back up live data to /srv/agents/backups/
    restore.sh
    rotate-secrets.sh
    sync-library.sh               # One-command refresh
  configs/
    .gitignore                    # Don't commit secrets
    commit-rules.md               # How to commit infrastructure changes
    changelog.md

MIGRATION STEPS
================

PHASE 1: INFRA REPO CREATION (Day 1)
  1. Create /srv/agents/infra/ directory
  2. Git init
  3. Create skeleton structure above
  4. Copy current crontab to environments/hermes-agent-box/manifests/crontab.txt
  5. Copy installed apt packages to manifest
  6. Copy Docker compose configs
  7. Copy .env KEYS (not values) to .env.template
  8. Snapshot current ~/.hermes/config.yaml (strip secrets) to configs/
  9. Create .gitignore:
     .env
     .env.*
     **/.env
     **/secrets/
     *.key
     *.pem
  10. Commit initial infrastructure manifest
  11. Push to GitHub as hermes-infra or hermes-env

PHASE 2: HERMES HOME CONSOLIDATION (Day 1-2)
  1. Decide: ~/.hermes/ stays as runtime home OR moves to
     /srv/agents/hermes-home/ and is symlinked
     -> Recommendation: KEEP ~/.hermes/ as convention, but document
        which subdirs are runtime vs. managed vs. cache
  2. Move /srv/agents/.agents/skills/ contents into canonical repo:
     - Compare with ~/.hermes/skills/ (which is what library indexes)
     - If /srv/agents/.agents/skills/ has unique skills, either:
       a. Import into library catalog, or
       b. Delete if already in ~/.hermes/skills/
  3. Delete /srv/agents/.agents/ structure after confirmation
  4. Verify library still scores 385+ entries

PHASE 3: SERVICE CONFIG EXTRACTION (Day 2-3)
  For each running service (docker ps):
    docker-compose.yml -> extract to environments/hermes-agent-box/
    .env file -> extract KEYS to .env.template, move VALUES to Composio Vault
    Systemd units -> extract to environments/hermes-agent-box/systemd/
  Services to document:
    - crypto-tuber-ranked-hermes-worker-1
    - hermes-whop-automation-tunnel
    - Ollama (if running)
    - Any systemd timers or cron jobs

PHASE 4: SECRETS CONSOLIDATION (Day 3)
  1. Every .env file must have its keys listed in .env.template
  2. Every secret VALUE must live in ONE place: Composio Vault
  3. Delete .env.bak files (already found several)
  4. Ensure /srv/agents/hermes/.clone-protected/.env is referenced in .gitignore
  5. No secrets in any repo commit -- verify with:
     git log --all --full-history -- .env* secrets/
  6. Audit: grep -r "ghp_\|github_pat_\|sk-" /srv/agents/infra/ -- must be empty

PHASE 5: AUTOMATION SETUP (Day 3-4)
  1. Replace ad hoc cron jobs with managed cron
     Before: crontab -e manually
     After: crontab environments/hermes-agent-box/manifests/crontab.txt
     Automation: scripts/apply-crons.sh
  2. Replace manual library refresh with infra-managed cron
  3. Replace manual backups with scripts/backup.sh
  4. Set up auto-rotation: systemd.timer or cron that runs backup.sh
  5. Update library cron to use infra cron manifest

PHASE 6: BOOTSTRAP SCRIPT (Day 4-5)
  Create /srv/agents/infra/scripts/bootstrap.sh that:
    1. Checks OS and dependencies
    2. Installs apt packages from manifest
    3. Installs Python/Node deps
    4. Creates ~/.hermes/ directory tree
    5. Symlinks /srv/agents/infra/ to ~/.hermes/infra (or similar)
    6. Pulls Composio secrets via API call
    7. Writes .env files from templates + Composio
    8. Runs docker compose up -d
    9. Starts systemd units
    10. Starts hermes agent
    11. Runs basic health check (library status, docker ps, etc.)

PHASE 7: TEST NEW MACHINE (Day 5+)
  1. Provision fresh Hetzner (or use local Docker)
  2. Run bootstrap.sh
  3. Verify: library works, docker containers run, agent connects to Telegram
  4. Document any missing steps
  5. Iterate bootstrap.sh until it is truly one-command

PHASE 8: DOCUMENTATION (Day 6)
  1. README.md: "What is this repo, who is it for"
  2. BOOTSTRAP.md: "How to set up a new hermes-agent-box from scratch"
  3. MIGRATE.md: "How to move existing scattered setup to canonical structure"
  4. OPERATIONS.md: "Day-to-day tasks"
  5. TROUBLESHOOTING.md
  6. SECRETS.md: "Where everything lives, rotation schedule"
  7. ARCHITECTURE.md: Diagram of services and data flow

WHAT STAYS, WHAT MOVES, WHAT DIES
===================================

STAYS (don't touch):
  ~/.hermes/               -- Hermes runtime convention, but document subdirs
  /srv/agents/repos/*      -- Already canonical per-project repos
  /srv/agents/worktrees/   -- Git worktrees, keep
  /srv/agents/library/     -- Already canonical, now in hermes-library repo

MOVES:
  /srv/agents/.agents/skills/ -> ~/.hermes/skills/ or hermes-library repo
  /srv/agents/hermes/cron/  -> infra/environments/hermes-agent-box/cron/
  /srv/agents/hermes/.env*  -> infra/secrets/ (NO, into .env.template) + Composio
  /srv/agents/hermes/config.yaml -> infra/environments/hermes-agent-box/config.yaml

DIES (after confirmation):
  /srv/agents/.agents/     -- After skills migrated
  /srv/agents/hermes/      -- After separating code vs. runtime data
  /srv/agents/hermes/.clone-protected/.env  -- After moving to Composio
  Ad hoc .env.bak files    -- After audit and Composio migration

VERIFICATION CHECKLIST
======================

Environment:
  [ ] One git repo for infrastructure: /srv/agents/infra/ -> GitHub
  [ ] Every secret in Composio, nowhere else
  [ ] bootstrap.sh runs from zero to running agent in <30 min
  [ ] teardown.sh cleanly removes

Library:
  [ ] library command works from any directory (system wrapper)
  [ ] library status shows 385+ entries
  [ ] library refresh --prune-missing runs via cron, managed by infra manifest
  [ ] Hourly backups confirmed in /srv/agents/backups/library/

Services:
  [ ] docker compose up -d from environment manifest runs all services
  [ ] crypto-tuber-ranked worker starts
  [ ] cloudflared tunnel connects
  [ ] Ollama accessible (if local)

Agent:
  [ ] hermes agent connects to Telegram on boot
  [ ] Library commands work from agent context
  [ ] Cron jobs show in infra/manifests/

Secrets:
  [ ] No .env files committed to any repo
  [ ] No .env.bak files left on disk
  [ ] No tokens in shell history
  [ ] Composio Vault has all required keys

CANONICAL DIRECTORY MANIFEST
============================

FINAL STRUCTURE:

/srv/agents/
  infra/                          # Git repo, version controlled
    environments/
      hermes-agent-box/
        docker-compose.yml
        .env.template
        setup.sh
        teardown.sh
        manifests/
    services/
    scripts/
    configs/
    README.md
  repos/                          # Project repos, each independent git repo
    career-ops/
    composio/
    crypto-tuber-ranked/
    hermes-library/
    [etc]
  worktrees/                      # Git worktrees
  bin/                            # Custom scripts
  backups/                        # Periodic backups
    library/
    skills/
  tmp/                            # Ephemeral

~/.hermes/                      # Hermes HOME (runtime)
  config.yaml
  skills/                        # Library-managed skill assets
  plugins/
  prompts/
  agents/
  workflows/
  references/
  cache/
  sessions/
  cron/
  library-backups/

RULE: Everything in /srv/agents/infra/ is declarative ("what should be").
      Everything in ~/.hermes/ is runtime ("what is currently running").
      The bridge between them is bootstrap.sh and cron maintenance.

================================================================================
                           END OF PLAN
================================================================================
