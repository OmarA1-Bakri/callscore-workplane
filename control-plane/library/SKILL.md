---
name: library
description: Package manager for agentic assets — skills, agents, prompts, workflows, plugins, references
---

# The Library

A package manager for agentic assets. Manages a catalog of skills, agents, prompts, workflows, plugins, and references with deployment to local directories and sync to GitHub.

## Commands

All commands route to `library.py` in this directory. Run the command and display output verbatim.

| Command | Action |
|---------|--------|
| `/library init` | `python library/library.py init` |
| `/library add --name X --type Y --source Z` | `python library/library.py add --name X --type Y --source Z [--tags a,b] [--description "..."] [--requires type:name] [--deploy-scope global]` |
| `/library use <name>` | `python library/library.py use <name> [--scope global\|default\|both]` |
| `/library remove <name>` | `python library/library.py remove <name> [--delete-files --confirm]` |
| `/library list` | `python library/library.py list [--type X] [--tag Y] [--json]` |
| `/library search <query>` | `python library/library.py search <query>` |
| `/library sync` | `python library/library.py sync [--force]` |
| `/library push` | `python library/library.py push [--remote <url>]` |
| `/library status` | `python library/library.py status` |
| `/library import <dir> --type <type>` | `python library/library.py import <dir> --type <type> [--deploy-scope global]` |

## Post-command

Display CLI output to the user verbatim. Do not summarize, reformat, or omit any output.

## Bootstrap (first time)

```bash
python library/library.py init
python library/library.py import ~/.claude/skills/ --type skill --deploy-scope global
python library/library.py import ./agent_workflows/ --type workflow --deploy-scope default
python library/library.py import ./shared_references/ --type reference --deploy-scope default
python library/library.py import ~/.claude/plugins/marketplaces/local-plugins/ --type plugin --deploy-scope global
python library/library.py import ~/.claude/commands/ --type prompt --deploy-scope global
python library/library.py list
```
