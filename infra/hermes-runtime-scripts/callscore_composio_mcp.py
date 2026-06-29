#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from hashlib import sha256
from pathlib import Path
from typing import Any


def _parse_env_line(line: str) -> tuple[str, str] | None:
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        return None
    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    if not key:
        return None
    return key, value


def load_runtime_env(app_dir: str = "/opt/crypto-tuber-ranked") -> None:
    paths = [
        Path(app_dir) / ".env",
        Path(app_dir) / ".env.local",
        Path(app_dir) / ".env.hermes",
        Path(app_dir) / ".env.production",
        Path(app_dir) / ".env.live",
        Path("/srv/agents/hermes/composio-project-context/.env.local"),
    ]
    for path in paths:
        if not path.exists():
            continue
        for line in path.read_text(errors="ignore").splitlines():
            parsed = _parse_env_line(line)
            if parsed is None:
                continue
            key, value = parsed
            os.environ.setdefault(key, value)


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def payload_hash(value: Any) -> str:
    return "sha256:" + sha256(stable_json(value).encode("utf-8")).hexdigest()


def provider_execution_receipt_id(tool_slug: str, payload: Any) -> str:
    material = stable_json({"tool": tool_slug, "payload": payload})
    return "provider-exec-" + sha256(material.encode("utf-8")).hexdigest()[:16]


def utc_ts() -> str:
    return time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())


def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
    try:
        p.chmod(0o600)
    except Exception:
        pass


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(errors="replace"))


def parse_mcp_text(text: str) -> dict[str, Any]:
    candidates: list[str] = []
    for line in text.splitlines():
        if line.startswith("data:"):
            val = line[5:].strip()
            if val and val != "[DONE]":
                candidates.append(val)
    candidates.append(text.strip())
    for candidate in candidates:
        if not candidate:
            continue
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return obj
        except Exception:
            continue
    return {"raw": text[:2000]}


class ComposioMcpClient:
    def __init__(self) -> None:
        self.url = os.environ.get("COMPOSIO_MCP_URL", "https://connect.composio.dev/mcp")
        self.key = os.environ.get("COMPOSIO_MCP_CONSUMER_API_KEY") or os.environ.get("COMPOSIO_API_KEY") or ""
        self.protocol = os.environ.get("MCP_PROTOCOL_VERSION", "2025-03-26")
        self.session_id: str | None = None
        self.rpc_id = 1
        if not self.key:
            raise RuntimeError("composio_mcp_consumer_key_missing")

    def rpc(self, body: dict[str, Any]) -> dict[str, Any]:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(self.url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json, text/event-stream")
        req.add_header("MCP-Protocol-Version", self.protocol)
        req.add_header("X-CONSUMER-API-KEY", self.key)
        if self.session_id:
            req.add_header("MCP-Session-Id", self.session_id)
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                text = resp.read().decode("utf-8", errors="replace")
                self.session_id = resp.headers.get("mcp-session-id") or self.session_id
                return {"ok": True, "status_code": resp.status, "body": parse_mcp_text(text), "text": text}
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            return {"ok": False, "status_code": exc.code, "body": parse_mcp_text(text), "text": text}

    def initialize(self) -> None:
        body = {
            "jsonrpc": "2.0",
            "id": self.rpc_id,
            "method": "initialize",
            "params": {
                "protocolVersion": self.protocol,
                "capabilities": {},
                "clientInfo": {"name": "callscore-engagement", "version": "1.0.0"},
            },
        }
        self.rpc_id += 1
        result = self.rpc(body)
        if not result["ok"]:
            raise RuntimeError(f"mcp_initialize_failed:{result['status_code']}")
        self.rpc({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

    def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        body = {
            "jsonrpc": "2.0",
            "id": self.rpc_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        self.rpc_id += 1
        result = self.rpc(body)
        if not result["ok"]:
            return {"successful": False, "status_code": result["status_code"], "error": result["body"]}
        body_obj = result.get("body") or {}
        if isinstance(body_obj.get("error"), dict):
            return {"successful": False, "status_code": result["status_code"], "error": body_obj["error"]}
        mcp_result = body_obj.get("result")
        if isinstance(mcp_result, dict) and isinstance(mcp_result.get("content"), list):
            for item in mcp_result["content"]:
                if isinstance(item, dict) and isinstance(item.get("text"), str):
                    try:
                        parsed = json.loads(item["text"])
                        if isinstance(parsed, dict):
                            return parsed
                    except Exception:
                        return {"successful": False, "error": item["text"]}
        return {"successful": True, "data": mcp_result}

    def multi_execute(self, tools: list[dict[str, Any]], thought: str, step: str) -> dict[str, Any]:
        args = {
            "tools": tools,
            "thought": thought,
            "sync_response_to_workbench": False,
            "current_step": step,
            "current_step_metric": f"{len(tools)}/{len(tools)} provider calls",
        }
        return self.call_tool("COMPOSIO_MULTI_EXECUTE_TOOL", args)
