---
name: "LinkedIn Inbox Triage"
description: "Triages Omar's LinkedIn messaging inbox for TheGent — processes LinkedIn inbox messages provided by Omar (copy-paste or export), classifies senders (prospect/inbound/recruiter/spam), drafts intelligent replies aimed at booking qualified ASIAPAC meetings, and presents every draft for approval before sending. Does NOT handle proactive BD outreach — use the LinkedIn BD skill for that. Use when Omar says 'scan LinkedIn', 'check LinkedIn messages', 'LinkedIn inbox', 'run LinkedIn autopilot', 'LinkedIn triage', or 'what's on LinkedIn'. Also trigger for any request to process, read, or respond to LinkedIn messages."
---

# LinkedIn Inbox Triage

Manual-input triage and response drafting for Omar Al-Bakri's LinkedIn inbox at TheGent. This skill handles **incoming LinkedIn messages** only — processing inbox data provided by Omar (copy-paste or export), classifying conversations, and drafting replies. For proactive LinkedIn BD prospecting (finding and connecting with prospects), use the separate LinkedIn BD skill.

The sole objective is to **book qualified meetings** in ASIAPAC. The agent NEVER holds commercial conversations, discusses pricing, negotiates terms, or makes commitments.

## Prerequisites

1. **Omar provides LinkedIn inbox data** (copy-paste messages, CSV export, or screenshot)
2. **Rube Telegram connection** must be ACTIVE (see settings.local.json)
3. **Telegram chat_id**: `1778273779`

## Shared References

Read these from `C:\Users\OmarAl-Bakri\Claude_Code_Automations\shared_references\` when you need domain context:

| File | When to Read |
|---|---|
| `thegent-company-info.md` | When you need TheGent product context for drafting replies |
| `persona-routing.md` | When assigning persona lanes and tailoring reply tone |
| `cross-channel-intel.md` | When checking for Outlook activity on a contact |
| `compliance-rules.md` | Before drafting any reply — review the hard rules |
| `state-management.md` | CLI reference for state_manager.py — all graph commands |
| `cadence-procedures.md` | Pre-session, pre-draft, post-send checklists |
| `context7-documentation.md` | Context7 MCP documentation review protocol |

---

## Orchestration Architecture

This skill runs as an **orchestrator** that processes inbox data provided by Omar, then classifies conversations and drafts replies.

```
ORCHESTRATOR (this skill)
  │
  ├── Phase 0: SETUP + STATE
  │     Context7 doc review → Health check → Pre-session → Agent messages
  │
  ├── Phase 1: INBOX INPUT (Manual)
  │     Omar provides inbox data (copy-paste, export, screenshot) → Parse messages
  │
  ├── Phase 2: CLASSIFY & DRAFT (sub-agent)
  │     Classify → Draft replies for actionable conversations
  │     Returns: draft cards (JSON)
  │
  ├── Phase 3: APPROVAL (orchestrator handles directly)
  │     Present all drafts → Wait for Omar
  │
  └── Phase 4: SEND & SUMMARY (orchestrator handles directly)
        Omar sends approved replies manually → Log to graph → Apollo CRM notes → Telegram alert
```

---

## Execution Steps

### Step 0 — Setup (Orchestrator)

0a. **Context7 Documentation Review** (MANDATORY):
   - Review FalkorDB Python client docs:
     - `resolve-library-id("FalkorDB")` → `/falkordb/falkordb-py`
     - `query-docs("/falkordb/falkordb-py", "graph queries MERGE upsert contact interaction")`
   - See `shared_references/context7-documentation.md`.

0b. **Health Check**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py health-check
   ```

0c. **Register Agent** (first run only):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py register-agent --name "linkedin_triage" --channels "linkedin" --capabilities "inbox_triage,reply_drafting,message_classification"
   ```

0d. **Pre-Session Check**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py pre-session-check --agent "linkedin_triage"
   ```

0e. **Read Agent Messages**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py get-messages --agent "linkedin_triage"
   ```

0f. **Recall Memories**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py recall --agent "linkedin_triage" --limit 20
   ```

