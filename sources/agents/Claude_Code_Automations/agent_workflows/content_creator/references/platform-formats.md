# Platform Format Specifications

## Table of Contents
1. LinkedIn Posts
2. LinkedIn Carousels
3. LinkedIn Articles
4. X/Twitter Tweets
5. X/Twitter Threads
6. Blog Posts (omarbakri.com)
7. Newsletter (intelligentrails.news)

---

## 1. LinkedIn Posts

### Specs
- **Image**: 1080x1350 px (4:5 ratio), scrappy, unbranded, never looks like an ad
- **Hook**: Exactly 2 sentences, ~55 characters each (before "see more" fold)
- **Body**: 3-8 short paragraphs
- **No**: hashtags, emojis, external links in body (put links in first comment)
- **CTA**: Specific question, not generic "What do you think?"

### Template
```
[HOOK LINE 1 -- ~55 chars, pattern interrupt]
[HOOK LINE 2 -- ~55 chars, creates open loop]

[Body paragraph 1 -- establish the problem/context]

[Body paragraph 2-6 -- deliver value, one idea per paragraph]

[CTA -- specific question that invites a story or opinion]
```

### Hook Formulas (LinkedIn-Specific)
- **Contradiction**: "The worst LinkedIn posts get the most followers."
- **Specific number**: "I mass-unfollowed 2,000 people. My engagement tripled."
- **Direct accusation**: "You're writing for your mom, not your audience."
- **Stolen thought**: Express what readers secretly think but won't say.
- **Absurd reframe**: Make a mundane topic feel dramatic.

### Image Guidelines
- Search Pinterest: `[niche] + graph | cheat sheet | infographic`
- Style: handwritten, scrappy, looks like a whiteboard sketch
- Tools: Google GenAI SDK (Imagen) for generation, Canva for colour-correction
- Strip AI metadata before posting (screenshot method or metadata stripper)

---

## 2. LinkedIn Carousels

### Specs
- **Format**: PDF document upload, 1080x1350 px per slide
- **Length**: 6-14 slides
- **Tool**: Gamma.app (Studio Mode > Social > Portrait card)

### Slide Structure

| Slide | Content | Purpose |
|-------|---------|---------|
| 1 | Polarising/curiosity-gap headline | Stop the scroll |
| 2 | Stakes -- why this matters NOW | Create urgency |
| 3 | Core insight or golden quote | First value hit |
| 4-8 | One insight per slide, large text | Value breakdown |
| 9 | TL;DR checklist or summary | Bookmarkable |
| 10 | Low-friction CTA question | Drive comments |

### Design Rules
- Large text (readable on mobile without zooming)
- One idea per slide (no walls of text)
- Consistent visual style across all slides
- High contrast backgrounds

---

## 3. LinkedIn Articles

### Specs
- **Length**: 1000-3000 words
- **Format**: LinkedIn's native article editor (not a post)
- **When to use**: Deep dives, thought leadership, evergreen reference content

### Structure
```
# [SEO-friendly title with target keyword]

[Opening hook -- 2-3 sentences that create urgency or curiosity]

## [Section 1 -- The Problem]
[Establish the pain point with specifics]

## [Section 2-4 -- The Solution/Framework]
[One major point per section]

## Key Takeaways
[3-5 bullet points summarizing actionable insights]

## [CTA]
[What should the reader do next?]
```

---

## 4. X/Twitter Tweets

### Specs
- **Length**: 280 characters max (front-load the hook)
- **Media**: Images (1200x675 or 1:1), videos (up to 2:20)
- **Links**: OK in tweets (unlike LinkedIn)
- **Hashtags**: Generally skip unless riding a trending topic

### High-Performing Tweet Formats
- **Hot take**: Bold opinion in one sentence
- **List format**: "5 things [audience] should stop doing:"
- **Before/after**: "[Old way] vs [New way]"
- **One-liner**: Punchy observation that's instantly shareable
- **Question**: Ask something your audience has an opinion on

### Publishing via Rube
Use `TWITTER_CREATION_OF_A_POST` for text tweets.
For tweets with media: `TWITTER_UPLOAD_MEDIA` first, then `TWITTER_CREATION_OF_A_POST` with the returned media IDs.

---

## 5. X/Twitter Threads

### Specs
- **Length**: 3-10 tweets per thread
- **Format**: Number each tweet (1/, 2/, etc.)
- **First tweet**: The hook -- must stand alone as a great tweet

### Thread Structure
```
1/ [Hook -- the strongest, most compelling opening. This determines everything.]

2/ [Context -- why this matters, who it's for]

3-8/ [One insight per tweet, building on the previous]

9/ [Summary or key takeaway]

10/ [CTA -- follow for more, check out [link], etc.]
```

### Thread Workflow
1. Write the full thread as a document first
2. Split into tweets, ensuring each stands alone
3. Number them and check character limits
4. Post first tweet, capture the tweet ID
5. Reply to each subsequent tweet in the chain

---

## 6. Blog Posts (omarbakri.com)

### Specs
- **Length**: 800-2000 words
- **Format**: Markdown or HTML via CMS
- **SEO**: Target keyword in title, URL, first paragraph, H2s
- **Images**: At least one featured image, inline images for long posts

### Structure
```
# [Title with target keyword]

[Opening paragraph -- hook the reader, state the promise]

## [H2 -- First major section]
[Content with examples, data, or stories]

## [H2 -- Second major section]
[Content]

## [H2 -- Third major section]
[Content]

## Conclusion / What to Do Next
[Summarize key points, clear next action]
```

---

## 7. Newsletter (intelligentrails.news)

### Specs
- **Length**: 500-1200 words
- **Tone**: Conversational, like writing to one smart friend
- **Frequency**: Weekly or bi-weekly
- **Format**: Email-friendly (no complex layouts)

### Positioning
- This is a personal newsletter, not a company newsletter.
- Primary themes: AI, FinTech, business strategy, leadership, commercial judgment.
- It can overlap with payments or financial services, but it should read like Omar's own thinking, not product messaging.
- Avoid direct TheGent marketing unless explicitly requested.

### Structure
```
[Subject line -- curiosity-driven, under 50 chars]

Hey [name],

[Opening -- 1-2 sentences, personal or topical hook]

[Main insight -- the one thing this issue is about]

[Supporting evidence -- data, example, story]

[Practical takeaway -- what the reader can do with this]

[Sign-off with personality]

[P.S. -- secondary CTA, link, or teaser for next issue]
```

### Subject Line Formulas
- "The [adjective] way to [outcome]"
- "[Number] [things] I learned about [topic]"
- "Why [common belief] is wrong"
- "What [notable person/company] taught me about [topic]"
