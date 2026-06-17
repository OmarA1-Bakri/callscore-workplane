# autoprompt — LinkedIn Content Hook Optimization

## Goal

Maximize engagement score (0-100, higher = better) for LinkedIn content hook templates (post opening lines).

## Target File

`agent_workflows/content_creator/templates/content_hook.md`

This file contains the hook template — the opening line(s) of a LinkedIn post that appear above the "see more" fold. The hook determines whether someone stops scrolling and reads the full post. It is the single highest-leverage element of any LinkedIn post.

## What "Better" Means

A higher score means the hook is more likely to stop the scroll and earn a click on "see more." Engagement correlates with:
- **Pattern interrupt** — breaks the reader out of autopilot scrolling
- **Curiosity gap** — creates a question in the reader's mind that the post promises to answer
- **Specific value promise** — the reader knows exactly what they'll get from reading further
- **Emotional resonance** — triggers recognition, surprise, or disagreement
- **Credibility signal** — shows the author has standing to make this claim

Metric details:
- Metric name: `engagement`
- Direction: `higher` is better
- Scale: 0-100 (composite of clarity, output quality, specificity, conciseness)
- Current best: check `results.tsv` (updated automatically)

## What You CAN Do

- Rewrite the hook template entirely
- Change the structural format (question, statement, story opener, statistic, contrarian take, etc.)
- Add, remove, or rename content variables (e.g., `{{topic}}`, `{{insight}}`, `{{stat}}`)
- Experiment with different hook archetypes (see Hints section)
- Vary line breaks and whitespace within the first-line constraint
- Test different levels of specificity vs intrigue
- Try first-person vs second-person vs third-person framing

## What You CANNOT Do

- Modify any file other than the target file
- Modify the bench script or evaluation harness
- Exceed 150 characters on the first visible line (LinkedIn "see more" fold)
- Use clickbait or misleading claims (the hook must honestly represent the post content)
- Make claims that can't be substantiated in the post body
- Use engagement-bait tactics that LinkedIn's algorithm penalizes (e.g., "agree?", "thoughts?", reaction-farming)
- Break Omar's professional voice (no hype, no influencer-speak, no cringe)
- Use emojis unless they serve a clear structural purpose (e.g., a single bullet-point emoji for a list)

## Hard Gates (auto-fail if violated)

These are binary pass/fail checks. If ANY gate fails, the template scores 0 regardless of other quality:

1. **First line <= 150 characters** (must be visible before the fold)
2. **No misleading claims** (hook must honestly represent what the post delivers)
3. **No engagement-bait phrases** ("agree?", "thoughts?", "like if you...", "share this")
4. **Maintains professional voice** (no hype, no influencer-speak)
5. **No false authority claims** (don't claim expertise Omar doesn't have)
6. **Template includes at least one content variable** for customization per post

## Simplicity Criterion

All else equal, simpler is better:
- A clean one-liner that scores 75 beats a multi-line construction that scores 78
- Natural phrasing beats "engineered" phrasing
- If the hook works without a variable, that's fine — but it must still have at least one variable for customization
- Hooks that work across multiple topics are more valuable than topic-specific ones

## Context

**Who is Omar**: Founder/CEO in fintech (RTGS/payments infrastructure). Posts on LinkedIn about payments technology, banking infrastructure, fintech strategy, and entrepreneurship. Technical credibility, practical experience, insider perspective.

**Who is the audience**: Senior professionals in banking, payments, fintech, and financial infrastructure. They are on LinkedIn during commute or between meetings. They scroll fast. They've seen every generic "leadership lesson" and "hustle culture" post. They respond to substance, not style.

**What works on LinkedIn (Q1 2026 algorithm)**:
- Personal stories with professional insight (highest engagement format)
- Contrarian takes with evidence ("Most people think X. The data says Y.")
- Specific numbers and results ("We processed 2M transactions in 48 hours. Here's what broke.")
- Behind-the-scenes operational stories
- Framework posts ("The 3-layer model for evaluating payment rails")
- "I was wrong about X" posts (vulnerability + credibility)

**What does NOT work**:
- Generic motivational quotes
- "I'm humbled to announce" posts
- Pure self-promotion
- Vague thought leadership without concrete examples
- Long hooks that bury the lead
- Hooks that could be about any industry (no specificity)

**Platform mechanics**:
- First ~150 chars are visible before "see more"
- LinkedIn's algorithm rewards dwell time (time spent reading)
- Posts with high "see more" click rates get amplified
- The hook-to-body transition matters — the hook creates a promise the body must fulfill

## Hints

If you get stuck, try these proven hook archetypes:

1. **Contrarian** — "Everyone says X. They're wrong." / "The worst advice in payments: [specific bad advice]"
2. **Specific number** — "2,847 failed transactions taught me one thing." / "{{stat}} — and nobody is talking about why."
3. **Personal failure** — "I built the wrong thing for 6 months." / "The meeting where I realized {{insight}}."
4. **Question that implies insight** — "Why do 80% of instant payment implementations fail in month 3?"
5. **Before/after** — "Last year: manual reconciliation. This year: {{result}}."
6. **Pattern reveal** — "I've reviewed 50 payment architectures. They all make the same mistake."
7. **Story opener** — "The CEO looked at the dashboard and said: '{{quote}}.'"
8. **Framework tease** — "There are exactly 3 reasons {{topic}} fails. Most teams only fix #1."

Other strategies:
- **Combine two archetypes** — e.g., contrarian + specific number
- **Try radical brevity** — Can the hook be under 50 characters and still work?
- **Test different emotional registers** — curiosity, surprise, recognition, urgency, humor
- **Read discarded experiments** — Look at results.tsv for what the judge penalizes
- **Swap the subject** — If recent hooks were about payments, try one about leadership or building a company
