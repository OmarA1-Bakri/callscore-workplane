# The Library

Package manager for agentic assets — skills, agents, prompts, workflows, plugins, and references.

## What It Does

- **Catalogs** skills, agents, prompts, workflows, plugins, and references from whatever runtime roots you configure
- **Discovers** assets recursively from configured roots using marker files (`SKILL.md`, `plugin.json`) and prompt markdown files
- **Searches** by keyword across names, descriptions, and tags
- **Deploys** assets from source to target directories with dependency resolution
- **Validates** structure, frontmatter, and version freshness against remote git repos
- **Integrates** with the Task Router plugin for intelligent skill/plugin selection

## Quick Start

```bash
# Initialize (creates library.yaml)
python library/library.py init

# Configure scan_roots in library.yaml for your runtimes, then refresh
python library/library.py refresh --prune-missing

# Or import existing assets manually
python library/library.py import /path/to/runtime/skills --type skill --deploy-scope global --recursive
python library/library.py import /path/to/runtime/plugins --type plugin --deploy-scope global --recursive
python library/library.py import ./agent_workflows/ --type workflow --deploy-scope default --recursive
python library/library.py import ./shared_references/ --type reference --deploy-scope default --recursive

# See what you have
python library/library.py list
python library/library.py search "payments"
python library/library.py status
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `library.yaml` with default deploy targets |
| `add` | Register a new entry (`--name`, `--type`, `--source`, `--tags`, `--requires`, `--deploy-scope`) |
| `list` | Show catalog entries (`--type`, `--tag`, `--json`) |
| `search <query>` | Keyword search across names, descriptions, tags |
| `remove <name>` | Remove from catalog (`--delete-files --confirm` for disk cleanup) |
| `import <dir>` | Bulk-scan directory (`--type`, `--deploy-scope`, `--recursive`) |
| `refresh` | Re-scan configured `scan_roots`, update catalog entries, and optionally prune stale local entries |
| `use <name>` | Deploy from source to target directory, resolves dependencies |
| `status` | Show installed vs catalog-only vs source-missing |
| `sync` | Re-deploy all installed items from source (`--force`) |
| `push` | Copy sources into `assets/`, commit, push to GitHub (`--remote`) |
| `validate` | Check structure, frontmatter, descriptions (`--type`, `--check-versions`) |
| `check-updates` | Compare all git-backed repos against remote HEAD |

## Asset Types

| Type | Marker File | Default Deploy Target |
|------|------------|----------------------|
| skill | `SKILL.md` | Configured by `deploy_targets` |
| agent | `SKILL.md` | Configured by `deploy_targets` |
| prompt | `.md` files | Configured by `deploy_targets` |
| workflow | `SKILL.md` | `agent_workflows/` |
| plugin | `plugin.json` | Configured by `deploy_targets` |
| reference | `.md` files | `shared_references/` |

## scan_roots

Populate `scan_roots` in `library.yaml` with the runtime-specific locations you want the Library to index. Example:

```yaml
scan_roots:
  - type: skill
    runtime: claude
    path: ~/.claude/skills
    deploy_scope: global
    recursive: true
  - type: plugin
    runtime: copilot
    path: ~/.agents/skills
    deploy_scope: global
    recursive: true
```

Then run:

```bash
python library/library.py refresh --prune-missing
```

## CLI Access

**Claude Code:** `/library <command>` (via SKILL.md slash command)

**Windows:** `library.cmd <command>` (add `library/` to PATH)

**WSL/Bash:** `library <command>` (PATH entry added to `~/.bashrc`)

## QA Validation

```bash
# Validate all skills for proper frontmatter
python library/library.py validate --type skill

# Check which plugin repos are behind remote
python library/library.py check-updates
```

## Task Router Integration

The Task Router plugin (`library/task-router/`) uses The Library as its canonical discovery backend. Instead of hard-coded plugin lists or raw filesystem scanning, it calls:

```bash
library search "<keyword>"
library list --type skill --json
```

This gives it access to 4,000+ indexed assets with descriptions already extracted.

## Architecture

```
library/
  library.py      # Single-file CLI (Python 3.11, argparse + PyYAML)
  library.yaml    # The catalog (4,000+ entries)
  library.cmd     # Windows CLI wrapper
  library         # Bash CLI wrapper
  SKILL.md        # Claude Code slash command
  task-router/    # Task Router plugin (library-integrated)
```

## Dependencies

- Python 3.11+
- PyYAML (`pip install pyyaml`)
- git (for clone/push/version checks)
