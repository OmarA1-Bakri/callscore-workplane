---
name: content-creator
description: >
  Multi-platform content creation agent for LinkedIn posts/articles, personal blog writing
  for omarbakri.com, personal newsletter writing for intelligentrails.news, and X/Twitter. Orchestrates the full pipeline:
  strategy, research, ideation, drafting, humanization, quality review, and publishing.

  Use when the user asks to:
  (1) Create content for LinkedIn, X/Twitter, blog, or newsletter
  (2) Plan a content calendar or batch content
  (3) Write a LinkedIn post, article, or carousel
  (4) Write a tweet, thread, or X post
  (5) Write a blog post or newsletter article
  (6) Repurpose content across platforms
  (7) Research trending topics for content ideas
  (8) Review or improve drafted content
  (9) Post or schedule content to X/Twitter
  (10) Run the full content pipeline end-to-end

  Triggers: "create content", "write a post", "linkedin post", "tweet", "blog post",
  "newsletter", "content calendar", "repurpose", "batch content", "content pipeline",
  "write for linkedin", "write for x", "post to x", "publish"
---

# Content Creator Agent

Orchestrates multi-platform content creation by coordinating specialized skills
through a 5-phase pipeline: Strategy, Research, Draft, Polish, Publish.

## Platforms

| Platform | Formats | Frequency Target |
|----------|---------|-----------------|
| LinkedIn | Posts (1080x1350 image), carousels (PDF), articles | 3-5x/week |
| X/Twitter | Tweets, threads, quote tweets | 3-10x/day |
| Blog/Newsletter | Personal long-form writing at intelligentrails.news and omarbakri.com | 1-2x/week |

## Pre-Session Setup

**Register agent** (first run only):
```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py register-agent --name "content_creator" --channels "linkedin,twitter,blog" --capabilities "content_creation,research,publishing,analytics"
```

## Pipeline Overview

```
Phase 1: STRATEGY   --> content-strategy, brainstorming
Phase 2: RESEARCH   --> x-twitter-scraper (Xquik), web search, competitor analysis
Phase 3: DRAFT      --> social-content, linkedin-growth-engine, article-writing
Phase 4: POLISH     --> humanizer, writing-clearly-and-concisely
Phase 5: PUBLISH    --> Rube X/Twitter API, Rube LinkedIn API, manual blog
```

### Additional Skills (invoke as needed per phase)

| Skill | Phase | Purpose |
|-------|-------|---------|
| `marketing-skills:copywriting` | Draft (3) | Compelling copy frameworks and persuasion techniques |
| `marketing-skills:copy-editing` | Polish (4) | Professional editing, grammar, style consistency |
| `marketing-skills:ai-seo` | Research (2), Draft (3) | Keyword research, SEO-optimized headlines and structure |
| `marketing-skills:competitor-alternatives` | Research (2) | Competitive content gap analysis and differentiation |
| Google GenAI SDK (Imagen) | Draft (3) | AI-generated images for LinkedIn posts and blog headers |
| `marketing-skills:analytics-tracking` | Publish (5) | UTM parameters, engagement tracking, performance measurement |
| `marketing-skills:marketing-psychology` | Strategy (1), Draft (3) | Persuasion principles, cognitive biases, engagement triggers |

## How to Use This Skill

Determine what the user needs and enter the pipeline at the right phase:

- **"I don't know what to write"** --> Start at Phase 1 (Strategy)
- **"Write about [topic]"** --> Start at Phase 3 (Draft), skip to Phase 4/5
- **"Improve this draft"** --> Start at Phase 4 (Polish)
- **"Post this to X"** --> Start at Phase 5 (Publish)
- **"Plan my week's content"** --> Phase 1 + batch Phase 3-4 for all pieces
- **"Repurpose this blog post"** --> See references/repurposing.md

## Phase 1: Strategy

Use when the user needs direction on what content to create.

**Invoke**: `/content-strategy` for topic clusters, pillars, keyword mapping.
**Invoke**: `/brainstorming` for ideation when stuck or exploring angles.