0g. **Load Knowledge**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py query-knowledge --category "outreach" --tags "linkedin"
   ```

1. Create working directories:
   ```bash
   mkdir -p /tmp/linkedin-ops
   ```

2. Check for shared intel from Outlook: read cross-channel signals via `pre-session-check` output (replaces JSON file reads).

### Step 1 — Phase 1: Inbox Input (Manual)

Omar provides LinkedIn inbox data in one of these formats:
- **Copy-paste**: Raw message text pasted into the conversation
- **Export file**: CSV or JSON export from LinkedIn
- **Screenshot**: Image of inbox (parse with vision)

Parse the provided data and build a conversation index. For each message:
- Extract sender name, headline, message text, timestamp
- Check if sender matches any contacts in the graph:
  ```bash
  python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py check-contact --name "Sender Name" --linkedin-url "https://linkedin.com/in/sender"
  ```
- Flag contacts that appear in pre-session-check recently_contacted list

### Step 2 — Phase 2: Draft Replies

Spawn a sub-agent via `Task` tool with `subagent_type: "general-purpose"` for classification and drafting.

The sub-agent receives:
- Parsed inbox data (all messages from Omar's input)
- Pre-session check data (recently contacted, DNC list, agent messages)
- Relevant memories and knowledge
- Paths to shared reference files

The sub-agent:

1. **Classifies** each conversation using the Classification Guide below
   - **Invoke** `/sentiment-analysis-tool:analyze-sentiment` on each message to gauge sender intent (positive/negative/neutral) and urgency level
2. **Pre-draft dedup check** for each actionable conversation:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py check-contact --linkedin-url "https://linkedin.com/in/sender" --name "Sender Name"
   ```
   - `DO_NOT_CONTACT`: skip
   - `CAUTION`: flag for Omar
   - `CLEAR`: proceed
3. **Pulls relevant knowledge**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py query-knowledge --tags "linkedin,persona_lane_B"
   ```
4. **Drafts replies** using the Response Guidelines below
   - **Invoke** `/discovery-questionnaire:discovery` for WARM INBOUND senders to structure qualification questions
   - **Invoke** `/marketing-skills:sales-enablement` for meeting booking language in HOT PROSPECT replies
   - **Invoke** `/humanizer` to strip AI patterns from every draft
   - **Invoke** `/writing-clearly-and-concisely` for final brevity pass
   - **Invoke** `/professional-communication` to ensure appropriate LinkedIn conversational tone
5. Writes results to `/tmp/linkedin-ops/triage-results.json`

### Step 3 — Approval (Orchestrator)

Read triage results and present drafts to Omar. For each actionable conversation:

```
---
SENDER: [Name] — [Headline]
CLASSIFICATION: [HOT PROSPECT / WARM INBOUND / EXISTING CONTACT]
PERSONA LANE: [A: Treasury | B: Payments | C: Partnerships | D: Technical | E: Compliance]
THEIR MESSAGE: [Quote or summary — max 3 sentences]
THREAD CONTEXT: [Brief history if relevant, or "First message"]
DRAFT REPLY: [Proposed response]
CONFIDENCE: [High / Medium / Low]
OUTLOOK: [Any related Outlook activity from graph state, or "None"]
NOTE: [Any context Omar should know]
---
```

Also present skipped conversations:
```
SKIPPED:
  - [Name] — RECRUITER
  - [Name] — SPAM / IRRELEVANT
```

**Wait for Omar to approve, edit, or skip each draft before sending.**

**Note:** Approved replies must be sent manually by Omar on LinkedIn. Present the approved reply text for Omar to copy-paste.

### Step 4 — Post-Send & Summary (Orchestrator)

#### Post-Send: Log to Graph & Apollo CRM

For each sent reply (after Omar confirms it was sent):

1. **Log interaction**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-interaction --linkedin-url "https://linkedin.com/in/contact" --channel "linkedin" --type "reply" --direction "outbound" --summary "Replied to LinkedIn message about..." --agent-name "linkedin_triage" --draft-approved
   ```

2. **Upsert contact** (enrich from LinkedIn data):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py upsert-contact --linkedin-url "https://linkedin.com/in/contact" --name "Name" --title "Title" --company-name "Company" --persona-lane "B"
   ```

3. **Sync to Apollo CRM** (if contact is a prospect):
   ```json
   {
     "tool_slug": "APOLLO_CREATE_CONTACT",
     "arguments": {
       "first_name": "First",
       "last_name": "Last",
       "organization_name": "Company",
       "title": "Title",
       "label_names": ["TheGent-LinkedIn-Triage"]
     }
   }
   ```
   If contact already exists in Apollo, use `APOLLO_UPDATE_CONTACT` to add interaction notes.

4. **Create follow-up**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py create-follow-up --linkedin-url "https://linkedin.com/in/contact" --due-date "YYYY-MM-DD" --type "linkedin_follow_up" --description "Follow up on LinkedIn reply to [Name]"
   ```

