#!/usr/bin/env python3
"""
library.py — Package manager for agentic assets.

Manages a catalog of skills, agents, prompts, workflows, plugins, and references.
Source of truth is library.yaml; local directories are deployment targets.

Usage:
    python library.py <command> [args] [flags]
"""

import argparse
import contextlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
LIBRARY_YAML = SCRIPT_DIR / "library.yaml"
ASSETS_DIR = SCRIPT_DIR / "assets"

VALID_TYPES = ("skill", "agent", "prompt", "workflow", "plugin", "reference")
VALID_SCOPES = ("global", "default", "both")

DEFAULT_DEPLOY_TARGETS = {
    "skill": [
        {"default": ".claude/skills/"},
        {"global": "~/.claude/skills/"},
    ],
    "agent": [
        {"default": ".claude/agents/"},
        {"global": "~/.claude/agents/"},
    ],
    "prompt": [
        {"default": ".claude/commands/"},
        {"global": "~/.claude/commands/"},
    ],
    "workflow": [
        {"default": "agent_workflows/"},
    ],
    "plugin": [
        {"global": "~/.claude/plugins/marketplaces/local-plugins/"},
    ],
    "reference": [
        {"default": "shared_references/"},
    ],
}

DEFAULT_SCAN_ROOTS = []

# Plural form for YAML keys
TYPE_TO_SECTION = {
    "skill": "skills",
    "agent": "agents",
    "prompt": "prompts",
    "workflow": "workflows",
    "plugin": "plugins",
    "reference": "references",
}


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
def info(msg: str):
    print(f"  {msg}")


def success(msg: str):
    print(f"  OK: {msg}")


def warn(msg: str):
    print(f"  WARN: {msg}")


def error(msg: str):
    print(f"  ERROR: {msg}")


# ---------------------------------------------------------------------------
# YAML I/O
# ---------------------------------------------------------------------------
def ensure_catalog_shape(catalog: dict) -> dict:
    """Backfill optional top-level sections for older catalogs."""
    catalog.setdefault("version", "1.0")
    catalog.setdefault("deploy_targets", DEFAULT_DEPLOY_TARGETS)
    catalog.setdefault("scan_roots", list(DEFAULT_SCAN_ROOTS))
    catalog.setdefault("library", {})
    for section in TYPE_TO_SECTION.values():
        catalog["library"].setdefault(section, [])
    return catalog


def load_catalog() -> dict:
    """Load library.yaml. Exit if it doesn't exist (except during init)."""
    if not LIBRARY_YAML.exists():
        error(f"No library.yaml found at {LIBRARY_YAML}")
        error("Run 'python library.py init' first.")
        sys.exit(1)
    with open(LIBRARY_YAML, "r", encoding="utf-8") as f:
        return ensure_catalog_shape(yaml.safe_load(f) or {})