Key decisions to guide:
1. **Platform**: Where will this content live? (determines format constraints)
2. **Type**: Searchable (SEO) or shareable (viral)? See content-strategy skill.
3. **Buyer stage**: Awareness, consideration, decision, implementation
4. **Pillar**: Which of the user's 3-5 content pillars does this serve?

Output: A prioritized list of content pieces with platform, format, and angle.

## Phase 2: Research

Gather supporting data, examples, and trending context.

**For X/Twitter trends**: Use x-twitter-scraper skill (Xquik API) to search tweets,
analyze engagement, find trending topics. Requires `xq_` API key.

**For web research**: Use Rube search tools:
- Tavily (via Rube): `TAVILY_TAVILY_SEARCH` for broad web research and trending topics
- Exa (via Rube): `EXA_SEARCH` for deep semantic research and content discovery
- Fallback: Use WebSearch for Reddit, competitor sites, and data points

**For LinkedIn research**: Search for top-performing posts in the user's niche.
Use the linkedin-growth-engine references for engagement pattern analysis.

**For competitive analysis**: **Invoke** `/marketing-skills:competitor-alternatives` to identify content gaps, differentiation angles, and topics competitors are missing.

**For SEO research**: **Invoke** `/marketing-skills:ai-seo` for keyword research, search intent analysis, and SEO-optimized content angles.

Output: Research brief with key data points, quotes, angles, and competitor gaps.

## Phase 3: Draft

Create platform-specific content. See references/platform-formats.md for detailed specs.

### LinkedIn Posts
**Invoke**: linkedin-growth-engine workflow.

Core rules (non-negotiable):
- Hook: exactly 2 sentences, ~55 characters each
- Body: about the reader, never the creator
- Image: 1080x1350 (4:5) — choose method based on content type:
  - **Imagen** (Google GenAI SDK): for editorial/illustrative images with no text overlay
  - **PIL/Pillow** (branded images): for announcement posts, teasers, and any image requiring text, quotes, or brand typography — see image generation guide below
- No hashtags, no emojis in copy
- CTA: specific question, not "What do you think?"
- Use Google GenAI SDK (Imagen) for AI-generated 1080x1350 images (editorial, no text)
- **Invoke** `/marketing-skills:copywriting` for proven hook frameworks and persuasion copy
- **Invoke** `/marketing-skills:marketing-psychology` for engagement triggers (curiosity gap, social proof, loss aversion)

### PIL Branded Image Generation (1080×1350)

Use when the image needs text, a pull quote, a title card, or TheGent brand colours. This is the correct method for **teaser posts** and **announcement posts**.

```python
from PIL import Image, ImageDraw, ImageFont
import textwrap

def create_branded_image(headline, subtext, output_path,
                          bg_color="#0A0A0A", accent_color="#00D4FF",
                          text_color="#FFFFFF", width=1080, height=1350):
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Brand accent bar
    draw.rectangle([(80, 120), (180, 128)], fill=accent_color)
    
    # Headline — wrap at ~30 chars for large type
    try:
        font_headline = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 38)
        font_brand = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except OSError:
        font_headline = font_sub = font_brand = ImageFont.load_default()
    
    y = 180
    for line in textwrap.wrap(headline, width=20):
        draw.text((80, y), line, font=font_headline, fill=text_color)
        y += 90
    
    y += 40
    for line in textwrap.wrap(subtext, width=42):
        draw.text((80, y), line, font=font_sub, fill="#CCCCCC")
        y += 52
    
    # Brand footer
    draw.rectangle([(0, height - 100), (width, height)], fill="#111111")
    draw.text((80, height - 65), "TheGent", font=font_brand, fill=accent_color)
    
    # Strip metadata (AI-detection prevention)
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))
    clean.save(output_path)
    return output_path
```

**When to use which method:**
| Situation | Method |
|---|---|
| Editorial illustration, no text | Imagen (Google GenAI SDK) |
| Announcement, teaser, title card | PIL (branded) |
| Pull quote image | PIL (branded) |
| Abstract visual that reinforces a concept | Imagen |

### LinkedIn Teaser Post (Repurposing Format)