5. **Post cross-channel signal** (if prospect is hot):
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message --from-agent "linkedin_triage" --to-agent "outlook_triage" --type "PROSPECT_SIGNAL" --payload '{"contact_linkedin":"https://linkedin.com/in/contact","signal":"Hot prospect on LinkedIn, coordinate email follow-up"}'
   ```

6. **Remember notable learnings**:
   ```bash
   python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py remember --key "linkedin_contact_NAME" --content "Key insight about this contact" --tags "contact,linkedin" --agent "linkedin_triage" --contact "Name"
   ```

#### End-of-Session: Log Session

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-session --session-id "linkedin-triage-YYYYMMDD-HHMM" --agent-name "linkedin_triage" --skills-run "inbox_triage" --contacts-processed N --interactions-logged N --follow-ups-created N --summary "Processed N LinkedIn messages, drafted N replies"
```

#### Telegram Alert

```json
{
  "tool_slug": "TELEGRAM_SEND_MESSAGE",
  "arguments": {
    "chat_id": "1778273779",
    "text": "LinkedIn Inbox Triage Complete\n\nActionable: [count]\nSkipped: [count]\nReplies drafted: [count]\n\nReady in Cowork."
  }
}
```

NEVER include message content or sender names in Telegram.

#### Display Summary

```
=== LINKEDIN INBOX TRIAGE COMPLETE ===
Time: [timestamp]
Total messages processed: [count]

ACTIONABLE:
  - HOT PROSPECT: [count]
  - WARM INBOUND: [count]
  - EXISTING CONTACT: [count]

SKIPPED:
  - RECRUITER: [count]
  - SPAM / IRRELEVANT: [count]

Replies drafted: [count]
Replies approved: [count]

CROSS-CHANNEL:
  - Outlook signals consumed: [count]
  - Prospect signals posted for Outlook: [count]
===
```

Clean up: `rm -rf /tmp/linkedin-ops/`

---

## Classification Guide

| Classification | Description |
|---|---|
| **HOT PROSPECT** | Target org (bank, central bank, FMI, payment provider in ASIAPAC) engaged meaningfully — asked a question, responded to outreach, expressed interest |
| **WARM INBOUND** | Relevant professional who reached out first or connected recently — target org or adjacent (fintech, regtech, consulting) |
| **EXISTING CONTACT** | Ongoing relationship — check conversation history for prior exchanges |
| **COLLEAGUE / INTERNAL** | TheGent team member. Flag for Omar. Do NOT draft |
| **RECRUITER** | Ignore completely |
| **SPAM / IRRELEVANT** | Sales pitches, irrelevant connection follow-ups, crypto promoters. Ignore |

**Outlook cross-check:** If a contact appears in the Outlook shared-intel file, note this in the classification. Avoid drafting a reply that contradicts or duplicates what the Outlook agent already sent.

---

## Response Guidelines

### HOT PROSPECT
- Acknowledge their message specifically (reference what they said)
- One line of relevant value (insight, market observation — not a pitch), **using the value angle from their persona lane**
- Propose a specific meeting: "Would [day] work for a 20-minute call? I can walk you through how this works for [your specific context]."
- Under 4 sentences. No corporate fluff. No "I hope this message finds you well."
- Tone: direct, knowledgeable peer — not a salesperson
- **Invoke** `/marketing-skills:sales-enablement` for proven meeting booking language
- **FC entities**: Weave in regulatory awareness naturally
- **Participants**: Focus on network access and expansion — don't reference regulation unprompted

### WARM INBOUND
- Thank them for reaching out
- One qualifying question about their interest or role
- If clearly relevant, suggest a brief call
- Under 3 sentences
- **Invoke** `/discovery-questionnaire:discovery` for structured qualifying questions

### EXISTING CONTACT
- Read the full thread for context
- Respond naturally to whatever they said
- If natural opening to meet, suggest it. Don't force it
- Match their tone and energy

### LinkedIn-Specific Formatting
- Short paragraphs — LinkedIn messages render poorly with long blocks
- No email-style salutations or sign-offs. Keep it conversational
- No bullet points or HTML — plain text only
- Omar's LinkedIn voice: direct, warm, approachable. More casual than email
- No emojis
- Never reveal AI involvement

---

## Preferences

- Step-by-step delivery — one step, pause, confirm before next
- Full file reads — never truncate
- No code changes without explicit approval
- Autonomous execution — don't hand me instructions to run manually
