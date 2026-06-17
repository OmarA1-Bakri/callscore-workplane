# autobench-linkedin — Optimize LinkedIn Connection Note Templates

## Goal

Maximize the **acceptance rate** of LinkedIn connection request notes sent by Omar Al-Bakri at RTGS.global. The metric is a float 0.0-1.0 representing the proportion of connection requests that result in an acceptance or reply.

## Target File

The connection note template that the agent mutates each iteration. This is the ONE file the agent edits — everything else is read-only.

The template defines:
- Structure and flow of the connection note
- Placeholders for personalization (prospect name, company, role, shared context)
- Tone and voice guidelines
- Example notes for different persona lanes

## What "Better" Means

- Metric name: `acceptance_rate`
- Direction: `higher` is better
- Scale: 0.0 to 1.0 (0% to 100% acceptance rate)
- Current best: see `results.tsv` (updated automatically)
- Cold-start scoring uses LLM-as-judge until real data reaches n=5

A good LinkedIn connection note:
1. Gets accepted (the only metric that matters)
2. Makes Omar memorable (so the follow-up message lands)
3. Feels like a real person wrote it (not a bot, not a recruiter, not a sales pitch)

## Constraints (HARD — violation = auto-discard)

### Compliance Hard Gates (8 rules — ALL must pass)

Every generated note must pass these. The bench script checks compliance. Any violation = metric 0.

| # | Rule | What It Means |
|---|---|---|
| 1 | No pricing or commercial terms | Never mention costs, fees, pricing, or contractual details |
| 2 | No commitments | Never say "we can do X", "we'll integrate with Y", "we guarantee Z" |
| 3 | No confidential info | Never mention other clients, partnerships, or pipeline details |
| 4 | No negotiation | Goal is connection, not deal terms. Connection notes have NO CTA |
| 5 | Never reveal AI involvement | Must read as Omar's own writing |
| 6 | No emojis | Zero emojis in LinkedIn connection notes |
| 7 | No unverified settlement/delivery claims | Don't claim "instant settlement" or "guaranteed delivery" without T1 evidence |
| 8 | No unverified regulatory status | Don't state a prospect's regulatory status unless confirmed |

### Format Constraints

- **Max 300 characters** (LinkedIn hard limit for connection notes)
- **No CTA** in the connection note — the goal is just to get accepted, not to book a meeting
- **No hashtags** — this is a personal note, not a post

### Voice Constraints

- Must sound like Omar: professional, warm, direct, no corporate fluff
- Conversational but not casual — think "colleague at a conference", not "cold email"
- Specific, not generic — every note should reference something about the prospect
- No buzzwords: "synergy", "leverage", "game-changer", "disruptive", "innovative"
- No filler: "I hope this finds you well", "I noticed your impressive profile"

## What You CAN Do

- Restructure the template entirely (order of elements, flow)
- Change the personalization hook strategy (company-based, role-based, industry-based, news-based)
- Adjust the value proposition framing for different persona lanes
- Experiment with different opening lines
- Experiment with different closing lines (without adding a CTA)
- Try different levels of specificity vs generality
- Change the ratio of "about them" vs "about Omar/RTGS"
- Experiment with question-based vs statement-based approaches
- Test curiosity gaps and open loops

## What You CANNOT Do

- Modify any file other than the target template
- Add a CTA (call to action) to the connection note
- Exceed 300 characters in any example note
- Violate any of the 8 compliance hard gates
- Change the bench script or evaluation harness
- Add emojis
- Use Omar's competitors' names
- Reference specific client names or deal details

## Optimization Levers (prioritized)

Focus your experiments on these dimensions, roughly in this priority order:

### 1. Personalization Hooks (highest impact)
The #1 driver of acceptance rate. A note that references something specific about the prospect (their company's recent news, their role's pain points, shared industry context) dramatically outperforms generic notes. Experiment with:
- Company-specific hooks ("saw [Company] is expanding into [corridor]")
- Role-specific hooks ("as someone leading payments at [Company]...")
- Industry-specific hooks (shared regulatory landscape, market trends)
- Mutual connection/context hooks (shared groups, events, geography)

### 2. Value Proposition Clarity
The reader should understand in 1 sentence what RTGS does and why it's relevant to them. Experiment with:
- Problem-first framing ("cross-border settlement is still T+2...")
- Solution-first framing ("real-time cross-border settlement for banks...")
- Outcome-first framing ("cutting settlement time from days to seconds...")
- Persona-specific framing (treasury angle vs payments angle vs compliance angle)

### 3. Curiosity Triggers
Give just enough information to make them want to learn more, but not so much that they feel they already know everything. Experiment with:
- Open questions ("curious how you're handling [X] at [Company]?")
- Intriguing but incomplete claims ("we're seeing [trend] change how banks think about [X]")
- Social proof hints without naming names ("several [region] banks are exploring this")
- Contrarian takes ("most people think [X], but we're finding [Y]")

### 4. Brevity and Word Economy
With 300 chars, every word must earn its place. Experiment with:
- Shorter notes (150-200 chars) vs fuller notes (250-300 chars)
- Sentence count (1 sentence vs 2 sentences vs 3 short sentences)
- Which elements to cut when space is tight

## Persona Lanes (for context)

Connection notes should be adaptable to 5 persona lanes. The template should provide differentiated approaches:

| Lane | Title Pattern | Angle |
|---|---|---|
| A: Treasury | CFO, Treasurer, Head of Treasury | Cost of capital, liquidity, FX settlement risk |
| B: Payments | Head of Payments, Director of Payment Ops | Settlement speed, correspondent banking pain, compliance burden |
| C: Partnerships | BD, Strategy, Partnerships | Market expansion, new corridors, competitive positioning |
| D: Technical | CTO, Head of Engineering, Architect | API integration, ISO 20022, technical architecture |
| E: Compliance | CCO, Head of Compliance, Regulatory | Regulatory alignment, AML/KYC, cross-border compliance |

## Context

- Omar Al-Bakri is Head of Sales, ASIAPAC at RTGS.global
- RTGS.global provides real-time gross settlement infrastructure for cross-border payments
- Target geography: Singapore, Hong Kong, Australia, Japan, broader ASIAPAC
- Target personas: senior payments/treasury/compliance leaders at banks, FMIs, and large fintechs
- The connection note is the first touchpoint — it must earn the right to a follow-up conversation
- LinkedIn connection notes with personalization have 2-3x higher acceptance rates than generic ones

## Hints

If you get stuck, try:
1. Study which experiments had the highest cold-start scores and push those angles further
2. Combine the best-performing personalization hook with the best value prop framing
3. Try removing an element entirely — sometimes less is more in 300 chars
4. Ask: "Would I accept this from a stranger?" — if not, it needs more specificity
5. Try the opposite tone of your last 3 failed experiments
6. Look at what real LinkedIn connection notes from BD professionals look like
7. Test whether leading with a question outperforms leading with a statement
8. Experiment with "I" vs "we" framing (Omar as individual vs RTGS as company)