Use when promoting an upcoming or just-published newsletter/blog article on LinkedIn. This is a distinct format from a regular LinkedIn post.

**Structure:**
1. **Hook** (2 lines ~55 chars each): Tease the core tension/insight without giving it away
2. **Body** (2-3 short paragraphs): One provocative claim from the article + why it matters
3. **CTA**: Direct readers to the article with a question that the article answers
4. **Image**: PIL-branded title card (1080×1350) with article headline
5. **First comment**: Full article URL (never in post body)

**Teaser image spec:**
- Background: `#0A0A0A`
- Accent: `#00D4FF`
- Headline: article title in large type
- Subtext: one-line teaser ("Issue 07 | intelligentrails.news")
- Brand footer: "TheGent"

**Cadence:** Post Teaser 1 the day the article publishes. Post Teaser 2 the following day to capture different time-zone audiences.

### LinkedIn Carousels
- 6-14 slides, 1080x1350 per slide, export as PDF
- Slide 1: polarising headline. Slides 2-8: one insight each. Last slide: CTA.
- See references/platform-formats.md Section 2.

### X/Twitter Posts
**Invoke**: social-content skill for tweet/thread drafting.

Core rules:
- Tweets: 280 chars max, front-load the hook
- Threads: 3-10 tweets, number them, first tweet is the hook
- No hashtags in most cases (unless trending topic strategy)
- Contrarian takes and specific numbers perform best
- **Invoke** `/marketing-skills:copywriting` for concise, punchy copy techniques

### Blog/Newsletter Articles
**Invoke**: article-writing skill (everything-claude-code:article-writing).

Core rules:
- Structure: Hook, Stakes, Body (H2/H3), Takeaway, CTA
- Voice: conversational authority, avoid "I think" hedging
- Length: 800-2000 words for blog, 500-1200 for newsletter
- SEO: target keyword in title, H2s, first paragraph, URL
- **Invoke** `/marketing-skills:ai-seo` for on-page SEO optimization (meta descriptions, header structure, keyword density)
- **Invoke** `/marketing-skills:copywriting` for compelling introductions and CTAs

Additional rule for Omar's personal properties:
- `omarbakri.com` and `intelligentrails.news` are personal writing surfaces. The content should reflect Omar's own point of view on AI, FinTech, business strategy, leadership, and sales judgment.
- Do NOT default to TheGent product marketing or buyer nurture language unless Omar explicitly asks for product-led content.
- Use `references/personal-writing.md` before drafting long-form pieces.

### Repurposing
When creating multi-platform content from a single source:
- See references/repurposing.md for the full cross-platform workflow

## Phase 4: Polish

Run every piece through two quality gates before publishing.

### Gate 1: Humanizer
**Invoke**: humanizer skill.

Removes 24 known AI writing patterns:
- Filler phrases ("It's important to note", "In today's digital landscape")
- Hedging ("It's worth noting", "It could be argued")
- Purple prose ("Tapestry", "Landscape", "Paradigm shift")
- Over-structuring (excessive bullet points where prose works better)
- Sycophantic openers ("Great question!")

### Gate 2: Clarity & Conciseness
**Invoke**: writing-clearly-and-concisely skill.

Checks for:
- Unnecessary words and phrases
- Passive voice where active is better
- Jargon that excludes the target reader
- Sentence length variation (mix short and long)
- Reading level appropriate to platform

### Gate 3: Copy Editing
**Invoke**: marketing-skills:copy-editing skill.

Professional editing pass:
- Grammar, punctuation, and style consistency
- Brand voice alignment (see references/voice-guide.md)
- Fact-checking claims and statistics
- Link verification

### Quick Self-Check (Apply to Every Piece)
1. Remove your name from the post. Is it still valuable? (Reader test)
2. Read the first 2 lines only. Would you click "see more"? (Hook test)
3. What action should the reader take? Is it clear? (CTA test)
4. Does this sound like a human wrote it? (AI pattern test)
5. Is this the shortest version that conveys the full message? (Conciseness test)

## Phase 4b: Compliance & Content Review Gate (Pre-Publish)

**Every piece of content MUST pass this gate before publishing.** This is non-negotiable for public-facing content.