def save_catalog(data: dict):
    """Write library.yaml with consistent formatting."""
    with open(LIBRARY_YAML, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def find_entry(catalog: dict, name: str) -> tuple:
    """Find an entry by name across all sections. Returns (section_key, index, entry) or (None, None, None)."""
    lib = catalog.get("library", {})
    for type_key in TYPE_TO_SECTION.values():
        entries = lib.get(type_key, []) or []
        for i, entry in enumerate(entries):
            if entry.get("name") == name:
                return type_key, i, entry
    return None, None, None


def upsert_entry(catalog: dict, entry: dict) -> str:
    """Insert or replace an entry by name. Returns 'added' or 'updated'."""
    section = TYPE_TO_SECTION[entry["type"]]
    section_key, idx, _ = find_entry(catalog, entry["name"])
    if section_key is None:
        catalog["library"][section].append(entry)
        return "added"

    catalog["library"][section_key][idx] = entry
    return "updated"


# ---------------------------------------------------------------------------
# Source resolution
# ---------------------------------------------------------------------------
def resolve_source(source: str) -> Path:
    """Resolve a source string to an actual local path.

    Handles:
      - Relative paths (from SCRIPT_DIR)
      - Absolute/home-expanded paths
      - GitHub URLs (clone to temp, return path)
    """
    # GitHub URL
    if source.startswith("https://github.com/"):
        return clone_github_source(source)

    # Expand ~ and resolve
    expanded = Path(os.path.expanduser(source))
    if expanded.is_absolute():
        return expanded

    # Relative to library root
    return (SCRIPT_DIR / source).resolve()


def clone_github_source(url: str) -> Path:
    """Clone a GitHub URL to a temp directory and return the path."""
    match = re.match(r"https://github\.com/([^/]+/[^/]+)(?:/tree/[^/]+/(.+))?", url)
    if not match:
        error(f"Cannot parse GitHub URL: {url}")
        sys.exit(1)

    repo_slug = match.group(1)
    subpath = match.group(2) or ""
    repo_url = f"https://github.com/{repo_slug}.git"

    tmp_dir = Path(tempfile.mkdtemp(prefix="library_"))
    info(f"Cloning {repo_slug}...")

    result = subprocess.run(
        ["git", "clone", "--depth", "1", repo_url, str(tmp_dir / "repo")],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        ssh_url = f"git@github.com:{repo_slug}.git"
        info("HTTPS failed, trying SSH...")
        result = subprocess.run(
            ["git", "clone", "--depth", "1", ssh_url, str(tmp_dir / "repo")],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            error(f"Git clone failed for {repo_slug}:\n{result.stderr}")
            sys.exit(1)

    source_path = tmp_dir / "repo"
    if subpath:
        source_path = source_path / subpath

    if not source_path.exists():
        error(f"Subpath '{subpath}' not found in cloned repo.")
        sys.exit(1)

    return source_path


def deploy_item(source_path: Path, target_dir: str, name: str, is_file: bool = False):
    """Copy source to target deployment directory."""
    target_base = Path(os.path.expanduser(target_dir))
    target_base.mkdir(parents=True, exist_ok=True)

    if is_file:
        target = target_base / source_path.name
        shutil.copy2(source_path, target)
    else:
        target = target_base / name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source_path, target)

    return target


def resolve_deploy_targets(catalog: dict, entry: dict) -> list:
    """Return list of target directory paths for an entry based on its deploy_scope."""
    entry_type = entry.get("type", "skill")
    scope = entry.get("deploy_scope", "global")
    targets_config = catalog.get("deploy_targets", {}).get(entry_type, [])

    paths = []
    for target_dict in targets_config:
        for scope_key, path_str in target_dict.items():
            if scope == "both" or scope == scope_key:
                paths.append(path_str)
    return paths


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
def cmd_init(args):
    """Create library.yaml with default deploy targets and empty catalog."""
    if LIBRARY_YAML.exists():
        warn(f"library.yaml already exists at {LIBRARY_YAML}")
        info("Use 'import' to add existing assets to the catalog.")
        return

    catalog = {
        "version": "1.0",
        "deploy_targets": DEFAULT_DEPLOY_TARGETS,
        "scan_roots": list(DEFAULT_SCAN_ROOTS),
        "library": {
            "skills": [],
            "agents": [],
            "prompts": [],
            "workflows": [],
            "plugins": [],
            "references": [],
        },
    }
    save_catalog(catalog)
    success(f"Created {LIBRARY_YAML}")
    info("Next: configure scan_roots or run 'python library.py import <dir> --type <type>'.")


def cmd_add(args):
    """Register a new entry in the catalog."""
    catalog = load_catalog()
    name = args.name
    entry_type = args.type
    source = args.source
    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    requires = [r.strip() for r in args.requires.split(",")] if args.requires else []
    deploy_scope = args.deploy_scope or "global"

    if entry_type not in VALID_TYPES:
        error(f"Invalid type '{entry_type}'. Must be one of: {', '.join(VALID_TYPES)}")
        sys.exit(1)

    if deploy_scope not in VALID_SCOPES:
        error(f"Invalid deploy_scope '{deploy_scope}'. Must be one of: {', '.join(VALID_SCOPES)}")
        sys.exit(1)

    # Check for duplicates
    section_key, _, _ = find_entry(catalog, name)
    if section_key is not None:
        error(f"'{name}' already exists in catalog under {section_key}. Use 'remove' first.")
        sys.exit(1)

    # Auto-detect description from SKILL.md if source is a directory
    description = args.description
    if not description:
        source_path = Path(os.path.expanduser(source))
        skill_md = source_path / "SKILL.md"
        if skill_md.exists():
            with open(skill_md, "r", encoding="utf-8") as f:
                first_line = f.readline().strip().lstrip("#").strip()
                description = first_line or name
        else:
            description = name

    entry = {
        "name": name,
        "description": description,
        "source": source,
        "type": entry_type,
        "tags": tags,
        "requires": requires,
        "deploy_scope": deploy_scope,
    }

    section = TYPE_TO_SECTION[entry_type]
    if catalog["library"].get(section) is None:
        catalog["library"][section] = []
    catalog["library"][section].append(entry)
    save_catalog(catalog)
    success(f"Added '{name}' ({entry_type}) to catalog.")


def cmd_list(args):
    """Show catalog entries, filterable by type and tag."""
    catalog = load_catalog()
    lib = catalog.get("library", {})
    filter_type = args.type
    filter_tag = args.tag
    as_json = args.json

    results = []
    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            etype = entry.get("type", type_key.rstrip("s"))
            if filter_type and etype != filter_type:
                continue
            if filter_tag and filter_tag not in entry.get("tags", []):
                continue
            results.append(entry)

    if as_json:
        print(json.dumps(results, indent=2, default=str))
        return

    if not results:
        info("No entries found matching filters.")
        return

    # Group by type
    grouped = {}
    for entry in results:
        t = entry.get("type", "unknown")
        grouped.setdefault(t, []).append(entry)

    for etype, entries in grouped.items():
        print(f"\n  [{etype.upper()}S] ({len(entries)})")
        for e in sorted(entries, key=lambda x: x["name"]):
            tags = ", ".join(e.get("tags", []))
            scope = e.get("deploy_scope", "?")
            deps = len(e.get("requires", []))
            print(f"    {e['name']:30s} {e.get('description', '')[:50]}")
            if tags:
                print(f"    {'':30s} tags: {tags}  scope: {scope}  deps: {deps}")
    print(f"\n  Total: {len(results)} entries")


def cmd_search(args):
    """Keyword search across names, descriptions, and tags."""
    catalog = load_catalog()
    lib = catalog.get("library", {})
    query = args.query.lower()

    results = []
    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            searchable = " ".join([
                entry.get("name", ""),
                entry.get("description", ""),
                " ".join(entry.get("tags", [])),
            ]).lower()
            if query in searchable:
                results.append(entry)

    if not results:
        info(f"No entries matching '{args.query}'.")
        return

    print(f"\n  Search results for '{args.query}': {len(results)} found\n")
    for e in results:
        print(f"    [{e.get('type', '?'):9s}] {e['name']:30s} {e.get('description', '')[:50]}")


def cmd_remove(args):
    """Remove an entry from the catalog. Optionally delete deployed files."""
    catalog = load_catalog()
    name = args.name
    section_key, idx, entry = find_entry(catalog, name)

    if section_key is None:
        error(f"'{name}' not found in catalog.")
        sys.exit(1)

    if args.delete_files:
        if not args.confirm:
            error("--delete-files requires --confirm flag. This is a destructive operation.")
            sys.exit(1)
        deploy_targets = resolve_deploy_targets(catalog, entry)
        for target in deploy_targets:
            target_path = Path(os.path.expanduser(target)) / name
            if target_path.exists():
                if target_path.is_dir():
                    shutil.rmtree(target_path)
                else:
                    target_path.unlink()
                info(f"Deleted: {target_path}")
            else:
                info(f"Not found (skip): {target_path}")

    catalog["library"][section_key].pop(idx)
    save_catalog(catalog)
    success(f"Removed '{name}' from catalog.")


def _extract_description(path: Path) -> str:
    """Extract description from a SKILL.md or plugin.json file."""
    if path.is_file() and path.suffix.lower() == ".md":
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    fm_text = parts[1].strip()
                    for line in fm_text.split("\n"):
                        if line.strip().startswith("description:"):
                            desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                            if desc:
                                return desc[:100]

            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("#"):
                    heading = stripped.lstrip("#").strip()
                    if heading:
                        return heading[:100]
        except Exception:
            pass

    skill_md = path / "SKILL.md" if path.is_dir() else None
    if skill_md and skill_md.exists():
        try:
            with open(skill_md, "r", encoding="utf-8") as f:
                in_frontmatter = False
                for line in f:
                    stripped = line.strip()
                    if stripped == "---":
                        if not in_frontmatter:
                            in_frontmatter = True
                            continue
                        else:
                            in_frontmatter = False
                            continue
                    if in_frontmatter and stripped.startswith("description:"):
                        desc = stripped[len("description:"):].strip().strip('"').strip("'")
                        if desc:
                            return desc[:100]
                    if not in_frontmatter and stripped.startswith("#"):
                        heading = stripped.lstrip("#").strip()
                        if heading:
                            return heading[:100]
        except Exception:
            pass

    plugin_json = path / "plugin.json" if path.is_dir() else None
    if not plugin_json or not plugin_json.exists():
        plugin_json = path / ".claude-plugin" / "plugin.json" if path.is_dir() else None
    if plugin_json and plugin_json.exists():
        try:
            with open(plugin_json, "r", encoding="utf-8") as f:
                data = json.loads(f.read())
                if data.get("description"):
                    return str(data["description"])[:100]
                if data.get("name"):
                    return str(data["name"])[:100]
        except Exception:
            pass

    return path.stem if path.is_file() else path.name


SKIP_DIRS = {".git", ".github", "__pycache__", "node_modules", ".venv", "venv", "cache", ".cache"}

# Marker files that identify an asset directory
MARKER_FILES = {
    "skill": ["SKILL.md"],
    "agent": ["SKILL.md", "agent.json"],
    "prompt": ["SKILL.md"],
    "workflow": ["SKILL.md", "workflow.json"],
    "plugin": ["plugin.json"],
    "reference": [],  # references are individual files, not marker-based
}


def _discover_recursive(scan_dir: Path, entry_type: str) -> list:
    """Recursively walk directories to find assets by marker files.

    For plugins: looks for plugin.json (also in .claude-plugin/ subdirs).
    For skills/agents/workflows/prompts: looks for SKILL.md.
    For references: looks for .md files recursively.

    Returns list of (name, path) tuples. Deduplicates by name (first found wins).
    """
    found = {}  # name -> path (first found wins)
    markers = MARKER_FILES.get(entry_type, ["SKILL.md"])

    if entry_type == "reference":
        # References are individual .md files
        for root, dirs, files in os.walk(scan_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
            for f in sorted(files):
                if f.endswith(".md") and not f.startswith("."):
                    fp = Path(root) / f
                    name = fp.stem
                    if name not in found:
                        found[name] = fp
        return sorted(found.items())

    if entry_type == "prompt":
        for root, dirs, files in os.walk(scan_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
            for f in sorted(files):
                if f.endswith(".md") and not f.startswith("."):
                    fp = Path(root) / f
                    name = fp.stem
                    if name not in found:
                        found[name] = fp
        return sorted(found.items())

    if entry_type == "plugin":
        # Plugins: find dirs containing plugin.json (or .claude-plugin/plugin.json)
        for root, dirs, files in os.walk(scan_dir):
            root_path = Path(root)
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            # Check for plugin.json directly
            if "plugin.json" in files:
                name = root_path.name
                # If this is a .claude-plugin subdir, use parent name
                if name == ".claude-plugin":
                    name = root_path.parent.name
                if name not in found and not name.startswith("."):
                    found[name] = root_path if name != ".claude-plugin" else root_path.parent

            # Check for .claude-plugin/plugin.json
            claude_plugin = root_path / ".claude-plugin" / "plugin.json"
            if claude_plugin.exists():
                name = root_path.name
                if name not in found and not name.startswith("."):
                    found[name] = root_path

        return sorted(found.items())

    # Skills, agents, workflows, prompts: find dirs containing marker files
    for root, dirs, files in os.walk(scan_dir):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for marker in markers:
            if marker in files:
                name = root_path.name
                if name not in found and not name.startswith("."):
                    found[name] = root_path
                break

    return sorted(found.items())


def import_directory(
    catalog: dict,
    scan_dir: Path,
    entry_type: str,
    deploy_scope: str,
    recursive: bool,
    update_existing: bool,
    verbose: bool = False,
) -> tuple[int, int, int, int]:
    """Import or refresh entries from a directory into the catalog."""
    section = TYPE_TO_SECTION[entry_type]
    existing_names = {e["name"] for e in (catalog["library"].get(section) or [])}

    if recursive:
        items = _discover_recursive(scan_dir, entry_type)
    elif entry_type in {"reference", "prompt"}:
        items = [
            (f.stem, f)
            for f in scan_dir.iterdir()
            if f.is_file() and not f.name.startswith(".")
        ]
    else:
        items = [
            (d.name, d)
            for d in scan_dir.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ]

    added = 0
    updated = 0
    skipped = 0

    for name, item_path in sorted(items):
        description = _extract_description(item_path)
        entry = {
            "name": name,
            "description": description,
            "source": str(item_path),
            "type": entry_type,
            "tags": [],
            "requires": [],
            "deploy_scope": deploy_scope,
        }

        if name in existing_names and not update_existing:
            skipped += 1
            if verbose:
                info(f"Skipped (already cataloged): {name}")
            continue

        result = upsert_entry(catalog, entry)
        existing_names.add(name)
        if result == "added":
            added += 1
            if verbose:
                info(f"Added: {name}")
        else:
            updated += 1
            if verbose:
                info(f"Updated: {name}")

    return added, updated, skipped, len(items)


def iter_scan_roots(catalog: dict, filter_type: str | None = None):
    """Yield configured scan roots from library.yaml."""
    for item in catalog.get("scan_roots", []) or []:
        if not isinstance(item, dict):
            continue
        entry_type = item.get("type")
        if entry_type not in VALID_TYPES:
            continue
        if filter_type and entry_type != filter_type:
            continue

        path_value = item.get("path")
        if not path_value:
            continue

        yield {
            "type": entry_type,
            "path": Path(os.path.expanduser(path_value)).resolve(),
            "deploy_scope": item.get("deploy_scope", "global"),
            "recursive": bool(item.get("recursive", True)),
            "runtime": item.get("runtime", "generic"),
        }


def prune_missing_entries(catalog: dict, filter_type: str | None = None) -> int:
    """Remove catalog entries whose local source paths no longer exist."""
    removed = 0

    for entry_type, section in TYPE_TO_SECTION.items():
        if filter_type and entry_type != filter_type:
            continue

        entries = catalog["library"].get(section) or []
        kept = []
        for entry in entries:
            source = entry.get("source", "")
            if source.startswith("https://"):
                kept.append(entry)
                continue

            source_path = Path(os.path.expanduser(source))
            if source_path.exists():
                kept.append(entry)
                continue

            removed += 1
            info(f"Pruned missing {entry_type}: {entry.get('name', '?')}")

        catalog["library"][section] = kept

    return removed


def cmd_import(args):
    """Bulk-scan a directory and add all discovered items to the catalog.

    With --recursive: walks deep into directory trees, finding assets by marker
    files (SKILL.md for skills/workflows, plugin.json for plugins, .md for references).
    Without --recursive: scans only immediate children (original flat behavior).
    """
    catalog = load_catalog()
    scan_dir = Path(os.path.expanduser(args.directory)).resolve()
    entry_type = args.type
    deploy_scope = args.deploy_scope or "global"
    recursive = args.recursive

    if not scan_dir.exists():
        error(f"Directory not found: {scan_dir}")
        sys.exit(1)

    if entry_type not in VALID_TYPES:
        error(f"Invalid type '{entry_type}'. Must be one of: {', '.join(VALID_TYPES)}")
        sys.exit(1)

    added, updated, skipped, total_found = import_directory(
        catalog,
        scan_dir,
        entry_type,
        deploy_scope,
        recursive,
        update_existing=False,
        verbose=True,
    )
    save_catalog(catalog)
    print(
        f"\n  Import complete: {added} added, {updated} updated, "
        f"{skipped} skipped (of {total_found} found)"
    )


def cmd_refresh(args):
    """Refresh catalog entries from configured scan roots."""
    catalog = load_catalog()
    scan_roots = list(iter_scan_roots(catalog, args.type))
    if not scan_roots:
        error("No scan_roots configured. Add scan_roots entries to library.yaml first.")
        sys.exit(1)

    total_added = 0
    total_updated = 0
    total_skipped = 0
    total_found = 0

    for scan in scan_roots:
        if not scan["path"].exists():
            warn(f"Scan root not found ({scan['runtime']}:{scan['type']}): {scan['path']}")
            continue

        info(f"Refreshing {scan['type']} from {scan['path']} ({scan['runtime']})")
        added, updated, skipped, found = import_directory(
            catalog,
            scan["path"],
            scan["type"],
            scan["deploy_scope"],
            scan["recursive"],
            update_existing=True,
            verbose=True,
        )
        total_added += added
        total_updated += updated
        total_skipped += skipped
        total_found += found

    pruned = 0
    if args.prune_missing:
        pruned = prune_missing_entries(catalog, args.type)

    save_catalog(catalog)
    print(
        f"\n  Refresh complete: {total_added} added, {total_updated} updated, "
        f"{total_skipped} unchanged (of {total_found} found)"
    )
    if args.prune_missing:
        print(f"  Pruned missing: {pruned}")


def cmd_use(args):
    """Deploy item(s) from source to target directory. Resolves requires first."""
    catalog = load_catalog()
    scope_override = args.scope

    if args.all:
        lib = catalog.get("library", {})
        entries = []
        for section in lib.values():
            if isinstance(section, list):
                entries.extend(section)
        if not entries:
            error("No entries in catalog.")
            sys.exit(1)

        total = len(entries)
        ok = 0
        fail = 0
        for i, entry in enumerate(entries):
            name = entry["name"]
            try:
                _deploy_entry(catalog, entry, scope_override)
                ok += 1
                info(f"[{i+1}/{total}] Deployed: {name}")
            except SystemExit:
                fail += 1
                error(f"[{i+1}/{total}] Failed: {name}")
            except Exception as e:
                fail += 1
                error(f"[{i+1}/{total}] Failed: {name} — {e}")
        print(f"\n  Deploy complete: {ok} ok, {fail} fail, {total} total")
        return

    name = args.name
    if not name:
        error("Provide a name or use --all to deploy everything.")
        sys.exit(1)

    section_key, idx, entry = find_entry(catalog, name)
    if entry is None:
        error(f"'{name}' not found in catalog. Run 'list' to see available entries.")
        sys.exit(1)

    # Resolve dependencies first
    requires = entry.get("requires", [])
    if requires:
        info(f"Resolving {len(requires)} dependencies for '{name}'...")
        for dep_ref in requires:
            if ":" not in dep_ref:
                warn(f"Malformed dependency '{dep_ref}' — expected 'type:name'. Skipping.")
                continue
            dep_type, dep_name = dep_ref.split(":", 1)
            dep_section, dep_idx, dep_entry = find_entry(catalog, dep_name)
            if dep_entry is None:
                warn(f"Dependency '{dep_name}' not found in catalog. Skipping.")
                continue
            info(f"Installing dependency: {dep_name}")
            _deploy_entry(catalog, dep_entry, scope_override)

    _deploy_entry(catalog, entry, scope_override)
    success(f"Deployed '{name}' successfully.")


def _deploy_entry(catalog: dict, entry: dict, scope_override: str = None):
    """Internal: resolve source and copy to deploy targets."""
    name = entry["name"]
    source = entry["source"]
    entry_type = entry.get("type", "skill")
    scope = scope_override or entry.get("deploy_scope", "global")

    source_path = resolve_source(source)
    if not source_path.exists():
        error(f"Source not found: {source_path}")
        sys.exit(1)

    is_file = source_path.is_file()
    targets = catalog.get("deploy_targets", {}).get(entry_type, [])

    deployed_to = []
    for target_dict in targets:
        for scope_key, path_str in target_dict.items():
            if scope == "both" or scope == scope_key:
                result = deploy_item(source_path, path_str, name, is_file)
                deployed_to.append(str(result))

    if not deployed_to:
        warn(f"No deploy targets matched scope '{scope}' for type '{entry_type}'.")
    else:
        for p in deployed_to:
            info(f"Deployed to: {p}")


def cmd_status(args):
    """Show which items are installed, catalog-only, or have local changes."""
    catalog = load_catalog()
    lib = catalog.get("library", {})

    installed = []
    catalog_only = []
    source_missing = []

    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            name = entry["name"]
            entry_type = entry.get("type", type_key.rstrip("s"))
            targets = resolve_deploy_targets(catalog, entry)

            is_installed = False
            for target_dir in targets:
                target_path = Path(os.path.expanduser(target_dir)) / name
                if target_path.exists():
                    is_installed = True
                    break

            source_path = Path(os.path.expanduser(entry.get("source", "")))
            has_source = source_path.exists() or entry.get("source", "").startswith("https://")

            if is_installed:
                installed.append((entry_type, name))
            elif has_source:
                catalog_only.append((entry_type, name))
            else:
                source_missing.append((entry_type, name, entry.get("source", "?")))

    print(f"\n  INSTALLED ({len(installed)})")
    for t, n in sorted(installed):
        print(f"    [{t:9s}] {n}")

    print(f"\n  CATALOG ONLY ({len(catalog_only)})")
    for t, n in sorted(catalog_only):
        print(f"    [{t:9s}] {n}")

    if source_missing:
        print(f"\n  SOURCE MISSING ({len(source_missing)})")
        for t, n, s in sorted(source_missing):
            print(f"    [{t:9s}] {n} (source: {s})")

    total = len(installed) + len(catalog_only) + len(source_missing)
    print(f"\n  Total: {total} entries")


def cmd_sync(args):
    """Re-deploy all catalog items from their sources."""
    catalog = load_catalog()
    lib = catalog.get("library", {})
    force = args.force

    total = 0
    succeeded = 0
    failed = []

    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            total += 1
            name = entry["name"]

            source = entry.get("source", "")
            if not source:
                warn(f"No source for '{name}'. Skipping.")
                failed.append(name)
                continue

            try:
                info(f"Syncing: {name}")
                _deploy_entry(catalog, entry)
                succeeded += 1
            except SystemExit:
                failed.append(name)
            except Exception as e:
                warn(f"Failed to sync '{name}': {e}")
                failed.append(name)

    print(f"\n  Sync complete: {succeeded}/{total} succeeded")
    if failed:
        print(f"  Failed ({len(failed)}): {', '.join(failed)}")


def cmd_push(args):
    """Copy local sources into assets/, update catalog paths, commit, push to GitHub."""
    catalog = load_catalog()
    lib = catalog.get("library", {})
    remote = args.remote

    # Create assets directory structure
    for type_name in VALID_TYPES:
        section = TYPE_TO_SECTION[type_name]
        type_assets = ASSETS_DIR / section
        type_assets.mkdir(parents=True, exist_ok=True)

    copied = 0
    errors_list = []

    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            name = entry["name"]
            source = entry.get("source", "")

            # Skip entries that already have relative asset paths
            if source.startswith("assets/"):
                continue

            # Skip GitHub URLs — they're already portable
            if source.startswith("https://"):
                continue

            source_path = Path(os.path.expanduser(source))
            if not source_path.exists():
                warn(f"Source missing for '{name}': {source_path}")
                errors_list.append(name)
                continue

            # Copy into assets/<type_section>/<name>
            dest = ASSETS_DIR / type_key / name
            try:
                if source_path.is_file():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_path, dest)
                else:
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(source_path, dest)

                # Update catalog source to relative path
                entry["source"] = f"assets/{type_key}/{name}"
                copied += 1
                info(f"Copied: {name} -> assets/{type_key}/{name}")
            except Exception as e:
                warn(f"Failed to copy '{name}': {e}")
                errors_list.append(name)

    save_catalog(catalog)
    info(f"\nCopied {copied} items into assets/.")

    if errors_list:
        warn(f"Failed: {', '.join(errors_list)}")

    # Git operations
    info("\nCommitting...")
    subprocess.run(["git", "add", "library/"], cwd=str(SCRIPT_DIR.parent), check=False)
    subprocess.run(["git", "add", "library/assets/"], cwd=str(SCRIPT_DIR.parent), check=False)

    result = subprocess.run(
        ["git", "commit", "-m", "library: sync catalog and assets"],
        cwd=str(SCRIPT_DIR.parent), capture_output=True, text=True,
    )
    if result.returncode != 0:
        if "nothing to commit" in result.stdout.lower() or "nothing to commit" in result.stderr.lower():
            info("Nothing to commit — catalog and assets are up to date.")
        else:
            error(f"Git commit failed:\n{result.stderr}")
            sys.exit(1)

    if remote:
        info(f"Pushing to {remote}...")
        subprocess.run(
            ["git", "remote", "add", "library-origin", remote],
            cwd=str(SCRIPT_DIR.parent), capture_output=True, text=True,
        )
        result = subprocess.run(
            ["git", "push", "library-origin", "HEAD"],
            cwd=str(SCRIPT_DIR.parent), capture_output=True, text=True,
        )
        if result.returncode != 0:
            error(f"Git push failed:\n{result.stderr}")
            sys.exit(1)
        success(f"Pushed to {remote}")
    else:
        info("No --remote specified. Committed locally only.")
        info("To push: python library.py push --remote <url>")


# ---------------------------------------------------------------------------
# QA / Validation
# ---------------------------------------------------------------------------
REQUIRED_SKILL_FRONTMATTER = {"name", "description"}


def _validate_skill_md(path: Path) -> list:
    """Validate a SKILL.md file path. Returns list of issues."""
    issues = []
    if not path.exists():
        issues.append("SKILL.md missing")
        return issues
    if path.is_dir():
        path = path / "SKILL.md"
        if not path.exists():
            issues.append("SKILL.md missing")
            return issues

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        issues.append(f"Cannot read SKILL.md: {e}")
        return issues

    if not content.strip():
        issues.append("SKILL.md is empty")
        return issues

    # Check frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            fm_keys = set()
            for line in fm_text.split("\n"):
                if ":" in line:
                    key = line.split(":")[0].strip()
                    fm_keys.add(key)
            missing = REQUIRED_SKILL_FRONTMATTER - fm_keys
            if missing:
                issues.append(f"Frontmatter missing fields: {', '.join(sorted(missing))}")

            # Check description isn't just the name or empty
            for line in fm_text.split("\n"):
                if line.strip().startswith("description:"):
                    desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                    if not desc or desc == "---":
                        issues.append("Frontmatter description is empty")
        else:
            issues.append("Malformed frontmatter (missing closing ---)")
    else:
        issues.append("No YAML frontmatter (must start with ---)")

    # Check has at least one heading
    if "#" not in content:
        issues.append("No headings found in SKILL.md")

    return issues


def _validate_plugin_json(path: Path) -> list:
    """Validate a plugin.json file. Returns list of issues."""
    issues = []

    # Check in dir or .claude-plugin subdir
    candidates = [path / "plugin.json", path / ".claude-plugin" / "plugin.json"]
    plugin_file = None
    for c in candidates:
        if c.exists():
            plugin_file = c
            break

    if not plugin_file:
        issues.append("No plugin.json found")
        return issues

    try:
        with open(plugin_file, "r", encoding="utf-8") as f:
            data = json.loads(f.read())
    except json.JSONDecodeError as e:
        issues.append(f"Invalid JSON in plugin.json: {e}")
        return issues
    except Exception as e:
        issues.append(f"Cannot read plugin.json: {e}")
        return issues

    required = {"name"}
    missing = required - set(data.keys())
    if missing:
        issues.append(f"plugin.json missing fields: {', '.join(sorted(missing))}")

    if not data.get("description"):
        issues.append("plugin.json has no description")

    return issues


def _check_git_version(source_path: Path) -> dict:
    """Check if a git repo at source_path is behind its remote.

    Returns dict with: is_git, local_hash, remote_hash, behind, error
    """
    result = {"is_git": False, "local_hash": None, "remote_hash": None, "behind": False, "error": None}

    # Walk up to find git root (source might be a subdir)
    check_dir = source_path
    git_root = None
    for _ in range(10):
        if (check_dir / ".git").exists():
            git_root = check_dir
            break
        parent = check_dir.parent
        if parent == check_dir:
            break
        check_dir = parent

    if not git_root:
        return result

    result["is_git"] = True

    # Get local HEAD
    try:
        local = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(git_root), capture_output=True, text=True, timeout=5,
        )
        if local.returncode == 0:
            result["local_hash"] = local.stdout.strip()[:12]
    except Exception as e:
        result["error"] = str(e)
        return result

    # Get remote HEAD
    try:
        remote = subprocess.run(
            ["git", "ls-remote", "origin", "HEAD"],
            cwd=str(git_root), capture_output=True, text=True, timeout=15,
        )
        if remote.returncode == 0 and remote.stdout.strip():
            result["remote_hash"] = remote.stdout.strip().split()[0][:12]
            if result["local_hash"] and result["remote_hash"]:
                result["behind"] = result["local_hash"] != result["remote_hash"]
    except subprocess.TimeoutExpired:
        result["error"] = "timeout fetching remote"
    except Exception as e:
        result["error"] = str(e)

    return result


def cmd_validate(args):
    """Validate catalog entries: structure, required fields, and version freshness."""
    catalog = load_catalog()
    lib = catalog.get("library", {})
    check_version = args.check_versions
    filter_type = args.type

    total = 0
    passed = 0
    failed_entries = []
    behind_entries = []

    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            etype = entry.get("type", type_key.rstrip("s"))
            if filter_type and etype != filter_type:
                continue

            total += 1
            name = entry["name"]
            source = entry.get("source", "")
            issues = []

            # Check source exists
            if not source:
                issues.append("No source path")
            else:
                source_path = Path(os.path.expanduser(source))
                if not source_path.exists() and not source.startswith("https://"):
                    issues.append(f"Source not found: {source}")
                elif source_path.exists():
                    # Validate structure based on type
                    if etype in ("skill", "workflow", "agent", "prompt"):
                        if source_path.is_dir():
                            skill_md = source_path / "SKILL.md"
                            if skill_md.exists():
                                issues.extend(_validate_skill_md(skill_md))
                            else:
                                issues.append("No SKILL.md in directory")
                    elif etype == "plugin":
                        issues.extend(_validate_plugin_json(source_path))

                    # Version check
                    if check_version:
                        ver = _check_git_version(source_path)
                        if ver["is_git"] and ver["behind"]:
                            behind_entries.append((name, etype, ver["local_hash"], ver["remote_hash"]))
                        elif ver["error"]:
                            issues.append(f"Version check error: {ver['error']}")

            # Check description quality
            desc = entry.get("description", "")
            if not desc or desc == name:
                issues.append("Description is missing or just the entry name")

            if issues:
                failed_entries.append((name, etype, issues))
            else:
                passed += 1

    # Report
    print(f"\n  === VALIDATION REPORT ===\n")
    print(f"  Scanned: {total}  |  Passed: {passed}  |  Failed: {len(failed_entries)}")

    if behind_entries:
        print(f"\n  OUTDATED ({len(behind_entries)} behind remote):")
        for name, etype, local_h, remote_h in behind_entries:
            print(f"    [{etype:9s}] {name:30s} local: {local_h}  remote: {remote_h}")

    if failed_entries:
        print(f"\n  ISSUES ({len(failed_entries)}):")
        for name, etype, issues in failed_entries[:50]:  # Cap output at 50
            print(f"    [{etype:9s}] {name}")
            for issue in issues:
                print(f"              ! {issue}")
        if len(failed_entries) > 50:
            print(f"\n    ... and {len(failed_entries) - 50} more")

    if not failed_entries and not behind_entries:
        print("\n  All entries passed validation.")

    print()


def cmd_check_updates(args):
    """Check all git-backed sources for newer versions on remote."""
    catalog = load_catalog()
    lib = catalog.get("library", {})

    # Deduplicate by git root — many entries share the same repo
    git_roots = {}  # git_root_path -> (name, remote_url)
    for type_key, entries in lib.items():
        if not entries:
            continue
        for entry in entries:
            source = entry.get("source", "")
            if not source or source.startswith("https://"):
                continue
            source_path = Path(os.path.expanduser(source))
            if not source_path.exists():
                continue

            # Walk up to find git root
            check_dir = source_path
            for _ in range(10):
                if (check_dir / ".git").exists():
                    root_str = str(check_dir)
                    if root_str not in git_roots:
                        # Get remote URL
                        try:
                            r = subprocess.run(
                                ["git", "remote", "get-url", "origin"],
                                cwd=root_str, capture_output=True, text=True, timeout=5,
                            )
                            remote_url = r.stdout.strip() if r.returncode == 0 else "unknown"
                        except Exception:
                            remote_url = "unknown"
                        git_roots[root_str] = (check_dir.name, remote_url)
                    break
                parent = check_dir.parent
                if parent == check_dir:
                    break
                check_dir = parent

    if not git_roots:
        info("No git-backed sources found.")
        return

    print(f"\n  Checking {len(git_roots)} git repositories for updates...\n")

    up_to_date = 0
    behind = []
    errors = []

    for root_path, (name, remote_url) in sorted(git_roots.items()):
        ver = _check_git_version(Path(root_path))
        if ver["error"]:
            errors.append((name, ver["error"]))
        elif ver["behind"]:
            behind.append((name, root_path, ver["local_hash"], ver["remote_hash"], remote_url))
        else:
            up_to_date += 1

    print(f"  Up to date: {up_to_date}  |  Behind: {len(behind)}  |  Errors: {len(errors)}")

    if behind:
        print(f"\n  UPDATES AVAILABLE ({len(behind)}):")
        for name, root_path, local_h, remote_h, remote_url in behind:
            print(f"    {name:35s} {local_h} -> {remote_h}")
            print(f"    {'':35s} cd \"{root_path}\" && git pull")

    if errors:
        print(f"\n  ERRORS ({len(errors)}):")
        for name, err in errors:
            print(f"    {name:35s} {err}")

    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        prog="library",
        description="Package manager for agentic assets.",
    )
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # init
    sub.add_parser("init", help="Create library.yaml with default deploy targets")

    # add
    p_add = sub.add_parser("add", help="Register a new entry in the catalog")
    p_add.add_argument("--name", required=True, help="Unique identifier")
    p_add.add_argument("--type", required=True, choices=VALID_TYPES, help="Asset type")
    p_add.add_argument("--source", required=True, help="Path or GitHub URL")
    p_add.add_argument("--description", default="", help="One-line description")
    p_add.add_argument("--tags", default="", help="Comma-separated tags")
    p_add.add_argument("--requires", default="", help="Comma-separated type:name dependencies")
    p_add.add_argument("--deploy-scope", default="global", choices=VALID_SCOPES, help="Deployment scope")

    # list
    p_list = sub.add_parser("list", help="Show catalog entries")
    p_list.add_argument("--type", choices=VALID_TYPES, help="Filter by type")
    p_list.add_argument("--tag", help="Filter by tag")
    p_list.add_argument("--json", action="store_true", help="Output as JSON")

    # search
    p_search = sub.add_parser("search", help="Search catalog by keyword")
    p_search.add_argument("query", help="Search term")

    # remove
    p_remove = sub.add_parser("remove", help="Remove entry from catalog")
    p_remove.add_argument("name", help="Entry name to remove")
    p_remove.add_argument("--delete-files", action="store_true", help="Also delete deployed files")
    p_remove.add_argument("--confirm", action="store_true", help="Required with --delete-files")

    # import
    p_import = sub.add_parser("import", help="Bulk-scan directory and add items to catalog")
    p_import.add_argument("directory", help="Directory to scan")
    p_import.add_argument("--type", required=True, choices=VALID_TYPES, help="Asset type for discovered items")
    p_import.add_argument("--deploy-scope", default="global", choices=VALID_SCOPES, help="Deployment scope")
    p_import.add_argument("--recursive", action="store_true", help="Walk deep into directory tree, find assets by marker files (SKILL.md, plugin.json)")

    # use
    p_use = sub.add_parser("use", help="Deploy item(s) from source to target directory")
    p_use.add_argument("name", nargs="?", default=None, help="Entry name to deploy (omit with --all)")
    p_use.add_argument("--scope", choices=VALID_SCOPES, help="Override deploy scope")
    p_use.add_argument("--all", action="store_true", help="Deploy all catalog entries")

    # status
    sub.add_parser("status", help="Show install status of catalog entries")

    # sync
    p_sync = sub.add_parser("sync", help="Re-deploy all installed items from source")
    p_sync.add_argument("--force", action="store_true", help="Overwrite local changes")

    # refresh
    p_refresh = sub.add_parser("refresh", help="Refresh catalog from configured scan_roots")
    p_refresh.add_argument("--type", choices=VALID_TYPES, help="Filter refresh to one asset type")
    p_refresh.add_argument("--prune-missing", action="store_true", help="Remove catalog entries whose local sources no longer exist")

    # push
    p_push = sub.add_parser("push", help="Copy sources into assets/, commit, push to GitHub")
    p_push.add_argument("--remote", help="GitHub remote URL to push to")

    # validate
    p_validate = sub.add_parser("validate", help="Validate catalog entries: structure, fields, versions")
    p_validate.add_argument("--type", choices=VALID_TYPES, help="Filter by type")
    p_validate.add_argument("--check-versions", action="store_true", help="Check git repos for newer remote versions (slower, needs network)")

    # check-updates
    sub.add_parser("check-updates", help="Check all git-backed sources for newer versions on remote")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "init": cmd_init,
        "add": cmd_add,
        "list": cmd_list,
        "search": cmd_search,
        "remove": cmd_remove,
        "import": cmd_import,
        "use": cmd_use,
        "status": cmd_status,
        "sync": cmd_sync,
        "refresh": cmd_refresh,
        "push": cmd_push,
        "validate": cmd_validate,
        "check-updates": cmd_check_updates,
    }
    with contextlib.suppress(BrokenPipeError):
        commands[args.command](args)


if __name__ == "__main__":
    main()
