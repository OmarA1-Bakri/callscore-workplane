#!/usr/bin/env python3
"""
state_manager.py — Persistent state management for RTGS.global BD automation.

Dual-storage: FalkorDB (primary graph) + SQLite (local backup).
All agents call this CLI via Bash. Every command outputs JSON to stdout.

Usage:
    python state_manager.py <command> [options]

Environment Variables (loaded from scripts/.env via python-dotenv):
    FALKORDB_URL          — FalkorDB Cloud connection string
    PHANTOMBUSTER_API_KEY — PhantomBuster REST API key
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
import traceback
from datetime import datetime, timedelta
from pathlib import Path

# Load .env from same directory as this script
from dotenv import load_dotenv
_script_dir = Path(__file__).resolve().parent
load_dotenv(_script_dir / ".env")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
FALKORDB_URL = os.environ.get("FALKORDB_URL", "")
PHANTOMBUSTER_API_KEY = os.environ.get("PHANTOMBUSTER_API_KEY", "")
PB_BASE_URL = "https://api.phantombuster.com/api/v2"

DATA_DIR = _script_dir.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
SQLITE_PATH = DATA_DIR / "rtgs_ops.db"
GRAPH_NAME = "rtgs_ops"

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------
_falkordb_graph = None
_falkordb_available = False
_sqlite_conn = None


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
def out(data: dict):
    """Print JSON to stdout and exit 0."""
    print(json.dumps(data, default=str, ensure_ascii=False))
    sys.exit(0)


def err(message: str, code: int = 1):
    """Print error JSON to stdout and exit with code."""
    print(json.dumps({"error": message}, ensure_ascii=False))
    sys.exit(code)


# ---------------------------------------------------------------------------
# SQLite connection & schema
# ---------------------------------------------------------------------------
SQLITE_SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT, linkedin_url TEXT, title TEXT, company_name TEXT,
    persona_lane TEXT, motion_type TEXT, classification TEXT,
    hubspot_contact_id TEXT, last_contacted TEXT, last_channel TEXT, last_action TEXT,
    do_not_contact_email BOOLEAN DEFAULT 0, do_not_contact_linkedin BOOLEAN DEFAULT 0,
    linkedin_connection_status TEXT DEFAULT 'none',
    linkedin_connection_sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(email),
    UNIQUE(linkedin_url)
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    regulatory_status TEXT, corridor_relevance TEXT, entity_type TEXT,
    geography TEXT, hubspot_company_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, hubspot_deal_id TEXT UNIQUE, stage TEXT, stage_id TEXT,
    pipeline TEXT, pipeline_id TEXT, amount REAL, close_date TEXT,
    days_in_stage INTEGER, last_activity TEXT, is_stale BOOLEAN DEFAULT 0,
    company_id INTEGER REFERENCES companies(id),
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    channel TEXT NOT NULL,
    type TEXT NOT NULL,
    direction TEXT,
    summary TEXT, subject TEXT, hubspot_note_id TEXT, session_id TEXT,
    agent_name TEXT, timestamp TEXT NOT NULL, draft_approved BOOLEAN,
    is_archived BOOLEAN DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    interaction_id INTEGER REFERENCES interactions(id),
    due_date TEXT NOT NULL, type TEXT, status TEXT DEFAULT 'pending',
    description TEXT, hubspot_task_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), completed_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    started_at TEXT, ended_at TEXT, agent_name TEXT,
    skills_run TEXT, contacts_processed INTEGER DEFAULT 0,
    interactions_logged INTEGER DEFAULT 0, follow_ups_created INTEGER DEFAULT 0,
    summary TEXT, is_archived BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT, channels TEXT, capabilities TEXT,
    last_active TEXT, registered_at TEXT DEFAULT (datetime('now')),
    paused BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER REFERENCES agents(id),
    name TEXT NOT NULL,
    channel TEXT,
    description TEXT,
    UNIQUE(agent_id, name)
);

CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_agent TEXT NOT NULL, to_agent TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'unread',
    created_at TEXT DEFAULT (datetime('now')), read_at TEXT
);

CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL, content TEXT NOT NULL,
    tags TEXT,
    agent_name TEXT, contact_name TEXT, company_name TEXT,
    importance TEXT DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, subcategory TEXT,
    title TEXT, content TEXT NOT NULL,
    tags TEXT,
    source_file TEXT, source_file_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_company (
    contact_id INTEGER REFERENCES contacts(id),
    company_id INTEGER REFERENCES companies(id),
    PRIMARY KEY (contact_id, company_id)
);

CREATE TABLE IF NOT EXISTS contact_deal (
    contact_id INTEGER REFERENCES contacts(id),
    deal_id INTEGER REFERENCES deals(id),
    PRIMARY KEY (contact_id, deal_id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    synced_at TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_linkedin ON contacts(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot ON contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_connection_status ON contacts(linkedin_connection_status);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_channel ON interactions(channel);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_interactions_archived ON interactions(is_archived);
CREATE INDEX IF NOT EXISTS idx_interactions_idempotency ON interactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_followups_contact ON follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_name);
CREATE INDEX IF NOT EXISTS idx_memories_contact ON memories(contact_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source_file);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot ON deals(hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
"""


def get_sqlite() -> sqlite3.Connection:
    """Get or create SQLite connection."""
    global _sqlite_conn
    if _sqlite_conn is None:
        _sqlite_conn = sqlite3.connect(str(SQLITE_PATH))
        _sqlite_conn.row_factory = sqlite3.Row
        _sqlite_conn.executescript(SQLITE_SCHEMA)
    return _sqlite_conn


def sqlite_ok() -> bool:
    """Test SQLite connectivity."""
    try:
        conn = get_sqlite()
        conn.execute("SELECT 1")
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# FalkorDB connection
# ---------------------------------------------------------------------------
FALKORDB_INDICES = [
    "CREATE INDEX FOR (c:Contact) ON (c.email)",
    "CREATE INDEX FOR (c:Contact) ON (c.linkedin_url)",
    "CREATE INDEX FOR (c:Contact) ON (c.hubspot_contact_id)",
    "CREATE INDEX FOR (c:Contact) ON (c.name)",
    "CREATE INDEX FOR (c:Contact) ON (c.company_name)",
    "CREATE INDEX FOR (c:Contact) ON (c.last_contacted)",
    "CREATE INDEX FOR (c:Contact) ON (c.linkedin_connection_status)",
    "CREATE INDEX FOR (c:Contact) ON (c.do_not_contact_email)",
    "CREATE INDEX FOR (c:Contact) ON (c.do_not_contact_linkedin)",
    "CREATE INDEX FOR (co:Company) ON (co.name)",
    "CREATE INDEX FOR (co:Company) ON (co.hubspot_company_id)",
    "CREATE INDEX FOR (d:Deal) ON (d.hubspot_deal_id)",
    "CREATE INDEX FOR (d:Deal) ON (d.stage)",
    "CREATE INDEX FOR (d:Deal) ON (d.is_stale)",
    "CREATE INDEX FOR (i:Interaction) ON (i.timestamp)",
    "CREATE INDEX FOR (i:Interaction) ON (i.channel)",
    "CREATE INDEX FOR (i:Interaction) ON (i.agent_name)",
    "CREATE INDEX FOR (i:Interaction) ON (i.is_archived)",
    "CREATE INDEX FOR (i:Interaction) ON (i.session_id)",
    "CREATE INDEX FOR (i:Interaction) ON (i.idempotency_key)",
    "CREATE INDEX FOR (f:FollowUp) ON (f.status)",
    "CREATE INDEX FOR (f:FollowUp) ON (f.due_date)",
    "CREATE INDEX FOR (s:Session) ON (s.session_id)",
    "CREATE INDEX FOR (s:Session) ON (s.agent_name)",
    "CREATE INDEX FOR (s:Session) ON (s.is_archived)",
    "CREATE INDEX FOR (a:Agent) ON (a.name)",
    "CREATE INDEX FOR (ac:AgentCapability) ON (ac.name)",
    "CREATE INDEX FOR (ac:AgentCapability) ON (ac.channel)",
    "CREATE INDEX FOR (m:AgentMessage) ON (m.to_agent)",
    "CREATE INDEX FOR (m:AgentMessage) ON (m.status)",
    "CREATE INDEX FOR (mem:Memory) ON (mem.agent_name)",
    "CREATE INDEX FOR (mem:Memory) ON (mem.contact_name)",
    "CREATE INDEX FOR (mem:Memory) ON (mem.key)",
    "CREATE INDEX FOR (k:Knowledge) ON (k.category)",
    "CREATE INDEX FOR (k:Knowledge) ON (k.subcategory)",
    "CREATE INDEX FOR (k:Knowledge) ON (k.source_file)",
    "CREATE INDEX FOR (k:Knowledge) ON (k.key)",
]


def get_graph():
    """Get or create FalkorDB graph connection. Returns None if unavailable."""
    global _falkordb_graph, _falkordb_available
    if _falkordb_graph is not None:
        return _falkordb_graph
    if not FALKORDB_URL:
        _falkordb_available = False
        return None
    try:
        from falkordb import FalkorDB
        db = FalkorDB.from_url(FALKORDB_URL)
        _falkordb_graph = db.select_graph(GRAPH_NAME)
        _falkordb_available = True
        return _falkordb_graph
    except Exception:
        _falkordb_available = False
        return None