### Compliance Checks (derived from `shared_references/compliance-rules.md`)

| # | Rule | Action if violated |
|---|------|--------------------|
| 1 | **No pricing or commercial terms** in public posts | Remove or rephrase. Pricing is reserved for Solve/Negotiate stage. |
| 2 | **No settlement finality claims** | Replace with "near-instant" or "designed for real-time settlement". Never claim guaranteed delivery times without T1 evidence (signed contract or published service spec). |
| 3 | **No confidential info** about clients or partnerships | Only reference publicly announced relationships. If unsure, flag for Omar's review. |
| 4 | **No commitments about future product features** | Do not say "we will launch X" or "coming soon: Y" unless Omar explicitly approves. |
| 5 | **FC vs Participant distinction** | When mentioning RTGS.global use cases, apply the correct Funding Currency (FC) vs Participant distinction. Do not conflate the two. |
| 6 | **Never reveal AI involvement** | Content must read as Omar's voice. No references to AI-generated content. |

### Content Review Gate

Before publishing, verify ALL of the following and tag each:

1. **compliance_passed**: true/false — All 6 compliance checks above passed
2. **brand_voice_aligned**: true/false — Content matches Omar's voice and RTGS brand guidelines (see references/voice-guide.md)
3. **no_unverified_claims**: true/false — No claims that require T1 evidence (signed contract, published spec) are made without that evidence
4. **humanizer_passed**: true/false — Phase 4 Gate 1 (humanizer) completed
5. **clarity_passed**: true/false — Phase 4 Gate 2 (clarity & conciseness) completed

**Decision logic:**
- All tags `true` → proceed to Phase 5 (Publish)
- Any tag `false` → loop back to the relevant phase/gate and fix before proceeding
- If `compliance_passed: false` and the fix is unclear → escalate to Omar

## Phase 5: Publish

### X/Twitter
Uses Rube with Omar's X developer account. All tools via `RUBE_MULTI_EXECUTE_TOOL`.

| Action | Rube Tool Slug |
|--------|---------------|
| Post a tweet | `TWITTER_CREATION_OF_A_POST` |
| Post with media | `TWITTER_UPLOAD_MEDIA` then `TWITTER_CREATION_OF_A_POST` with media_ids |
| Post a thread | `TWITTER_CREATION_OF_A_POST` sequentially (reply_in_reply_to_tweet_id) |
| Like a tweet | `TWITTER_LIKE_A_POST` |
| Retweet | `TWITTER_RETWEET_A_POST` |
| Search/find tweets | `TWITTER_RECENT_SEARCH` |
| Verify posted tweet | `TWITTER_POST_LOOKUP_BY_POST_ID` |

Prerequisites:
- Active X/Twitter connection in Rube (see settings.local.json)

### LinkedIn
Uses Rube LinkedIn API. See settings.local.json for connection details.

| Action | Rube Tool Slug |
|--------|---------------|
| Upload image | `LINKEDIN_INITIALIZE_IMAGE_UPLOAD` |
| Create post | `LINKEDIN_CREATE_LINKED_IN_POST` |
| Comment on post | `LINKEDIN_CREATE_COMMENT_ON_POST` |
| Get analytics | `LINKEDIN_GET_SHARE_STATS` |
| List reactions | `LINKEDIN_LIST_REACTIONS` |
| Read post | `LINKEDIN_GET_POST_CONTENT` |
| Delete post | `LINKEDIN_DELETE_POST` |

Workflow:
1. Upload image via `LINKEDIN_INITIALIZE_IMAGE_UPLOAD`
2. Create post via `LINKEDIN_CREATE_LINKED_IN_POST` with text + media URN
3. Add links via `LINKEDIN_CREATE_COMMENT_ON_POST` as first comment (never in post body)

### Blog/Newsletter (Ghost API — intelligentrails.news)
Both `intelligentrails.news` and `omarbakri.com` run Ghost CMS. Publish via Ghost Admin API — do **not** use the Content API (read-only).

