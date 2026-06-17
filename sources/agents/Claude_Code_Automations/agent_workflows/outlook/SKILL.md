---
name: "Outlook Inbox Triage"
description: "Triages Omar's inboxes (omar@thegent.uk via Outlook + albakri.omar@gmail.com via Gmail) for TheGent — fetches unread emails from both mailboxes, classifies them (prospect/inbound/internal/noise), moves newsletters/spam/recruiters/notifications into triage folders, drafts intelligent replies for actionable emails, presents every draft for approval before sending, and sends a Telegram summary alert. Does NOT handle BD outreach or pipeline — use the Outlook BD skill for pipeline and outreach. Use when Omar says 'scan inbox', 'check email', 'triage outlook', 'email scan', 'morning inbox', 'clean inbox', or 'what's in my inbox'. Also trigger for any request to process, read, or respond to Outlook or Gmail emails."
---

# Outlook Inbox Triage

Automated triage and response drafting for Omar Al-Bakri's inboxes at TheGent. Covers TWO mailboxes:

1. **omar@thegent.uk** (work — primary, check first) via Outlook/Rube Outlook tools
2. **albakri.omar@gmail.com** (personal — check second) via Gmail/Rube Gmail tools or Google Workspace API

This skill handles **incoming email** only — classifying, sorting, and drafting replies. For proactive BD outreach and pipeline review, use the separate Outlook BD skill.

**Note:** Gmail requires a different connector than Outlook (Rube Gmail tools or Google Workspace API). The personal mailbox will only be triaged when the Gmail connector is active.

The goal is to keep Omar's inbox actionable: noise gets sorted into folders, low-risk replies can be sent automatically after delegated review, and only true exceptions are escalated to Omar.

## Prerequisites

1. **Rube Outlook connection** must be ACTIVE (see settings.local.json)
2. **Rube Telegram connection** must be ACTIVE (see settings.local.json)
3. **Telegram chat_id**: `1778273779`

## Tools Required (Rube)

