# Agent Interop Channels

**Machine:** Hetzner (`hermes-agent-box`, 100.107.162.80)
**Date:** 2026-05-17

## Channels

### 1. Hermes → OMX (same machine)

**Method:** File drop into OMX's state inbox, picked up by notify-fallback-watcher.

**Script:** `/srv/agents/interop/scripts/send-to-omx.sh`

**How it works:**
- Hermes writes a `.md` file to `/home/omar/.omx-runs/run-.../omx/state/inbox/`
- OMX's `notify-fallback-watcher.js` (pid 83531) polls `~/.omx/state/` every 250ms-1s
- The watcher detects new files via `auto_nudge` and forwards content to the Codex session
- Codex processes the message and responds (response captured via `tmux capture-pane` or OMX writes to hermes-inbox)

**Usage:**
```bash
# From Hermes terminal tool:
/srv/agents/interop/scripts/send-to-omx.sh "Review this plan: ..."

# From file:
/srv/agents/interop/scripts/send-to-omx.sh --file /path/to/plan.md
```

**Pitfalls:**
- OMX's `auto_nudge` has `eligible_but_not_sent` state — messages may queue
- Fallback watcher has `max_per_tick: 5` — rate limit
- Watcher may be in `stopping: true` state — check with `ps aux | grep notify-fallback`
- The OMX session must be the currently active one (`omx-unknown-detached-1779029290024-1yh1vj`)

**OMX → Hermes response path:**
- TBD — OMX can write to `/srv/agents/interop/hermes-inbox/` or use `omx state write`
- Currently: capture OMX response via `tmux capture-pane -t '$4:0.0' -p`

---

### 2. Hermes(Hetzner) → Hermes(WSL)

**Method:** SSH-exec `hermes chat -q` for one-shot queries, or session resume for context.

**Script:** `/srv/agents/interop/scripts/send-to-wsl-hermes.sh`

**How it works:**
- Hermes(Hetzner) SSH's to WSL via bridge key `~/.ssh/bridge_hetzner_to_wsl`
- Executes `/home/omar/.local/bin/hermes chat -q "message"` on WSL
- WSL Hermes processes the query and returns response
- Response is captured as stdout

**Usage:**
```bash
# One-shot query:
/srv/agents/interop/scripts/send-to-wsl-hermes.sh "Status check on crypto-tuber-ranked pipeline"

# Resume a session for context:
/srv/agents/interop/scripts/send-to-wsl-hermes.sh --resume-session 20260517_xxx "Continue the deployment"

# From file:
/srv/agents/interop/scripts/send-to-wsl-hermes.sh --file /path/to/message.md
```

**WSL Hermes state:**
- Gateway running: pid 423 (`python -m hermes_cli.main gateway run --replace`)
- Interactive session: pid 1660 (`hermes -c`)
- Bridge daemon: pid 421 (`bridge-worker-wsl daemon`)
- `hermes` path: `/home/omar/.local/bin/hermes`

**Pitfalls:**
- SSH may timeout on long operations — use `timeout` parameter
- WSL PATH may not include hermes — always use full path `/home/omar/.local/bin/hermes`
- Gateway may consume Telegram messages sent to the same bot — be aware of echo

---

### 3. WSL Hermes → Hermes(Hetzner) (reverse)

**Method:** WSL Hermes SSH's to Hetzner via bridge key.

**Bridge key on WSL:** `~/.ssh/bridge_wsl_to_hetzner`
**Target:** `omar@100.107.162.80`

WSL Hermes can execute:
```bash
ssh -i ~/.ssh/bridge_wsl_to_hetzner omar@100.107.162.80 \
  "hermes chat -q 'Your message'" 2>&1
```

Or drop files to `/srv/agents/interop/wsl-inbox/` via SCP.

---

## Directory Layout

```
/srv/agents/interop/
├── scripts/
│   ├── send-to-omx.sh          # Hermes → OMX
│   └── send-to-wsl-hermes.sh   # Hermes(Hetzner) → Hermes(WSL)
├── omx-inbox/                   # Reserved for OMX → Hermes responses
├── hermes-inbox/                # Reserved: future OMX → Hermes channel
├── wsl-inbox/                   # Reserved: WSL → Hetzner messages
└── logs/                        # Interop logs
```