**Prerequisites:**
- Ghost Admin API key in `id:secret` format — obtain from Ghost Admin → Settings → Integrations → Add custom integration
- Key format: `<24-hex-id>:<64-hex-secret>` (NOT a 26-char Content API key)
- Store as `GHOST_ADMIN_API_KEY` in `.env` / Doppler

**Publish via Ghost Admin API:**
```python
import jwt, time, requests

def ghost_publish(title, markdown_content, ghost_url, admin_api_key, status="published"):
    key_id, secret = admin_api_key.split(":")
    iat = int(time.time())
    payload = {"iat": iat, "exp": iat + 300, "aud": "/admin/"}
    token = jwt.encode(payload, bytes.fromhex(secret), algorithm="HS256", headers={"kid": key_id})
    
    headers = {"Authorization": f"Ghost {token}", "Content-Type": "application/json"}
    body = {"posts": [{"title": title, "markdown": markdown_content, "status": status}]}
    
    r = requests.post(f"{ghost_url}/ghost/api/admin/posts/?source=html",
                      headers=headers, json=body)
    return r.json()

# intelligentrails.news
ghost_publish(
    title="The War for Float",
    markdown_content=open("/tmp/content-ops/drafts/newsletter-final.md").read(),
    ghost_url="https://intelligent-rails-1.ghost.io",
    admin_api_key=os.environ["GHOST_ADMIN_API_KEY"]
)
```

**Dependency:**
```bash
pip install PyJWT requests
```

**Fallback:** If Admin API key unavailable, export markdown to `/tmp/content-ops/drafts/` and instruct Omar to paste into Ghost editor manually.

### Pre-Publish: Double-Post Prevention (LinkedIn only)

Before publishing to LinkedIn, check if a post was already published today by ANY agent (growth_engine or content_creator). More than 1 LinkedIn post/day reduces per-post reach.

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py get-messages --agent "orchestrator" --mark-read
```

Search for `POST_PUBLISHED` messages with today's date. If a LinkedIn post was already published today:
- **Defer** the LinkedIn post to tomorrow, OR
- **Ask Omar** if he wants to override (with warning about algorithm penalty)

### Post-Publish: Analytics Tracking & Feedback Loop
**Invoke**: marketing-skills:analytics-tracking skill.

For every published piece:
- Add UTM parameters to all links (utm_source, utm_medium, utm_campaign)
- Set up tracking for engagement metrics (views, clicks, shares, comments)
- Establish baseline metrics for A/B comparison
- Schedule 48-hour performance review checkpoint

**Log to state_manager** (closes the analytics feedback loop — enables orchestrator to compare content performance across all workflows):

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "content_creator" \
  --to-agent "orchestrator" \
  --type "POST_PUBLISHED" \
  --payload '{"platform": "[linkedin|twitter|blog]", "post_id": "...", "topic": "...", "pillar": "...", "format": "[post|carousel|thread|article]", "timestamp": "..."}'
```

For LinkedIn posts, also log the post URN for analytics retrieval:
```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "content_creator" \
  --to-agent "orchestrator" \
  --type "METRICS" \
  --payload '{"post_urn": "...", "platform": "linkedin", "initial_engagement": {"impressions": 0, "comments": 0, "likes": 0}}'
```

### Post-Publish: Interaction Logging

After publishing any content (LinkedIn post, newsletter, blog, tweet), log the interaction to the state manager for cross-agent visibility:

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py log-interaction \
  --channel "linkedin_content" \
  --type "content_post" \
  --direction "outbound" \
  --summary "Published [format] on [platform]: [topic/headline summary]" \
  --agent-name "content_creator" \
  --draft-approved
```

Adjust `--channel` per platform: `linkedin_content`, `twitter_content`, `blog_content`, `newsletter_content`.

**Cross-channel prospect signals**: If the published content mentions or tags specific prospects (e.g., a LinkedIn post tagging a prospect company, or a case study featuring a prospect's market), create a cross-channel signal so BD agents can coordinate:

```bash
python C:/Users/OmarAl-Bakri/Claude_Code_Automations/scripts/state_manager.py post-message \
  --from-agent "content_creator" \
  --to-agent "linkedin_bd" \
  --type "PROSPECT_SIGNAL" \
  --payload '{"signal": "content_mention", "prospect": "<company_or_person>", "platform": "<platform>", "post_id": "...", "context": "Tagged/mentioned in [post type] about [topic]"}'
