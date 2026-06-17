# autoprompt — LinkedIn Connection Note Optimization

## Goal

Maximize quality score (0-100, higher = better) for LinkedIn connection note templates used in BD outreach.

## Target File

`agent_workflows/linkedin_BD/templates/connection_note.md`

This file contains the connection note template that gets sent to prospects on LinkedIn. The template uses Jinja-style variables (e.g., `{{company}}`, `{{role}}`, `{{first_name}}`) that are filled at send time with prospect-specific data from the state manager.

## What "Better" Means

A higher score means the connection note is more likely to be accepted. Acceptance correlates with:
- **Genuine personalization** — the note feels like it was written for this specific person, not batch-sent
- **Shared context** — references something real (industry, mutual interest, recent event) that creates common ground
- **Warm professional tone** — sounds like Omar (direct, professional, warm, no corporate-speak)
- **Curiosity, not pitch** — invites a relationship, not a transaction
- **Compliance** — passes all RTGS regulatory and professional conduct gates

Metric details:
- Metric name: `quality`
- Direction: `higher` is better
- Scale: 0-100 (composite of clarity, output quality, specificity, conciseness)
- Current best: check `results.tsv` (updated automatically)

## What You CAN Do

- Rewrite the connection note template entirely
- Change the tone, structure, or approach
- Add, remove, or rename personalization variables (but at least one must remain)
- Try different psychological frameworks (curiosity gap, social proof, shared identity, etc.)
- Experiment with word order, sentence structure, and information density
- Test different opening lines and closing lines
- Vary the level of specificity vs generality

## What You CANNOT Do

- Modify any file other than the target file
- Modify the bench script or evaluation harness
- Exceed 300 characters (LinkedIn connection note hard limit)
- Include pricing, fees, commercial terms, or rate quotes
- Include commitments, guarantees, or promises of any kind
- Include confidential or proprietary information
- Reveal or hint at AI involvement in drafting the message
- Use emojis of any kind
- Use a hard call-to-action (no "let's schedule a call", "can we meet", "I'd love to pitch you")
- Use generic flattery ("I'm impressed by your profile", "your work is amazing")
- Sound salesy, pushy, or transactional
- Use buzzwords or jargon that real humans don't say in DMs

## Hard Gates (auto-fail if violated)

These are binary pass/fail checks. If ANY gate fails, the template scores 0 regardless of other quality:

1. **Character count** <= 300 characters (with variables expanded to typical values)
2. **No pricing or commercial terms** anywhere in the template
3. **No commitments or guarantees**
4. **No confidential information**
5. **No AI disclosure** (no mention of AI, automation, or generated content)
6. **No emojis**
7. **At least one personalization variable** (`{{company}}`, `{{role}}`, `{{first_name}}`, or similar)
8. **No hard CTA** (connection notes are for opening doors, not booking meetings)

## Simplicity Criterion

All else equal, simpler is better:
- A short, punchy note that scores 75 beats a convoluted note that scores 77
- Natural language that flows conversationally beats "optimized" phrasing that sounds robotic
- If removing a sentence doesn't hurt the score, remove it

## Context

**Who is Omar**: Founder/CEO of a fintech company focused on real-time gross settlement (RTGS) infrastructure. Technical background, genuine interest in payments, banking, and financial infrastructure.

**Who are the prospects**: Senior people at banks, payment providers, central banks, fintechs, and financial infrastructure companies. They are busy, skeptical of cold outreach, and receive many connection requests daily.

**What works in this domain**:
- Referencing a specific aspect of their company's payments infrastructure or strategy
- Mentioning a shared interest in a specific technology or regulatory development
- Acknowledging their expertise in a particular area
- Connecting over industry events, publications, or thought leadership
- Being genuinely curious about their perspective on a trend

**What does NOT work**:
- Generic "I'd love to connect" messages
- Flattery without substance
- Name-dropping without context
- Long messages that require scrolling
- Anything that reads like a sales template

**RTGS compliance context**: Connection notes must not make any forward-looking statements, revenue claims, or regulatory promises. They are relationship-building only.

## Hints

If you get stuck, try:
1. **Specificity over length** — "Saw {{company}}'s approach to instant payments" beats "I noticed your interesting work in the payments space"
2. **Question format** — Ending with a genuine question can increase acceptance: "curious how {{company}} is approaching X?"
3. **Shared identity** — "Fellow payments infrastructure nerd" creates tribal belonging
4. **Timeliness** — Referencing a recent industry development makes the note feel current, not canned
5. **Asymmetric information** — Showing you know something specific about their company that most cold-connectors wouldn't
6. **Try the opposite** — If recent attempts were question-heavy, try a statement. If they were industry-focused, try personal.
7. **Read rejected experiments** — Look at results.tsv for patterns in what the judge penalizes
8. **Radical brevity** — Try a 100-character version. Sometimes less is more.