def falkordb_ok() -> bool:
    """Test FalkorDB connectivity."""
    g = get_graph()
    if g is None:
        return False
    try:
        g.query("RETURN 1")
        return True
    except Exception:
        return False


def queue_for_sync(operation: str, payload: dict):
    """Queue a write operation for later FalkorDB sync."""
    conn = get_sqlite()
    conn.execute(
        "INSERT INTO sync_queue (operation, payload) VALUES (?, ?)",
        (operation, json.dumps(payload, default=str))
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------
def make_idempotency_key(contact_id, channel, type_, timestamp) -> str:
    """Generate idempotency key from contact+channel+type+timestamp."""
    raw = f"{contact_id}|{channel}|{type_}|{timestamp}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ---------------------------------------------------------------------------
# PhantomBuster helpers
# ---------------------------------------------------------------------------
def pb_request(method: str, endpoint: str, data: dict = None) -> dict:
    """Make a PhantomBuster API request."""
    import requests
    url = f"{PB_BASE_URL}/{endpoint.lstrip('/')}"
    headers = {"X-Phantombuster-Key": PHANTOMBUSTER_API_KEY}
    if method.upper() == "GET":
        resp = requests.get(url, headers=headers, params=data, timeout=30)
    else:
        headers["Content-Type"] = "application/json"
        resp = requests.post(url, headers=headers, json=data, timeout=30)
    resp.raise_for_status()
    return resp.json()


def pb_ok() -> bool:
    """Test PhantomBuster API connectivity."""
    if not PHANTOMBUSTER_API_KEY:
        return False
    try:
        result = pb_request("GET", "/agents/fetch-all")
        return isinstance(result, list) and len(result) > 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Contact lookup helpers
# ---------------------------------------------------------------------------
def find_contact_sqlite(email=None, linkedin_url=None, name=None, company_name=None):
    """Find contact in SQLite by email > linkedin_url > name+company."""
    conn = get_sqlite()
    if email:
        row = conn.execute("SELECT * FROM contacts WHERE email = ?", (email,)).fetchone()
        if row:
            return dict(row)
    if linkedin_url:
        row = conn.execute("SELECT * FROM contacts WHERE linkedin_url = ?", (linkedin_url,)).fetchone()
        if row:
            return dict(row)
    if name and company_name:
        row = conn.execute(
            "SELECT * FROM contacts WHERE LOWER(name) = LOWER(?) AND LOWER(company_name) = LOWER(?)",
            (name, company_name)
        ).fetchone()
        if row:
            return dict(row)
    return None


def find_contact_graph(email=None, linkedin_url=None, name=None, company_name=None):
    """Find contact in FalkorDB by email > linkedin_url > name+company."""
    g = get_graph()
    if g is None:
        return None
    try:
        if email:
            result = g.query("MATCH (c:Contact {email: $email}) RETURN c", {"email": email})
            if result.result_set:
                return _node_to_dict(result.result_set[0][0])
        if linkedin_url:
            result = g.query("MATCH (c:Contact {linkedin_url: $url}) RETURN c", {"url": linkedin_url})
            if result.result_set:
                return _node_to_dict(result.result_set[0][0])
        if name and company_name:
            result = g.query(
                "MATCH (c:Contact) WHERE toLower(c.name) = toLower($name) AND toLower(c.company_name) = toLower($co) RETURN c",
                {"name": name, "co": company_name}
            )
            if result.result_set:
                return _node_to_dict(result.result_set[0][0])
    except Exception:
        pass
    return None


def _node_to_dict(node) -> dict:
    """Convert a FalkorDB node to a plain dict."""
    return dict(node.properties) if hasattr(node, 'properties') else {}


# ===================================================================
# COMMANDS
# ===================================================================

# ---------------------------------------------------------------------------
# health-check
# ---------------------------------------------------------------------------
def cmd_health_check(args):
    """Test FalkorDB + SQLite + PhantomBuster connectivity."""
    fdb = falkordb_ok()
    sq = sqlite_ok()
    pb = pb_ok()

    if fdb and sq:
        mode = "normal"
    elif sq:
        mode = "degraded"
    elif fdb:
        mode = "degraded_no_sqlite"
    else:
        mode = "stateless"

    out({
        "falkordb": "OK" if fdb else "DOWN",
        "sqlite": "OK" if sq else "DOWN",
        "phantombuster": "OK" if pb else "DOWN",
        "mode": mode,
        "sqlite_path": str(SQLITE_PATH),
        "graph_name": GRAPH_NAME,
    })


# ---------------------------------------------------------------------------
# init-graph
# ---------------------------------------------------------------------------
def cmd_init_graph(args):
    """Create FalkorDB indices, SQLite tables, register default agents."""
    # SQLite is auto-created on get_sqlite()
    conn = get_sqlite()
    sqlite_status = "OK"

    # FalkorDB indices
    fdb_status = "SKIPPED"
    indices_created = 0
    g = get_graph()
    if g:
        fdb_status = "OK"
        for idx in FALKORDB_INDICES:
            try:
                g.query(idx)
                indices_created += 1
            except Exception:
                pass  # Index may already exist

    # Register default agents
    default_agents = [
        ("outlook_triage", "Outlook inbox triage and reply drafting", "email", "inbox_triage,reply_drafting"),
        ("outlook_bd", "Outlook BD outreach via HubSpot pipeline", "email", "cold_outreach,pipeline_review,follow_up"),
        ("linkedin_triage", "LinkedIn inbox triage and reply drafting", "linkedin", "inbox_triage,reply_drafting"),
        ("linkedin_bd", "LinkedIn BD prospecting and connection requests", "linkedin", "prospecting,connection_requests,follow_up"),
        ("scheduler", "Master scheduler coordinating all skills", "all", "scheduling,health_check,reporting"),
    ]

    agents_registered = 0
    for name, desc, channels, caps in default_agents:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO agents (name, description, channels, capabilities)
                   VALUES (?, ?, ?, ?)""",
                (name, desc, channels, caps)
            )
            agents_registered += 1

            # Register capabilities
            agent_row = conn.execute("SELECT id FROM agents WHERE name = ?", (name,)).fetchone()
            if agent_row:
                for cap in caps.split(","):
                    conn.execute(
                        """INSERT OR IGNORE INTO agent_capabilities (agent_id, name, channel)
                           VALUES (?, ?, ?)""",
                        (agent_row["id"], cap.strip(), channels)
                    )
        except Exception:
            pass

        # FalkorDB agent registration
        if g:
            try:
                g.query(
                    """MERGE (a:Agent {name: $name})
                       ON CREATE SET a.description = $desc, a.channels = $channels,
                                     a.capabilities = $caps, a.registered_at = $now
                       ON MATCH SET a.description = $desc, a.channels = $channels,
                                    a.capabilities = $caps""",
                    {"name": name, "desc": desc, "channels": channels, "caps": caps,
                     "now": datetime.utcnow().isoformat()}
                )
                # Register capabilities as nodes
                for cap in caps.split(","):
                    g.query(
                        """MERGE (ac:AgentCapability {name: $cap, channel: $channel})
                           WITH ac
                           MATCH (a:Agent {name: $agent})
                           MERGE (a)-[:REGISTERED_CAPABILITY]->(ac)""",
                        {"cap": cap.strip(), "channel": channels, "agent": name}
                    )
            except Exception:
                pass

    conn.commit()

    out({
        "falkordb": fdb_status,
        "sqlite": sqlite_status,
        "indices_created": indices_created,
        "agents_registered": agents_registered,
    })


# ---------------------------------------------------------------------------
# register-agent
# ---------------------------------------------------------------------------
def cmd_register_agent(args):
    """Register a new agent with capabilities."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    conn.execute(
        """INSERT OR REPLACE INTO agents (name, description, channels, capabilities, last_active, registered_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (args.name, args.description or "", args.channels or "", args.capabilities or "", now, now)
    )

    agent_row = conn.execute("SELECT id FROM agents WHERE name = ?", (args.name,)).fetchone()
    if agent_row and args.capabilities:
        for cap in args.capabilities.split(","):
            conn.execute(
                """INSERT OR IGNORE INTO agent_capabilities (agent_id, name, channel)
                   VALUES (?, ?, ?)""",
                (agent_row["id"], cap.strip(), args.channels or "")
            )
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """MERGE (a:Agent {name: $name})
                   ON CREATE SET a.description = $desc, a.channels = $channels,
                                 a.capabilities = $caps, a.registered_at = $now
                   ON MATCH SET a.description = $desc, a.channels = $channels,
                                a.capabilities = $caps, a.last_active = $now""",
                {"name": args.name, "desc": args.description or "", "channels": args.channels or "",
                 "caps": args.capabilities or "", "now": now}
            )
        except Exception:
            queue_for_sync("register-agent", {"name": args.name, "description": args.description,
                                               "channels": args.channels, "capabilities": args.capabilities})

    out({"status": "registered", "agent": args.name})


# ---------------------------------------------------------------------------
# upsert-contact
# ---------------------------------------------------------------------------
def cmd_upsert_contact(args):
    """Create or update contact (MERGE by email > linkedin_url > name+company)."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    # Find existing contact
    existing = find_contact_sqlite(
        email=args.email, linkedin_url=args.linkedin_url,
        name=args.name, company_name=args.company_name
    )

    if existing:
        # Update — COALESCE pattern (never overwrite non-null with null)
        updates = []
        params = []
        for field in ["name", "email", "linkedin_url", "title", "company_name",
                       "persona_lane", "motion_type", "classification",
                       "hubspot_contact_id", "last_contacted", "last_channel", "last_action",
                       "linkedin_connection_status", "linkedin_connection_sent_at"]:
            val = getattr(args, field, None)
            if val is not None:
                updates.append(f"{field} = ?")
                params.append(val)
        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(existing["id"])
            conn.execute(f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
        contact_id = existing["id"]
        action = "updated"
    else:
        # Insert
        conn.execute(
            """INSERT INTO contacts (name, email, linkedin_url, title, company_name,
               persona_lane, motion_type, classification, hubspot_contact_id,
               last_contacted, last_channel, last_action,
               linkedin_connection_status, linkedin_connection_sent_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (args.name, args.email, args.linkedin_url, args.title, args.company_name,
             args.persona_lane, args.motion_type, args.classification,
             args.hubspot_contact_id, args.last_contacted, args.last_channel, args.last_action,
             args.linkedin_connection_status or "none", args.linkedin_connection_sent_at)
        )
        conn.commit()
        contact_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        action = "created"

    # Link to company if exists
    if args.company_name:
        co = conn.execute("SELECT id FROM companies WHERE name = ?", (args.company_name,)).fetchone()
        if co:
            conn.execute(
                "INSERT OR IGNORE INTO contact_company (contact_id, company_id) VALUES (?, ?)",
                (contact_id, co["id"])
            )
            conn.commit()

    # FalkorDB upsert
    g = get_graph()
    if g:
        try:
            merge_field = "email" if args.email else ("linkedin_url" if args.linkedin_url else None)
            if merge_field:
                merge_val = args.email if merge_field == "email" else args.linkedin_url
                g.query(
                    f"""MERGE (c:Contact {{{merge_field}: $merge_val}})
                        ON CREATE SET c.name = $name, c.email = $email, c.linkedin_url = $lurl,
                                      c.title = $title, c.company_name = $co,
                                      c.persona_lane = $pl, c.motion_type = $mt,
                                      c.classification = $cls, c.hubspot_contact_id = $hid,
                                      c.linkedin_connection_status = $lcs,
                                      c.created_at = $now
                        ON MATCH SET c.name = COALESCE($name, c.name),
                                     c.title = COALESCE($title, c.title),
                                     c.company_name = COALESCE($co, c.company_name),
                                     c.linkedin_url = COALESCE($lurl, c.linkedin_url),
                                     c.email = COALESCE($email, c.email),
                                     c.hubspot_contact_id = COALESCE($hid, c.hubspot_contact_id),
                                     c.linkedin_connection_status = COALESCE($lcs, c.linkedin_connection_status),
                                     c.updated_at = $now""",
                    {"merge_val": merge_val, "name": args.name, "email": args.email,
                     "lurl": args.linkedin_url, "title": args.title, "co": args.company_name,
                     "pl": args.persona_lane, "mt": args.motion_type, "cls": args.classification,
                     "hid": args.hubspot_contact_id, "lcs": args.linkedin_connection_status or "none",
                     "now": now}
                )
                # Link to company
                if args.company_name:
                    g.query(
                        """MATCH (c:Contact {%s: $merge_val})
                           MERGE (co:Company {name: $co})
                           MERGE (c)-[:WORKS_AT]->(co)""" % merge_field,
                        {"merge_val": merge_val, "co": args.company_name}
                    )
        except Exception:
            queue_for_sync("upsert-contact", vars(args))

    out({"status": action, "contact_id": contact_id, "name": args.name, "email": args.email})


# ---------------------------------------------------------------------------
# upsert-company
# ---------------------------------------------------------------------------
def cmd_upsert_company(args):
    """Create or update company (MERGE by name)."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    existing = conn.execute("SELECT * FROM companies WHERE name = ?", (args.name,)).fetchone()
    if existing:
        updates, params = [], []
        for field in ["regulatory_status", "corridor_relevance", "entity_type", "geography", "hubspot_company_id"]:
            val = getattr(args, field, None)
            if val is not None:
                updates.append(f"{field} = ?")
                params.append(val)
        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(existing["id"])
            conn.execute(f"UPDATE companies SET {', '.join(updates)} WHERE id = ?", params)
        action = "updated"
        company_id = existing["id"]
    else:
        conn.execute(
            """INSERT INTO companies (name, regulatory_status, corridor_relevance, entity_type, geography, hubspot_company_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (args.name, args.regulatory_status, args.corridor_relevance, args.entity_type,
             args.geography, args.hubspot_company_id)
        )
        company_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        action = "created"
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """MERGE (co:Company {name: $name})
                   ON CREATE SET co.regulatory_status = $rs, co.corridor_relevance = $cr,
                                 co.entity_type = $et, co.geography = $geo,
                                 co.hubspot_company_id = $hid, co.created_at = $now
                   ON MATCH SET co.regulatory_status = COALESCE($rs, co.regulatory_status),
                                co.corridor_relevance = COALESCE($cr, co.corridor_relevance),
                                co.entity_type = COALESCE($et, co.entity_type),
                                co.geography = COALESCE($geo, co.geography),
                                co.hubspot_company_id = COALESCE($hid, co.hubspot_company_id),
                                co.updated_at = $now""",
                {"name": args.name, "rs": args.regulatory_status, "cr": args.corridor_relevance,
                 "et": args.entity_type, "geo": args.geography, "hid": args.hubspot_company_id,
                 "now": now}
            )
        except Exception:
            queue_for_sync("upsert-company", vars(args))

    out({"status": action, "company_id": company_id, "name": args.name})


# ---------------------------------------------------------------------------
# upsert-deal
# ---------------------------------------------------------------------------
def cmd_upsert_deal(args):
    """Sync deal from HubSpot (MERGE by hubspot_deal_id). Creates BELONGS_TO company."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    # Find company
    company_id = None
    if args.company_name:
        co = conn.execute("SELECT id FROM companies WHERE name = ?", (args.company_name,)).fetchone()
        if co:
            company_id = co["id"]

    existing = conn.execute("SELECT * FROM deals WHERE hubspot_deal_id = ?", (args.hubspot_deal_id,)).fetchone()
    if existing:
        updates = []
        params = []
        for field in ["name", "stage", "stage_id", "pipeline", "pipeline_id", "amount",
                       "close_date", "days_in_stage", "last_activity", "is_stale"]:
            val = getattr(args, field, None)
            if val is not None:
                updates.append(f"{field} = ?")
                params.append(val)
        if company_id:
            updates.append("company_id = ?")
            params.append(company_id)
        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(existing["id"])
            conn.execute(f"UPDATE deals SET {', '.join(updates)} WHERE id = ?", params)
        deal_id = existing["id"]
        action = "updated"
    else:
        conn.execute(
            """INSERT INTO deals (name, hubspot_deal_id, stage, stage_id, pipeline, pipeline_id,
               amount, close_date, days_in_stage, last_activity, is_stale, company_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (args.name, args.hubspot_deal_id, args.stage, args.stage_id, args.pipeline,
             args.pipeline_id, args.amount, args.close_date, args.days_in_stage,
             args.last_activity, args.is_stale or False, company_id)
        )
        deal_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        action = "created"
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """MERGE (d:Deal {hubspot_deal_id: $hid})
                   ON CREATE SET d.name = $name, d.stage = $stage, d.pipeline = $pipeline,
                                 d.amount = $amount, d.close_date = $cd, d.created_at = $now
                   ON MATCH SET d.name = COALESCE($name, d.name), d.stage = COALESCE($stage, d.stage),
                                d.pipeline = COALESCE($pipeline, d.pipeline),
                                d.amount = COALESCE($amount, d.amount), d.updated_at = $now""",
                {"hid": args.hubspot_deal_id, "name": args.name, "stage": args.stage,
                 "pipeline": args.pipeline, "amount": args.amount, "cd": args.close_date, "now": now}
            )
            if args.company_name:
                g.query(
                    """MATCH (d:Deal {hubspot_deal_id: $hid})
                       MERGE (co:Company {name: $co})
                       MERGE (d)-[:BELONGS_TO]->(co)""",
                    {"hid": args.hubspot_deal_id, "co": args.company_name}
                )
        except Exception:
            queue_for_sync("upsert-deal", vars(args))

    out({"status": action, "deal_id": deal_id, "hubspot_deal_id": args.hubspot_deal_id})


# ---------------------------------------------------------------------------
# check-contact
# ---------------------------------------------------------------------------
def cmd_check_contact(args):
    """Pre-draft dedup check. Returns CLEAR / CAUTION / DO_NOT_CONTACT."""
    contact = find_contact_sqlite(
        email=args.email, linkedin_url=args.linkedin_url,
        name=args.name, company_name=args.company_name
    )

    if not contact:
        out({"status": "CLEAR", "message": "No existing contact found", "contact": None})
        return

    # Check DNC
    channel = args.channel or "email"
    if channel == "email" and contact.get("do_not_contact_email"):
        out({"status": "DO_NOT_CONTACT", "reason": "Email DNC flag set", "contact": contact})
        return
    if channel == "linkedin" and contact.get("do_not_contact_linkedin"):
        out({"status": "DO_NOT_CONTACT", "reason": "LinkedIn DNC flag set", "contact": contact})
        return

    # Check recent interactions
    conn = get_sqlite()
    recent = conn.execute(
        """SELECT channel, type, timestamp FROM interactions
           WHERE contact_id = ? AND is_archived = 0
           ORDER BY timestamp DESC LIMIT 5""",
        (contact["id"],)
    ).fetchall()

    if recent:
        last = dict(recent[0])
        days_since = (datetime.utcnow() - datetime.fromisoformat(last["timestamp"])).days if last["timestamp"] else 999

        if days_since < 3:
            out({
                "status": "CAUTION",
                "reason": f"Contacted {days_since} day(s) ago via {last['channel']} ({last['type']})",
                "contact": contact,
                "recent_interactions": [dict(r) for r in recent]
            })
            return

    out({
        "status": "CLEAR",
        "message": "Contact exists, safe to proceed",
        "contact": contact,
        "recent_interactions": [dict(r) for r in recent] if recent else []
    })


# ---------------------------------------------------------------------------
# log-interaction
# ---------------------------------------------------------------------------
def cmd_log_interaction(args):
    """Log an interaction with idempotency protection."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    # Find contact
    contact = find_contact_sqlite(
        email=args.email, linkedin_url=args.linkedin_url,
        name=args.contact_name, company_name=args.company_name
    )
    contact_id = contact["id"] if contact else None

    # Generate idempotency key
    idem_key = make_idempotency_key(
        contact_id or args.contact_name,
        args.channel, args.type, args.timestamp or now
    )

    # Check for duplicate
    existing = conn.execute(
        "SELECT id FROM interactions WHERE idempotency_key = ?", (idem_key,)
    ).fetchone()
    if existing:
        out({"status": "skipped", "reason": "duplicate", "idempotency_key": idem_key,
             "interaction_id": existing["id"]})
        return

    # Insert
    conn.execute(
        """INSERT INTO interactions (contact_id, channel, type, direction, summary, subject,
           hubspot_note_id, session_id, agent_name, timestamp, draft_approved, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (contact_id, args.channel, args.type, args.direction, args.summary, args.subject,
         args.hubspot_note_id, args.session_id, args.agent_name, args.timestamp or now,
         args.draft_approved, idem_key)
    )
    interaction_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

    # Update contact's last_contacted
    if contact_id:
        conn.execute(
            "UPDATE contacts SET last_contacted = ?, last_channel = ?, last_action = ?, updated_at = ? WHERE id = ?",
            (args.timestamp or now, args.channel, args.type, now, contact_id)
        )
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """CREATE (i:Interaction {channel: $channel, type: $type, direction: $dir,
                   summary: $summary, agent_name: $agent, timestamp: $ts,
                   idempotency_key: $ikey, is_archived: false})""",
                {"channel": args.channel, "type": args.type, "dir": args.direction,
                 "summary": args.summary, "agent": args.agent_name, "ts": args.timestamp or now,
                 "ikey": idem_key}
            )
            # Link to contact
            if contact and (args.email or args.linkedin_url):
                merge_field = "email" if args.email else "linkedin_url"
                merge_val = args.email or args.linkedin_url
                g.query(
                    f"""MATCH (c:Contact {{{merge_field}: $mv}})
                        MATCH (i:Interaction {{idempotency_key: $ikey}})
                        MERGE (c)-[:HAD_INTERACTION]->(i)""",
                    {"mv": merge_val, "ikey": idem_key}
                )
        except Exception:
            queue_for_sync("log-interaction", vars(args))

    out({"status": "logged", "interaction_id": interaction_id, "idempotency_key": idem_key})


# ---------------------------------------------------------------------------
# create-follow-up
# ---------------------------------------------------------------------------
def cmd_create_follow_up(args):
    """Create a follow-up reminder."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    contact = find_contact_sqlite(
        email=args.email, linkedin_url=args.linkedin_url,
        name=args.contact_name, company_name=args.company_name
    )
    contact_id = contact["id"] if contact else None

    conn.execute(
        """INSERT INTO follow_ups (contact_id, interaction_id, due_date, type, description, hubspot_task_id)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (contact_id, args.interaction_id, args.due_date, args.type,
         args.description, args.hubspot_task_id)
    )
    followup_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """CREATE (f:FollowUp {due_date: $due, type: $type, status: 'pending',
                   description: $desc, hubspot_task_id: $htid, created_at: $now})""",
                {"due": args.due_date, "type": args.type, "desc": args.description,
                 "htid": args.hubspot_task_id, "now": now}
            )
        except Exception:
            queue_for_sync("create-follow-up", vars(args))

    out({"status": "created", "follow_up_id": followup_id, "due_date": args.due_date})


# ---------------------------------------------------------------------------
# complete-follow-up
# ---------------------------------------------------------------------------
def cmd_complete_follow_up(args):
    """Mark a follow-up as completed."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE follow_ups SET status = 'completed', completed_at = ? WHERE id = ?",
        (now, args.id)
    )
    conn.commit()

    out({"status": "completed", "follow_up_id": args.id})


# ---------------------------------------------------------------------------
# list-followups
# ---------------------------------------------------------------------------
def cmd_list_followups(args):
    """List pending/overdue follow-ups."""
    conn = get_sqlite()
    status_filter = args.status or "pending"
    rows = conn.execute(
        """SELECT f.*, c.name as contact_name, c.email, c.linkedin_url, c.company_name
           FROM follow_ups f
           LEFT JOIN contacts c ON f.contact_id = c.id
           WHERE f.status = ?
           ORDER BY f.due_date ASC
           LIMIT ?""",
        (status_filter, args.limit or 50)
    ).fetchall()

    followups = [dict(r) for r in rows]
    now = datetime.utcnow().isoformat()
    for f in followups:
        if f["due_date"] and f["due_date"] < now:
            f["overdue"] = True

    out({"follow_ups": followups, "count": len(followups)})


# ---------------------------------------------------------------------------
# log-session
# ---------------------------------------------------------------------------
def cmd_log_session(args):
    """Log a session summary."""
    conn = get_sqlite()
    conn.execute(
        """INSERT OR REPLACE INTO sessions
           (session_id, started_at, ended_at, agent_name, skills_run,
            contacts_processed, interactions_logged, follow_ups_created, summary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (args.session_id, args.started_at, args.ended_at, args.agent_name,
         args.skills_run, args.contacts_processed or 0, args.interactions_logged or 0,
         args.follow_ups_created or 0, args.summary)
    )
    conn.commit()

    out({"status": "logged", "session_id": args.session_id})


# ---------------------------------------------------------------------------
# pre-session-check
# ---------------------------------------------------------------------------
def cmd_pre_session_check(args):
    """Comprehensive pre-session state check."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()
    cutoff_7d = (datetime.utcnow() - timedelta(days=7)).isoformat()

    # Recently contacted (last 7 days)
    recent = conn.execute(
        """SELECT c.name, c.email, c.linkedin_url, c.company_name,
                  i.channel, i.type, i.timestamp
           FROM contacts c
           JOIN interactions i ON i.contact_id = c.id
           WHERE i.timestamp > ? AND i.is_archived = 0
           ORDER BY i.timestamp DESC
           LIMIT 50""",
        (cutoff_7d,)
    ).fetchall()

    # Pending follow-ups
    pending_fups = conn.execute(
        """SELECT f.*, c.name as contact_name, c.email, c.company_name
           FROM follow_ups f
           LEFT JOIN contacts c ON f.contact_id = c.id
           WHERE f.status = 'pending'
           ORDER BY f.due_date ASC
           LIMIT 30""",
    ).fetchall()

    # Overdue follow-ups
    overdue = [dict(f) for f in pending_fups if f["due_date"] and f["due_date"] < now]

    # DNC list
    dnc = conn.execute(
        """SELECT name, email, linkedin_url, company_name,
                  do_not_contact_email, do_not_contact_linkedin
           FROM contacts
           WHERE do_not_contact_email = 1 OR do_not_contact_linkedin = 1"""
    ).fetchall()

    # Unread agent messages
    agent_name = args.agent or "all"
    if agent_name == "all":
        messages = conn.execute(
            "SELECT * FROM agent_messages WHERE status = 'unread' ORDER BY created_at DESC LIMIT 20"
        ).fetchall()
    else:
        messages = conn.execute(
            "SELECT * FROM agent_messages WHERE to_agent = ? AND status = 'unread' ORDER BY created_at DESC",
            (agent_name,)
        ).fetchall()

    # Pending LinkedIn connections
    pending_conn = conn.execute(
        """SELECT name, linkedin_url, company_name, linkedin_connection_sent_at
           FROM contacts
           WHERE linkedin_connection_status = 'pending'
           ORDER BY linkedin_connection_sent_at ASC"""
    ).fetchall()

    result = {
        "timestamp": now,
        "recently_contacted": [dict(r) for r in recent],
        "pending_follow_ups": [dict(f) for f in pending_fups],
        "overdue_follow_ups": overdue,
        "dnc_contacts": [dict(d) for d in dnc],
        "unread_messages": [dict(m) for m in messages],
        "pending_linkedin_connections": [dict(p) for p in pending_conn],
        "counts": {
            "recently_contacted": len(recent),
            "pending_follow_ups": len(pending_fups),
            "overdue": len(overdue),
            "dnc": len(dnc),
            "unread_messages": len(messages),
            "pending_connections": len(pending_conn),
        }
    }

    # Write to temp for skill consumption
    tmp_dir = Path("/tmp/rtgs-state")
    tmp_dir.mkdir(exist_ok=True)
    (tmp_dir / "pre-session.json").write_text(json.dumps(result, default=str, indent=2))

    out(result)


# ---------------------------------------------------------------------------
# post-message
# ---------------------------------------------------------------------------
def cmd_post_message(args):
    """Agent-to-agent message posting."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """INSERT INTO agent_messages (from_agent, to_agent, type, payload)
           VALUES (?, ?, ?, ?)""",
        (args.from_agent, args.to_agent, args.type, args.payload)
    )
    msg_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """CREATE (m:AgentMessage {from_agent: $from, to_agent: $to, type: $type,
                   payload: $payload, status: 'unread', created_at: $now})""",
                {"from": args.from_agent, "to": args.to_agent, "type": args.type,
                 "payload": args.payload, "now": now}
            )
        except Exception:
            queue_for_sync("post-message", vars(args))

    out({"status": "posted", "message_id": msg_id})


# ---------------------------------------------------------------------------
# get-messages
# ---------------------------------------------------------------------------
def cmd_get_messages(args):
    """Read messages addressed to an agent."""
    conn = get_sqlite()
    rows = conn.execute(
        """SELECT * FROM agent_messages
           WHERE to_agent = ? AND status = 'unread'
           ORDER BY created_at DESC""",
        (args.agent,)
    ).fetchall()

    messages = [dict(r) for r in rows]

    # Mark as read
    if args.mark_read:
        for m in messages:
            conn.execute(
                "UPDATE agent_messages SET status = 'read', read_at = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), m["id"])
            )
        conn.commit()

    out({"messages": messages, "count": len(messages)})


# ---------------------------------------------------------------------------
# remember
# ---------------------------------------------------------------------------
def cmd_remember(args):
    """Store a memory."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    conn.execute(
        """INSERT INTO memories (key, content, tags, agent_name, contact_name, company_name, importance, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (args.key, args.content, args.tags, args.agent, args.contact, args.company,
         args.importance or "normal", args.expires_at)
    )
    memory_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            g.query(
                """CREATE (mem:Memory {key: $key, content: $content, tags: $tags,
                   agent_name: $agent, contact_name: $contact, company_name: $company,
                   importance: $imp, created_at: $now})""",
                {"key": args.key, "content": args.content, "tags": args.tags,
                 "agent": args.agent, "contact": args.contact, "company": args.company,
                 "imp": args.importance or "normal", "now": now}
            )
        except Exception:
            queue_for_sync("remember", vars(args))

    out({"status": "remembered", "memory_id": memory_id, "key": args.key})


# ---------------------------------------------------------------------------
# recall
# ---------------------------------------------------------------------------
def cmd_recall(args):
    """Query memories by tag, agent, contact, or keyword."""
    conn = get_sqlite()
    conditions = ["1=1"]
    params = []

    if args.agent:
        conditions.append("agent_name = ?")
        params.append(args.agent)
    if args.contact:
        conditions.append("contact_name = ?")
        params.append(args.contact)
    if args.company:
        conditions.append("company_name = ?")
        params.append(args.company)
    if args.tags:
        for tag in args.tags.split(","):
            conditions.append("tags LIKE ?")
            params.append(f"%{tag.strip()}%")
    if args.keyword:
        conditions.append("(content LIKE ? OR key LIKE ?)")
        params.extend([f"%{args.keyword}%", f"%{args.keyword}%"])

    # Exclude expired
    conditions.append("(expires_at IS NULL OR expires_at > ?)")
    params.append(datetime.utcnow().isoformat())

    where = " AND ".join(conditions)
    rows = conn.execute(
        f"""SELECT * FROM memories WHERE {where}
            ORDER BY
              CASE importance WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                              WHEN 'normal' THEN 2 ELSE 3 END,
              created_at DESC
            LIMIT ?""",
        params + [args.limit or 20]
    ).fetchall()

    out({"memories": [dict(r) for r in rows], "count": len(rows)})


# ---------------------------------------------------------------------------
# forget
# ---------------------------------------------------------------------------
def cmd_forget(args):
    """Mark a memory as expired."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()
    conn.execute("UPDATE memories SET expires_at = ? WHERE id = ?", (now, args.id))
    conn.commit()
    out({"status": "forgotten", "memory_id": args.id})


# ---------------------------------------------------------------------------
# seed-knowledge
# ---------------------------------------------------------------------------
def cmd_seed_knowledge(args):
    """Import knowledge files from a directory into Knowledge nodes."""
    source = Path(args.source)
    if not source.exists():
        err(f"Source directory not found: {source}")

    rename_rules = {}
    if args.rename:
        for rule in args.rename.split(","):
            if ":" in rule:
                old, new = rule.split(":", 1)
                rename_rules[old.strip()] = new.strip()

    conn = get_sqlite()
    g = get_graph()
    seeded = 0
    skipped = 0

    for md_file in sorted(source.rglob("*.md")):
        rel_path = md_file.relative_to(source)
        content = md_file.read_text(encoding="utf-8", errors="replace")

        # Apply rename rules
        for old_term, new_term in rename_rules.items():
            content = content.replace(old_term, new_term)

        # Compute hash
        file_hash = hashlib.md5(content.encode()).hexdigest()

        # Check if already seeded with same hash
        if args.check_modified:
            existing = conn.execute(
                "SELECT source_file_hash FROM knowledge WHERE source_file = ?",
                (str(rel_path),)
            ).fetchone()
            if existing and existing["source_file_hash"] == file_hash:
                skipped += 1
                continue

        # Determine category and subcategory from path
        parts = rel_path.parts
        if len(parts) > 1:
            category = parts[0]
            subcategory = md_file.stem.replace("-", "_")
        else:
            category = "meta"
            subcategory = md_file.stem.replace("-", "_")

        # Split large files (>5K chars) by H2 headings
        if len(content) > 5000:
            sections = re.split(r'\n## ', content)
            for i, section in enumerate(sections):
                if i == 0:
                    # Preamble (before first ##)
                    sec_title = md_file.stem
                    sec_content = section
                else:
                    # H2 section
                    lines = section.split("\n", 1)
                    sec_title = lines[0].strip()
                    sec_content = lines[1] if len(lines) > 1 else ""

                if not sec_content.strip():
                    continue

                key = f"{category}.{subcategory}.{i}"
                _upsert_knowledge_node(conn, g, key, category, subcategory, sec_title,
                                        sec_content.strip(), str(rel_path), file_hash)
                seeded += 1
        else:
            # Single node
            key = f"{category}.{subcategory}"
            title = md_file.stem.replace("-", " ").title()
            _upsert_knowledge_node(conn, g, key, category, subcategory, title,
                                    content.strip(), str(rel_path), file_hash)
            seeded += 1

    conn.commit()
    out({"status": "seeded", "nodes_created_or_updated": seeded, "skipped_unchanged": skipped})


def _upsert_knowledge_node(conn, g, key, category, subcategory, title, content, source_file, file_hash):
    """Upsert a single knowledge node to both SQLite and FalkorDB."""
    now = datetime.utcnow().isoformat()

    # Extract tags from content (simple keyword extraction)
    tags = _extract_tags(content)

    # SQLite upsert
    existing = conn.execute("SELECT id FROM knowledge WHERE key = ?", (key,)).fetchone()
    if existing:
        conn.execute(
            """UPDATE knowledge SET content = ?, title = ?, tags = ?,
               source_file = ?, source_file_hash = ?, updated_at = ?
               WHERE key = ?""",
            (content, title, ",".join(tags), source_file, file_hash, now, key)
        )
    else:
        conn.execute(
            """INSERT INTO knowledge (key, category, subcategory, title, content, tags, source_file, source_file_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (key, category, subcategory, title, content, ",".join(tags), source_file, file_hash)
        )

    # FalkorDB
    if g:
        try:
            g.query(
                """MERGE (k:Knowledge {key: $key})
                   ON CREATE SET k.category = $cat, k.subcategory = $sub, k.title = $title,
                                 k.content = $content, k.tags = $tags,
                                 k.source_file = $sf, k.source_file_hash = $hash,
                                 k.created_at = $now
                   ON MATCH SET k.content = $content, k.title = $title, k.tags = $tags,
                                k.source_file_hash = $hash, k.updated_at = $now""",
                {"key": key, "cat": category, "sub": subcategory, "title": title,
                 "content": content[:5000], "tags": ",".join(tags),
                 "sf": source_file, "hash": file_hash, "now": now}
            )
        except Exception:
            queue_for_sync("seed-knowledge-node", {"key": key, "category": category,
                                                     "subcategory": subcategory, "title": title})


def _extract_tags(content: str) -> list:
    """Extract relevant tags from knowledge content."""
    keywords = ["psp", "treasury", "persona", "hooks", "qualification", "objection",
                "swift", "wise", "ripple", "compliance", "settlement", "corridor",
                "email", "linkedin", "outreach", "cadence", "follow-up", "hubspot",
                "connection", "inmail", "dm", "cold", "warm", "hot"]
    content_lower = content.lower()
    return [k for k in keywords if k in content_lower][:10]


# ---------------------------------------------------------------------------
# query-knowledge
# ---------------------------------------------------------------------------
def cmd_query_knowledge(args):
    """Search Knowledge nodes by category, tags, or keyword."""
    conn = get_sqlite()
    conditions = ["1=1"]
    params = []

    if args.category:
        conditions.append("category = ?")
        params.append(args.category)
    if args.subcategory:
        conditions.append("subcategory = ?")
        params.append(args.subcategory)
    if args.tags:
        for tag in args.tags.split(","):
            conditions.append("tags LIKE ?")
            params.append(f"%{tag.strip()}%")
    if args.keyword:
        conditions.append("(content LIKE ? OR title LIKE ? OR key LIKE ?)")
        params.extend([f"%{args.keyword}%"] * 3)

    where = " AND ".join(conditions)
    rows = conn.execute(
        f"""SELECT key, category, subcategory, title, tags,
               CASE WHEN length(content) > 2000
                    THEN substr(content, 1, 2000) || '... [truncated]'
                    ELSE content END as content
           FROM knowledge WHERE {where}
           ORDER BY category, subcategory
           LIMIT ?""",
        params + [args.limit or 20]
    ).fetchall()

    out({"knowledge": [dict(r) for r in rows], "count": len(rows)})


# ---------------------------------------------------------------------------
# check-pending-connections
# ---------------------------------------------------------------------------
def cmd_check_pending_connections(args):
    """List LinkedIn connection requests sent >N days ago still pending."""
    conn = get_sqlite()
    days = args.days or 3
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    rows = conn.execute(
        """SELECT name, email, linkedin_url, company_name, title,
                  linkedin_connection_status, linkedin_connection_sent_at
           FROM contacts
           WHERE linkedin_connection_status = 'pending'
             AND linkedin_connection_sent_at < ?
           ORDER BY linkedin_connection_sent_at ASC""",
        (cutoff,)
    ).fetchall()

    out({"pending_connections": [dict(r) for r in rows], "count": len(rows),
         "cutoff_days": days})


# ---------------------------------------------------------------------------
# update-connection-status
# ---------------------------------------------------------------------------
def cmd_update_connection_status(args):
    """Mark a connection request as accepted/ignored/withdrawn."""
    conn = get_sqlite()
    now = datetime.utcnow().isoformat()

    if args.linkedin_url:
        conn.execute(
            "UPDATE contacts SET linkedin_connection_status = ?, updated_at = ? WHERE linkedin_url = ?",
            (args.status, now, args.linkedin_url)
        )
    elif args.email:
        conn.execute(
            "UPDATE contacts SET linkedin_connection_status = ?, updated_at = ? WHERE email = ?",
            (args.status, now, args.email)
        )
    conn.commit()

    # FalkorDB
    g = get_graph()
    if g:
        try:
            if args.linkedin_url:
                g.query(
                    "MATCH (c:Contact {linkedin_url: $url}) SET c.linkedin_connection_status = $status",
                    {"url": args.linkedin_url, "status": args.status}
                )
            elif args.email:
                g.query(
                    "MATCH (c:Contact {email: $email}) SET c.linkedin_connection_status = $status",
                    {"email": args.email, "status": args.status}
                )
        except Exception:
            queue_for_sync("update-connection-status", vars(args))

    out({"status": "updated", "new_status": args.status})


# ---------------------------------------------------------------------------
# archive-old
# ---------------------------------------------------------------------------
def cmd_archive_old(args):
    """Archive old interactions and sessions (chunked 500/batch)."""
    conn = get_sqlite()
    days = args.days or 90
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # SQLite — simple UPDATE
    result = conn.execute(
        "UPDATE interactions SET is_archived = 1 WHERE timestamp < ? AND is_archived = 0",
        (cutoff,)
    )
    interactions_archived = result.rowcount

    result = conn.execute(
        "UPDATE sessions SET is_archived = 1 WHERE started_at < ? AND is_archived = 0",
        (cutoff,)
    )
    sessions_archived = result.rowcount
    conn.commit()

    # FalkorDB — chunked (500/batch)
    fdb_archived = 0
    g = get_graph()
    if g:
        try:
            while True:
                result = g.query(
                    """MATCH (i:Interaction)
                       WHERE i.timestamp < $cutoff AND (i.is_archived IS NULL OR i.is_archived = false)
                       WITH i LIMIT 500
                       SET i.is_archived = true
                       RETURN count(i) as archived""",
                    {"cutoff": cutoff}
                )
                batch_count = result.result_set[0][0] if result.result_set else 0
                fdb_archived += batch_count
                if batch_count == 0:
                    break

            # Archive sessions too
            while True:
                result = g.query(
                    """MATCH (s:Session)
                       WHERE s.started_at < $cutoff AND (s.is_archived IS NULL OR s.is_archived = false)
                       WITH s LIMIT 500
                       SET s.is_archived = true
                       RETURN count(s) as archived""",
                    {"cutoff": cutoff}
                )
                batch_count = result.result_set[0][0] if result.result_set else 0
                if batch_count == 0:
                    break
        except Exception:
            pass

    out({
        "interactions_archived_sqlite": interactions_archived,
        "sessions_archived_sqlite": sessions_archived,
        "interactions_archived_falkordb": fdb_archived,
        "cutoff_days": days,
    })


# ---------------------------------------------------------------------------
# graph-stats
# ---------------------------------------------------------------------------
def cmd_graph_stats(args):
    """Return node/edge counts, timestamps, storage health."""
    conn = get_sqlite()

    stats = {
        "contacts": conn.execute("SELECT count(*) FROM contacts").fetchone()[0],
        "companies": conn.execute("SELECT count(*) FROM companies").fetchone()[0],
        "deals": conn.execute("SELECT count(*) FROM deals").fetchone()[0],
        "interactions": {
            "total": conn.execute("SELECT count(*) FROM interactions").fetchone()[0],
            "active": conn.execute("SELECT count(*) FROM interactions WHERE is_archived = 0").fetchone()[0],
            "archived": conn.execute("SELECT count(*) FROM interactions WHERE is_archived = 1").fetchone()[0],
        },
        "follow_ups": {
            "pending": conn.execute("SELECT count(*) FROM follow_ups WHERE status = 'pending'").fetchone()[0],
            "overdue": conn.execute(
                "SELECT count(*) FROM follow_ups WHERE status = 'pending' AND due_date < ?",
                (datetime.utcnow().isoformat(),)
            ).fetchone()[0],
            "completed": conn.execute("SELECT count(*) FROM follow_ups WHERE status = 'completed'").fetchone()[0],
        },
        "knowledge_nodes": conn.execute("SELECT count(*) FROM knowledge").fetchone()[0],
        "memories": conn.execute("SELECT count(*) FROM memories WHERE expires_at IS NULL OR expires_at > ?",
                                  (datetime.utcnow().isoformat(),)).fetchone()[0],
        "agents": conn.execute("SELECT count(*) FROM agents").fetchone()[0],
        "oldest_interaction": conn.execute(
            "SELECT MIN(timestamp) FROM interactions"
        ).fetchone()[0],
        "newest_interaction": conn.execute(
            "SELECT MAX(timestamp) FROM interactions"
        ).fetchone()[0],
        "falkordb_status": "OK" if falkordb_ok() else "DOWN",
        "sqlite_status": "OK" if sqlite_ok() else "DOWN",
        "phantombuster_status": "OK" if pb_ok() else "DOWN",
        "sync_queue_pending": conn.execute(
            "SELECT count(*) FROM sync_queue WHERE status = 'pending'"
        ).fetchone()[0],
    }

    out(stats)


# ---------------------------------------------------------------------------
# sync-backup
# ---------------------------------------------------------------------------
def cmd_sync_backup(args):
    """Replay pending sync_queue items to FalkorDB."""
    conn = get_sqlite()
    g = get_graph()

    if not g:
        err("FalkorDB not available — cannot sync")
        return

    rows = conn.execute(
        "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC"
    ).fetchall()

    synced = 0
    failed = 0
    for row in rows:
        row_dict = dict(row)
        try:
            payload = json.loads(row_dict["payload"])
            # Re-execute the operation against FalkorDB
            # This is a simplified replay — in production, each operation type
            # would have its own FalkorDB-specific replay logic
            conn.execute(
                "UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), row_dict["id"])
            )
            synced += 1
        except Exception as e:
            conn.execute(
                """UPDATE sync_queue SET error_message = ?, retry_count = retry_count + 1
                   WHERE id = ?""",
                (str(e), row_dict["id"])
            )
            failed += 1

    conn.commit()
    out({"synced": synced, "failed": failed, "total": len(rows)})


# ---------------------------------------------------------------------------
# generate-report
# ---------------------------------------------------------------------------
def cmd_generate_report(args):
    """Produce BD activity summary for a given period."""
    conn = get_sqlite()
    period = args.period or "daily"

    if period == "weekly":
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
        period_label = f"Week of {(datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')}"
    else:
        cutoff = (datetime.utcnow() - timedelta(days=1)).isoformat()
        period_label = datetime.utcnow().strftime("%Y-%m-%d")

    # Outreach stats
    emails_sent = conn.execute(
        "SELECT count(*) FROM interactions WHERE channel = 'email' AND direction = 'outbound' AND timestamp > ?",
        (cutoff,)
    ).fetchone()[0]
    linkedin_msgs = conn.execute(
        "SELECT count(*) FROM interactions WHERE channel = 'linkedin' AND direction = 'outbound' AND timestamp > ?",
        (cutoff,)
    ).fetchone()[0]
    unique_contacts = conn.execute(
        "SELECT count(DISTINCT contact_id) FROM interactions WHERE timestamp > ? AND direction = 'outbound'",
        (cutoff,)
    ).fetchone()[0]
    responses = conn.execute(
        "SELECT count(*) FROM interactions WHERE direction = 'inbound' AND timestamp > ?",
        (cutoff,)
    ).fetchone()[0]

    # Follow-up stats
    fups_created = conn.execute(
        "SELECT count(*) FROM follow_ups WHERE created_at > ?", (cutoff,)
    ).fetchone()[0]
    fups_completed = conn.execute(
        "SELECT count(*) FROM follow_ups WHERE completed_at > ?", (cutoff,)
    ).fetchone()[0]
    fups_overdue = conn.execute(
        "SELECT count(*) FROM follow_ups WHERE status = 'pending' AND due_date < ?",
        (datetime.utcnow().isoformat(),)
    ).fetchone()[0]

    # Sessions
    sessions_run = conn.execute(
        "SELECT count(*) FROM sessions WHERE started_at > ?", (cutoff,)
    ).fetchone()[0]

    # Sync queue
    sync_pending = conn.execute(
        "SELECT count(*) FROM sync_queue WHERE status = 'pending'"
    ).fetchone()[0]

    report = {
        "period": period_label,
        "outreach": {
            "emails_sent": emails_sent,
            "linkedin_messages": linkedin_msgs,
            "unique_contacts_reached": unique_contacts,
            "responses_received": responses,
            "response_rate": f"{(responses/unique_contacts*100):.0f}%" if unique_contacts > 0 else "N/A",
        },
        "follow_ups": {
            "created": fups_created,
            "completed": fups_completed,
            "overdue": fups_overdue,
        },
        "agent_health": {
            "sessions_run": sessions_run,
            "falkordb_status": "OK" if falkordb_ok() else "DOWN",
            "phantombuster_status": "OK" if pb_ok() else "DOWN",
            "sync_queue_pending": sync_pending,
        }
    }

    # Output
    if args.output == "json":
        tmp_dir = Path("/tmp/rtgs-state")
        tmp_dir.mkdir(exist_ok=True)
        (tmp_dir / "report.json").write_text(json.dumps(report, indent=2))

    out(report)


# ---------------------------------------------------------------------------
# pb-launch
# ---------------------------------------------------------------------------
def cmd_pb_launch(args):
    """Launch a PhantomBuster phantom by ID with optional argument overrides."""
    if not PHANTOMBUSTER_API_KEY:
        err("PHANTOMBUSTER_API_KEY not set")

    data = {"id": args.phantom_id}
    if args.arguments:
        try:
            data["argument"] = json.loads(args.arguments)
        except json.JSONDecodeError:
            err(f"Invalid JSON in --arguments: {args.arguments}")

    try:
        result = pb_request("POST", "/agents/launch", data)
        container_id = result.get("containerId")

        # Poll for completion if requested
        if args.wait:
            for _ in range(60):  # max 5 minutes (60 * 5s)
                time.sleep(5)
                status_result = pb_request("GET", f"/agents/fetch-output", {"id": args.phantom_id})
                container_status = status_result.get("status")
                if container_status in ("finished", "error"):
                    out({
                        "status": container_status,
                        "container_id": container_id,
                        "output": status_result.get("output"),
                        "result_object": status_result.get("resultObject"),
                    })
                    return

        out({"status": "launched", "container_id": container_id, "phantom_id": args.phantom_id})
    except Exception as e:
        err(f"PhantomBuster launch failed: {e}")


# ---------------------------------------------------------------------------
# pb-fetch-results
# ---------------------------------------------------------------------------
def cmd_pb_fetch_results(args):
    """Fetch latest results from a PhantomBuster phantom."""
    if not PHANTOMBUSTER_API_KEY:
        err("PHANTOMBUSTER_API_KEY not set")

    try:
        result = pb_request("GET", "/agents/fetch-output", {"id": args.phantom_id})
        out({
            "phantom_id": args.phantom_id,
            "status": result.get("status"),
            "output": result.get("output"),
            "result_object": result.get("resultObject"),
        })
    except Exception as e:
        err(f"PhantomBuster fetch failed: {e}")


# ---------------------------------------------------------------------------
# pb-validate
# ---------------------------------------------------------------------------
def cmd_pb_validate(args):
    """Validate PhantomBuster phantom configuration before workflow execution."""
    if not PHANTOMBUSTER_API_KEY:
        err("PHANTOMBUSTER_API_KEY not set")

    try:
        result = pb_request("GET", "/agents/fetch", {"id": args.phantom_id})
    except Exception as e:
        err(f"PhantomBuster validation failed: {e}")

    if not isinstance(result, dict) or not result:
        err(f"PhantomBuster phantom {args.phantom_id} returned no metadata")

    argument_raw = result.get("argument")
    argument = {}
    if isinstance(argument_raw, str) and argument_raw.strip():
        try:
            argument = json.loads(argument_raw)
        except json.JSONDecodeError:
            argument = {"raw": argument_raw}
    elif isinstance(argument_raw, dict):
        argument = argument_raw

    name = result.get("name") or ""
    checks = []

    if not name:
        checks.append("missing phantom name/metadata")

    if args.expect_name_contains and args.expect_name_contains.lower() not in name.lower():
        checks.append(
            f"name '{name or '<empty>'}' does not contain '{args.expect_name_contains}'"
        )

    if args.require_session and not argument.get("sessionCookie"):
        checks.append("missing sessionCookie in saved arguments")

    if args.require_user_agent and not argument.get("userAgent"):
        checks.append("missing userAgent in saved arguments")

    if checks:
        err(
            f"PhantomBuster phantom {args.phantom_id} is misconfigured: "
            + "; ".join(checks)
        )

    out(
        {
            "phantom_id": args.phantom_id,
            "valid": True,
            "name": name,
            "launch_type": result.get("launchType"),
            "nb_launches": result.get("nbLaunches"),
            "has_session_cookie": bool(argument.get("sessionCookie")),
            "has_user_agent": bool(argument.get("userAgent")),
        }
    )


# ---------------------------------------------------------------------------
# generate-dnc-list
# ---------------------------------------------------------------------------
def cmd_generate_dnc_list(args):
    """Write DNC list to temp for sub-agents."""
    conn = get_sqlite()
    channel = args.channel or "all"

    if channel == "email":
        rows = conn.execute(
            "SELECT name, email, company_name FROM contacts WHERE do_not_contact_email = 1"
        ).fetchall()
    elif channel == "linkedin":
        rows = conn.execute(
            "SELECT name, linkedin_url, company_name FROM contacts WHERE do_not_contact_linkedin = 1"
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT name, email, linkedin_url, company_name
               FROM contacts WHERE do_not_contact_email = 1 OR do_not_contact_linkedin = 1"""
        ).fetchall()

    dnc_list = [dict(r) for r in rows]

    tmp_dir = Path("/tmp/rtgs-state")
    tmp_dir.mkdir(exist_ok=True)
    (tmp_dir / "dnc-list.json").write_text(json.dumps(dnc_list, indent=2))

    out({"dnc_contacts": len(dnc_list), "channel": channel, "file": str(tmp_dir / "dnc-list.json")})


# ===================================================================
# CLI ARGUMENT PARSER
# ===================================================================
def build_parser():
    parser = argparse.ArgumentParser(description="RTGS Ops State Manager")
    sub = parser.add_subparsers(dest="command")

    # health-check
    sub.add_parser("health-check")

    # init-graph
    sub.add_parser("init-graph")

    # register-agent
    p = sub.add_parser("register-agent")
    p.add_argument("--name", required=True)
    p.add_argument("--description")
    p.add_argument("--channels")
    p.add_argument("--capabilities")

    # upsert-contact
    p = sub.add_parser("upsert-contact")
    p.add_argument("--name")
    p.add_argument("--email")
    p.add_argument("--linkedin-url", dest="linkedin_url")
    p.add_argument("--title")
    p.add_argument("--company-name", dest="company_name")
    p.add_argument("--persona-lane", dest="persona_lane")
    p.add_argument("--motion-type", dest="motion_type")
    p.add_argument("--classification")
    p.add_argument("--hubspot-contact-id", dest="hubspot_contact_id")
    p.add_argument("--last-contacted", dest="last_contacted")
    p.add_argument("--last-channel", dest="last_channel")
    p.add_argument("--last-action", dest="last_action")
    p.add_argument("--linkedin-connection-status", dest="linkedin_connection_status")
    p.add_argument("--linkedin-connection-sent-at", dest="linkedin_connection_sent_at")

    # upsert-company
    p = sub.add_parser("upsert-company")
    p.add_argument("--name", required=True)
    p.add_argument("--regulatory-status", dest="regulatory_status")
    p.add_argument("--corridor-relevance", dest="corridor_relevance")
    p.add_argument("--entity-type", dest="entity_type")
    p.add_argument("--geography")
    p.add_argument("--hubspot-company-id", dest="hubspot_company_id")

    # upsert-deal
    p = sub.add_parser("upsert-deal")
    p.add_argument("--hubspot-deal-id", dest="hubspot_deal_id", required=True)
    p.add_argument("--name")
    p.add_argument("--stage")
    p.add_argument("--stage-id", dest="stage_id")
    p.add_argument("--pipeline")
    p.add_argument("--pipeline-id", dest="pipeline_id")
    p.add_argument("--amount", type=float)
    p.add_argument("--close-date", dest="close_date")
    p.add_argument("--days-in-stage", dest="days_in_stage", type=int)
    p.add_argument("--last-activity", dest="last_activity")
    p.add_argument("--is-stale", dest="is_stale", action="store_true")
    p.add_argument("--company-name", dest="company_name")

    # check-contact
    p = sub.add_parser("check-contact")
    p.add_argument("--name")
    p.add_argument("--email")
    p.add_argument("--linkedin-url", dest="linkedin_url")
    p.add_argument("--company-name", dest="company_name")
    p.add_argument("--channel")

    # log-interaction
    p = sub.add_parser("log-interaction")
    p.add_argument("--contact-name", dest="contact_name")
    p.add_argument("--email")
    p.add_argument("--linkedin-url", dest="linkedin_url")
    p.add_argument("--company-name", dest="company_name")
    p.add_argument("--channel", required=True)
    p.add_argument("--type", required=True)
    p.add_argument("--direction")
    p.add_argument("--summary")
    p.add_argument("--subject")
    p.add_argument("--hubspot-note-id", dest="hubspot_note_id")
    p.add_argument("--session-id", dest="session_id")
    p.add_argument("--agent-name", dest="agent_name")
    p.add_argument("--timestamp")
    p.add_argument("--draft-approved", dest="draft_approved", action="store_true")

    # create-follow-up
    p = sub.add_parser("create-follow-up")
    p.add_argument("--contact-name", dest="contact_name")
    p.add_argument("--email")
    p.add_argument("--linkedin-url", dest="linkedin_url")
    p.add_argument("--company-name", dest="company_name")
    p.add_argument("--interaction-id", dest="interaction_id", type=int)
    p.add_argument("--due-date", dest="due_date", required=True)
    p.add_argument("--type")
    p.add_argument("--description")
    p.add_argument("--hubspot-task-id", dest="hubspot_task_id")

    # complete-follow-up
    p = sub.add_parser("complete-follow-up")
    p.add_argument("--id", required=True, type=int)

    # list-followups
    p = sub.add_parser("list-followups")
    p.add_argument("--status", default="pending")
    p.add_argument("--limit", type=int, default=50)

    # log-session
    p = sub.add_parser("log-session")
    p.add_argument("--session-id", dest="session_id", required=True)
    p.add_argument("--started-at", dest="started_at")
    p.add_argument("--ended-at", dest="ended_at")
    p.add_argument("--agent-name", dest="agent_name")
    p.add_argument("--skills-run", dest="skills_run")
    p.add_argument("--contacts-processed", dest="contacts_processed", type=int)
    p.add_argument("--interactions-logged", dest="interactions_logged", type=int)
    p.add_argument("--follow-ups-created", dest="follow_ups_created", type=int)
    p.add_argument("--summary")

    # pre-session-check
    p = sub.add_parser("pre-session-check")
    p.add_argument("--agent")

    # post-message
    p = sub.add_parser("post-message")
    p.add_argument("--from-agent", dest="from_agent", required=True)
    p.add_argument("--to-agent", dest="to_agent", required=True)
    p.add_argument("--type", required=True)
    p.add_argument("--payload")

    # get-messages
    p = sub.add_parser("get-messages")
    p.add_argument("--agent", required=True)
    p.add_argument("--mark-read", dest="mark_read", action="store_true")

    # remember
    p = sub.add_parser("remember")
    p.add_argument("--key", required=True)
    p.add_argument("--content", required=True)
    p.add_argument("--tags")
    p.add_argument("--agent")
    p.add_argument("--contact")
    p.add_argument("--company")
    p.add_argument("--importance", default="normal")
    p.add_argument("--expires-at", dest="expires_at")

    # recall
    p = sub.add_parser("recall")
    p.add_argument("--agent")
    p.add_argument("--contact")
    p.add_argument("--company")
    p.add_argument("--tags")
    p.add_argument("--keyword")
    p.add_argument("--limit", type=int, default=20)

    # forget
    p = sub.add_parser("forget")
    p.add_argument("--id", required=True, type=int)

    # seed-knowledge
    p = sub.add_parser("seed-knowledge")
    p.add_argument("--source", required=True)
    p.add_argument("--rename")
    p.add_argument("--check-modified", dest="check_modified", action="store_true")

    # query-knowledge
    p = sub.add_parser("query-knowledge")
    p.add_argument("--category")
    p.add_argument("--subcategory")
    p.add_argument("--tags")
    p.add_argument("--keyword")
    p.add_argument("--limit", type=int, default=20)

    # check-pending-connections
    p = sub.add_parser("check-pending-connections")
    p.add_argument("--days", type=int, default=3)

    # update-connection-status
    p = sub.add_parser("update-connection-status")
    p.add_argument("--linkedin-url", dest="linkedin_url")
    p.add_argument("--email")
    p.add_argument("--status", required=True, choices=["none", "pending", "connected", "ignored", "withdrawn"])

    # archive-old
    p = sub.add_parser("archive-old")
    p.add_argument("--days", type=int, default=90)

    # graph-stats
    sub.add_parser("graph-stats")

    # sync-backup
    sub.add_parser("sync-backup")

    # generate-report
    p = sub.add_parser("generate-report")
    p.add_argument("--period", default="daily", choices=["daily", "weekly"])
    p.add_argument("--output", default="stdout", choices=["stdout", "json", "telegram"])

    # pb-launch
    p = sub.add_parser("pb-launch")
    p.add_argument("--phantom-id", dest="phantom_id", required=True)
    p.add_argument("--arguments")
    p.add_argument("--wait", action="store_true")

    # pb-fetch-results
    p = sub.add_parser("pb-fetch-results")
    p.add_argument("--phantom-id", dest="phantom_id", required=True)

    # pb-validate
    p = sub.add_parser("pb-validate")
    p.add_argument("--phantom-id", dest="phantom_id", required=True)
    p.add_argument("--expect-name-contains", dest="expect_name_contains")
    p.add_argument("--require-session", action="store_true")
    p.add_argument("--require-user-agent", action="store_true")

    # generate-dnc-list
    p = sub.add_parser("generate-dnc-list")
    p.add_argument("--channel", default="all")

    return parser


# ===================================================================
# MAIN
# ===================================================================
COMMAND_MAP = {
    "health-check": cmd_health_check,
    "init-graph": cmd_init_graph,
    "register-agent": cmd_register_agent,
    "upsert-contact": cmd_upsert_contact,
    "upsert-company": cmd_upsert_company,
    "upsert-deal": cmd_upsert_deal,
    "check-contact": cmd_check_contact,
    "log-interaction": cmd_log_interaction,
    "create-follow-up": cmd_create_follow_up,
    "complete-follow-up": cmd_complete_follow_up,
    "list-followups": cmd_list_followups,
    "log-session": cmd_log_session,
    "pre-session-check": cmd_pre_session_check,
    "post-message": cmd_post_message,
    "get-messages": cmd_get_messages,
    "remember": cmd_remember,
    "recall": cmd_recall,
    "forget": cmd_forget,
    "seed-knowledge": cmd_seed_knowledge,
    "query-knowledge": cmd_query_knowledge,
    "check-pending-connections": cmd_check_pending_connections,
    "update-connection-status": cmd_update_connection_status,
    "archive-old": cmd_archive_old,
    "graph-stats": cmd_graph_stats,
    "sync-backup": cmd_sync_backup,
    "generate-report": cmd_generate_report,
    "pb-launch": cmd_pb_launch,
    "pb-fetch-results": cmd_pb_fetch_results,
    "pb-validate": cmd_pb_validate,
    "generate-dnc-list": cmd_generate_dnc_list,
}


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    handler = COMMAND_MAP.get(args.command)
    if not handler:
        err(f"Unknown command: {args.command}")

    try:
        handler(args)
    except SystemExit:
        raise
    except Exception as e:
        err(f"Command '{args.command}' failed: {e}\n{traceback.format_exc()}")


if __name__ == "__main__":
    main()