```

Repeat for `outlook_bd` if the prospect is also in the email pipeline. This enables BD agents to reference the content in follow-up outreach ("You may have seen our recent post about...").

### Post-Publish: Context Checkpoint

After completing a content creation cycle (one or more pieces through the full pipeline), write a checkpoint report:

```bash
# Create the tmp directory if it doesn't exist
mkdir -p C:/Users/OmarAl-Bakri/Claude_Code_Automations/tmp
```

Write a JSON checkpoint to `C:/Users/OmarAl-Bakri/Claude_Code_Automations/tmp/content-report-[DATE].json` with the following structure:

```json
{
  "date": "YYYY-MM-DD",
  "agent": "content_creator",
  "session_summary": {
    "pieces_published": [
      {
        "platform": "linkedin|twitter|blog|newsletter",
        "format": "post|carousel|thread|article",
        "topic": "...",
        "post_id": "...",
        "post_url": "...",
        "compliance_passed": true,
        "brand_voice_aligned": true,
        "published_at": "ISO8601 timestamp"
      }
    ],
    "pieces_drafted_not_published": [],
    "engagement_metrics": {
      "note": "Populated at 48-hour review if available",
      "linkedin": {"impressions": 0, "comments": 0, "likes": 0, "shares": 0},
      "twitter": {"impressions": 0, "likes": 0, "retweets": 0, "replies": 0}
    },
    "prospect_signals_generated": [
      {
        "prospect": "...",
        "signal_type": "content_mention|tag|case_study",
        "sent_to_agents": ["linkedin_bd", "outlook_bd"]
      }
    ]
  }
}
```

This checkpoint enables the orchestrator to track content output and correlate it with BD pipeline activity.

## Batch Content Workflow

For weekly content batching (recommended 2-3 hours):

1. **Monday planning** (30 min): Run Phase 1 for the week. Pick 5 LinkedIn posts,
   15-20 tweets, 1-2 blog articles.
2. **Batch drafting** (60-90 min): Run Phase 3 for all pieces. Draft in order of
   platform: LinkedIn first, then X, then blog.
3. **Polish pass** (30 min): Run Phase 4 on all drafts in one session.
4. **Schedule** (15 min): Queue tweets via scheduling, prep LinkedIn posts.
5. **Daily engagement** (30 min/day): 10-15 comments before posting, engage after.

## Reference Files

- **references/platform-formats.md** -- Detailed specs, templates, and examples for each platform
- **references/repurposing.md** -- Cross-platform content adaptation workflows
- **references/voice-guide.md** -- Omar's brand voice, ICP, mission, and tone guidelines

## Component Skills Quick Reference

| Skill | When to Use |
|-------|------------|
| content-strategy | Planning what to create, topic clusters, editorial calendar |
| brainstorming | Generating ideas, exploring angles, unsticking creative blocks |
| social-content | Platform-specific social media drafting |
| linkedin-growth-engine | LinkedIn-specific tactics, hooks, engagement protocol |
| article-writing | Long-form blog posts and newsletter articles |
| humanizer | Removing AI writing patterns from any content |
| writing-clearly-and-concisely | Final clarity and brevity pass |
| Rube X/Twitter | Posting to X via TWITTER_CREATION_OF_A_POST |
| x-twitter-scraper | X/Twitter data research via Xquik API |
| copywriting | Compelling copy frameworks, persuasion techniques, hook writing |
| copy-editing | Professional editing, grammar, style consistency, brand voice |
| ai-seo | Keyword research, SEO optimization, search intent analysis |
| competitor-alternatives | Competitive content gap analysis and differentiation |
| Google GenAI SDK (Imagen) | AI image generation for LinkedIn posts and blog headers |
| analytics-tracking | UTM parameters, engagement tracking, performance measurement |
| marketing-psychology | Persuasion principles, cognitive biases, engagement triggers |