| Tool | Purpose |
|---|---|
| `OUTLOOK_QUERY_EMAILS` | Fetch unread emails from inbox |
| `OUTLOOK_GET_MESSAGE` | Hydrate full email body when bodyPreview is insufficient |
| `OUTLOOK_LIST_MAIL_FOLDERS` | Check existing folder structure |
| `OUTLOOK_CREATE_MAIL_FOLDER` | Create triage folders on first run |
| `OUTLOOK_BATCH_MOVE_MESSAGES` | Move classified noise emails in bulk (max 20 per call) |
| `OUTLOOK_CREATE_DRAFT_REPLY` | Create draft reply in Outlook drafts folder |
| `OUTLOOK_SEND_DRAFT` | Send an approved draft (ONLY after Omar's explicit approval) |
| `TELEGRAM_SEND_MESSAGE` | Send scan summary alert to Omar's Telegram |

## Shared References

Read these from `C:\Users\OmarAl-Bakri\Claude_Code_Automations\shared_references\` when you need domain context:

| File | When to Read |
|---|---|
| `thegent-company-info.md` | When you need TheGent product context for drafting replies |
| `persona-routing.md` | When assigning persona lanes and tailoring reply tone |
| `cross-channel-intel.md` | When checking for LinkedIn activity on a contact |
| `compliance-rules.md` | Before drafting any reply — review the hard rules |
| `email-review-guardrails.md` | Before drafting or sending — delegated review and exception rules |
| `state-management.md` | CLI reference for state_manager.py — all graph commands |
| `cadence-procedures.md` | Pre-session, pre-draft, post-send checklists |
| `context7-documentation.md` | Context7 MCP documentation review protocol |

---

## Orchestration Architecture

This skill runs as an **orchestrator** that spawns a sub-agent for the heavy inbox processing work, then handles delegated review, exception handling, and sending directly.

```
ORCHESTRATOR (this skill)
  │
  ├── Phase 1: INBOX TRIAGE (sub-agent)
  │     Fetch → Classify → Move noise → Draft replies
  │     Returns: structured triage report (JSON)
  │
  ├── Phase 2: AUTOMATED REVIEW (orchestrator handles directly)
  │     Auto-review low-risk replies → Escalate exceptions only → Queue approved
  │
  └── Phase 3: SEND & SUMMARY (orchestrator handles directly)
        Send approved drafts → Write shared-intel → Telegram alert
```

### Inter-Agent Communication

The sub-agent writes structured JSON to `/tmp/outlook-ops/triage-report.json`. The orchestrator reads this output to present drafts.

---

## Execution Steps

### Step 0 — Setup (Orchestrator)

0a. **Context7 Documentation Review** (MANDATORY):
   - Review FalkorDB Python client docs via Context7 MCP:
     - `resolve-library-id("FalkorDB")` → confirms `/falkordb/falkordb-py`
     - `query-docs("/falkordb/falkordb-py", "graph queries MERGE upsert contact interaction")`
   - This ensures the agent uses current FalkorDB API patterns for state management.
   - See `shared_references/context7-documentation.md` for full protocol.

0b. **Health Check**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py health-check
   ```
   If `mode` is `degraded` or `stateless`, note this but proceed — skills never crash due to database issues.

0c. **Register Agent** (first run only):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py register-agent --name "outlook_triage" --channels "email" --capabilities "inbox_triage,reply_drafting,email_classification"
   ```

0d. **Pre-Session Check**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py pre-session-check --agent "outlook_triage"
   ```
   Review: recently contacted (avoid duplicating outreach), pending follow-ups, DNC list, unread agent messages.

0e. **Read Agent Messages**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py get-messages --agent "outlook_triage"
   ```
   Process any PROSPECT_SIGNAL, DO_NOT_CONTACT, or FOLLOW_UP_REQUEST messages from other agents.

0f. **Recall Memories**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py recall --agent "outlook_triage" --limit 20
   ```

0g. **Load Knowledge**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py query-knowledge --category "outreach" --tags "email"
   ```

1. Create working directories:

```bash
mkdir -p /tmp/outlook-ops
mkdir -p /tmp/shared-intel
```

2. Check for shared intel from LinkedIn: read `/tmp/shared-intel/prospect-signals.json` if it exists — extract names/companies flagged by the LinkedIn agent.

3. Ensure triage folder structure exists in Outlook (idempotent). Use `RUBE_MULTI_EXECUTE_TOOL` to list existing folders:

```json
{
  "tool_slug": "OUTLOOK_LIST_MAIL_FOLDERS",
  "arguments": {
    "user_id": "me",
    "select": "id,displayName"
  }
}
```

Required folders (create missing ones with `OUTLOOK_CREATE_MAIL_FOLDER` using `return_existing_if_exists: true`):

| Folder Name | Purpose |
|---|---|
| `_Newsletters` | Marketing emails, newsletters, platform updates, product announcements |
| `_Spam & Sales` | Cold outreach TO Omar, irrelevant pitches, crypto/Web3 solicitations |
| `_Recruiters` | Recruitment and hiring emails |
| `_Notifications` | System notifications, calendar alerts, LinkedIn email alerts, billing confirmations, automated reports |

The `_` prefix groups triage folders at the top of the Outlook folder list.

### Step 1 — Phase 1: Inbox Triage (Sub-Agent)

Spawn a sub-agent via the `Task` tool with `subagent_type: "general-purpose"`. The sub-agent prompt must include:

- The full **Inbox Triage Instructions** section below
- Any LinkedIn prospect signals from shared-intel (names to watch for)
- The Rube Outlook tool slugs
- The folder IDs for the four triage folders (from Step 0)

The sub-agent writes: `/tmp/outlook-ops/triage-report.json`

The orchestrator waits for completion, then reads the triage report.

#### Inbox Triage Instructions (for sub-agent)

**1. Fetch** unread emails from the last 24 hours:

```json
{
  "tool_slug": "OUTLOOK_QUERY_EMAILS",
  "arguments": {
    "folder": "inbox",
    "filter": "isRead eq false and receivedDateTime ge {{24_HOURS_AGO_ISO}}",
    "select": ["id", "subject", "from", "toRecipients", "ccRecipients", "receivedDateTime", "bodyPreview", "hasAttachments", "conversationId", "webLink", "isRead"],
    "orderby": "receivedDateTime desc",
    "top": 50,
    "user_id": "me"
  }
}
```

Replace `{{24_HOURS_AGO_ISO}}` with current UTC minus 24 hours in ISO 8601.

If `bodyPreview` is insufficient for classification, hydrate with `OUTLOOK_GET_MESSAGE` using `select: ["id", "subject", "from", "body", "receivedDateTime", "webLink"]`.

**2. Classify** each email:

| Classification | Description |
|---|---|
| **HOT PROSPECT** | Target org (bank, central bank, FMI, payment provider) replied to outreach or engaged meaningfully |
| **WARM INBOUND** | Relevant professional emailed first — target org or adjacent (fintech, regtech, consulting) |
| **EXISTING CONTACT** | Ongoing thread (check conversationId). Respond naturally, steer toward meeting |
| **COLLEAGUE / INTERNAL** | Known colleague. Flag for Omar. Do NOT draft |
| **AUTOMATED / NEWSLETTER** | Marketing, system notifications, newsletters. Do NOT draft |
| **RECRUITER** | Ignore completely |
| **SPAM / IRRELEVANT** | Sales pitches to Omar, crypto/Web3 solicitations. Ignore |

**Invoke** `/sentiment-analysis-tool:analyze-sentiment` on each email body to gauge sender intent, urgency, and emotional tone. Use sentiment scores to prioritize HOT PROSPECT and WARM INBOUND responses.

**LinkedIn cross-check:** If a contact appears in the LinkedIn shared-intel, note this in the classification. Avoid drafting a reply that contradicts or duplicates what the LinkedIn agent already sent.

**3. Move** noise emails to triage folders using `OUTLOOK_BATCH_MOVE_MESSAGES` (max 20 per call):

| Classification | Destination Folder |
|---|---|
| AUTOMATED / NEWSLETTER | `_Newsletters` |
| SPAM / IRRELEVANT | `_Spam & Sales` |
| RECRUITER | `_Recruiters` |
| System notifications, calendar alerts, LinkedIn alerts | `_Notifications` |

Do NOT move HOT PROSPECT, WARM INBOUND, EXISTING CONTACT, or COLLEAGUE/INTERNAL.

**3b. Pre-Draft Dedup Check** — For each actionable email, before drafting:

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py check-contact --email "sender@example.com" --name "Sender Name"
```

- If status is `DO_NOT_CONTACT`: skip this contact entirely
- If status is `CAUTION`: flag for Omar with the reason (multiple matches found)
- If status is `CLEAR`: proceed with drafting
- Pull relevant knowledge for context:
  ```bash
  python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py query-knowledge --tags "persona_lane_value"
  ```

**4. Draft replies** for actionable emails (HOT PROSPECT, WARM INBOUND, EXISTING CONTACT).

Read the persona routing table from `C:\Users\OmarAl-Bakri\Claude_Code_Automations\shared_references\persona-routing.md` and the compliance rules from `compliance-rules.md` before drafting.

Before drafting, invoke the following skills to enhance reply quality:
- **Invoke** `/discovery-questionnaire:discovery` for WARM INBOUND senders to structure qualification questions
- **Invoke** `/marketing-skills:sales-enablement` for meeting booking language in HOT PROSPECT replies
- **Invoke** `/marketing-skills:email-sequence` to plan follow-up cadence for prospects who don't respond
- **Invoke** `/humanizer` to strip AI patterns from every draft
- **Invoke** `/writing-clearly-and-concisely` for final brevity pass
- **Invoke** `/professional-communication` to ensure appropriate business email tone

Use the Response Guidelines below to draft, then create the draft in Outlook:

```json
{
  "tool_slug": "OUTLOOK_CREATE_DRAFT_REPLY",
  "arguments": {
    "message_id": "{{MESSAGE_ID}}",
    "comment": "{{DRAFT_REPLY_TEXT}}",
    "user_id": "me"
  }
}
```

**5. Write triage report** to `/tmp/outlook-ops/triage-report.json`:

```json
{
  "generated_at": "ISO timestamp",
  "total_processed": 0,
  "actionable": [
    {
      "message_id": "...",
      "draft_id": "...",
      "sender_name": "...",
      "sender_email": "...",
      "sender_company": "...",
      "subject": "...",
      "classification": "HOT PROSPECT",
      "summary": "max 3 sentences",
      "draft_text": "the reply text",
      "web_link": "...",
      "confidence": "High",
      "notes": "any context for Omar",
      "linkedin_match": false,
      "persona_lane": "B"
    }
  ],
  "moved": {
    "_Newsletters": 0,
    "_Spam & Sales": 0,
    "_Recruiters": 0,
    "_Notifications": 0
  },
  "internal_flagged": 0,
  "prospect_signals": []
}
```

The `prospect_signals` array contains contacts identified as prospects — these get written to shared-intel for the LinkedIn agent.

### Step 2 — Automated Review (Orchestrator)

Read the triage report and run delegated review using `shared_references/email-review-guardrails.md`.

**Auto-send low-risk replies that clearly satisfy the guardrails. Present exceptions to Omar only.**

**For each exception email:**

```
---
SENDER: [Name] — [Title/Company if visible] <[email]>
SUBJECT: [Email subject line]
CLASSIFICATION: [HOT PROSPECT / WARM INBOUND / EXISTING CONTACT]
PERSONA LANE: [A: Treasury | B: Payments | C: Partnerships | D: Technical | E: Compliance]
THEIR MESSAGE: [Quote or summary — max 3 sentences]
DRAFT REPLY: [Proposed response — already saved as Outlook draft]
DRAFT ID: [Draft message ID for sending]
ORIGINAL EMAIL: [webLink]
CONFIDENCE: [High / Medium / Low]
LINKEDIN: [Any related LinkedIn activity from shared-intel, or "None"]
NOTE: [Any context Omar should know]
---
```

Also present a summary of what was moved:

```
MOVED TO TRIAGE FOLDERS:
  - _Newsletters: [count]
  - _Spam & Sales: [count]
  - _Recruiters: [count]
  - _Notifications: [count]

INTERNAL (flagged for Omar): [count]
```

Escalate only drafts that are ambiguous, commercially risky, emotionally sensitive, weakly grounded in the thread, or otherwise outside the auto-send guardrails.

### Step 3 — Send & Summary (Orchestrator)

#### Send Approved And Auto-Approved Drafts

```json
{
  "tool_slug": "OUTLOOK_SEND_DRAFT",
  "arguments": {
    "message_id": "{{DRAFT_MESSAGE_ID}}",
    "user_id": "me"
  }
}
```

#### Post-Send: Log to Graph

For each sent reply:

1. **Log interaction to graph**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-interaction --email "recipient@example.com" --channel "email" --type "reply" --direction "outbound" --summary "Replied to prospect inquiry about..." --agent-name "outlook_triage" --draft-approved
   ```

2. **Create follow-up** (if warranted):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py create-follow-up --email "recipient@example.com" --due-date "YYYY-MM-DD" --type "email_follow_up" --description "Follow up on reply to [subject]"
   ```
   - **Invoke** `/marketing-skills:email-sequence` to determine optimal follow-up timing and cadence for this prospect type

4. **Post cross-channel signal** (if prospect is hot):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message --from-agent "outlook_triage" --to-agent "linkedin_triage" --type "PROSPECT_SIGNAL" --payload '{"contact":"email@example.com","signal":"Hot prospect replied, coordinate LinkedIn follow-up"}'
   ```

5. **Remember notable learnings**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py remember --key "contact_pref_NAME" --content "Prefers morning calls" --tags "contact,preference" --agent "outlook_triage" --contact "Name"
   ```

#### Write Shared Intel

After all sends are complete, write prospect signals to `/tmp/shared-intel/prospect-signals.json` for the LinkedIn agent. Follow the protocol in `cross-channel-intel.md`:

1. Read the existing file (if it exists)
2. Check `generated_at` — if older than 24 hours, start fresh
3. Append new prospect signals from conversations marked in `prospect_signals`
4. Write the updated file with `generated_by: "outlook-inbox-triage"`

**⚠️ DEPRECATED:** JSON file writes to `/tmp/shared-intel/` are maintained for backward compatibility only. FalkorDB `post-message` is the authoritative source for cross-channel signals. JSON files will be removed in a future update — do NOT rely on them for new logic.

#### Telegram Alert

```json
{
  "tool_slug": "TELEGRAM_SEND_MESSAGE",
  "arguments": {
    "chat_id": "1778273779",
    "text": "Inbox Triage Complete\n\nActionable: [count] (drafts ready)\nCleaned: [count] moved to folders\nInternal: [count] flagged\nSent: [count] approved\n\nReady in Cowork."
  }
}
```

NEVER include email content, sender names, or confidential info in the Telegram message.

#### Display Summary

```
=== INBOX TRIAGE COMPLETE ===
Time: [timestamp]
Total processed: [count]

ACTIONABLE:
  - HOT PROSPECT: [count]
  - WARM INBOUND: [count]
  - EXISTING CONTACT: [count]
  - INTERNAL: [count] flagged

MOVED:
  - _Newsletters: [count]
  - _Spam & Sales: [count]
  - _Recruiters: [count]
  - _Notifications: [count]

SENT: [count] approved replies
SKIPPED: [count]

CROSS-CHANNEL:
  - LinkedIn signals consumed: [count]
  - Prospect signals written for LinkedIn: [count]
===
```

#### End-of-Session: Log Session

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-session --session-id "outlook-triage-YYYYMMDD-HHMM" --agent-name "outlook_triage" --skills-run "inbox_triage" --contacts-processed N --interactions-logged N --follow-ups-created N --summary "Processed N emails, sent N replies, moved N to folders"
```

Clean up: `rm -rf /tmp/outlook-ops/`

Do NOT delete `/tmp/shared-intel/` — other skills may still need it.

---

## Response Guidelines

### HOT PROSPECT (email reply)
- Acknowledge their email specifically (reference what they said)
- One line of relevant value (insight, market observation — not a pitch), **using the value angle from their persona lane**
- Propose a specific meeting: "Would [day] work for a 20-minute call? I can walk you through how this works for [their specific context]."
- Under 4 sentences. No corporate fluff. No "I hope this email finds you well."
- Tone: direct, knowledgeable peer — not a salesperson
- **FC entities**: Weave in regulatory awareness naturally
- **Participants**: Focus on network access and expansion — don't reference regulation unprompted
- Sign off as Omar
- **Invoke** `/marketing-skills:sales-enablement` for proven meeting booking language

### WARM INBOUND (email reply)
- Thank them for reaching out
- One qualifying question about their interest or role
- If clearly relevant, suggest a brief call
- Under 3 sentences
- **Invoke** `/discovery-questionnaire:discovery` for structured qualifying questions

### EXISTING CONTACT (email reply)
- Read the full thread for context (use conversationId)
- Respond naturally to whatever they said
- If natural opening to meet, suggest it. Don't force it
- Match their tone and energy

### Email Formatting
- Replies: plain text only (no HTML) — `comment` field is plain text
- Professional but not stiff — Omar's voice is direct, warm, confident
- No emojis
- Sign off as "Omar" or "Best, Omar" — never reveal AI involvement
- Don't repeat context in thread replies

---

## Preferences

- Step-by-step delivery — one step, pause, confirm before next
- Full file reads — never truncate
- No code changes without explicit approval
- Autonomous execution — don't hand me instructions to run manually
