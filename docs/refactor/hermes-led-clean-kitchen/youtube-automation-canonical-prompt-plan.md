# CallScore YouTube Automation — Canonical Prompt Plan

Generated: 2026-06-22
Source: operator-uploaded YouTube automation plan.

## Canonical interpretation

This is not a greenfield build. It must be implemented inside the existing CallScore runtime and workplane system:

- Active runtime repo: `/opt/crypto-tuber-ranked`
- Control/workplane repo: `/srv/agents/repos/callscore-workplane`
- Canonical agents: 16 full agents with SOUL, TOOLS, HEARTBEAT, GATES, RECEIPTS, MANIFEST
- Zod remains canonical for runtime state/contracts
- Existing Hermes/Workplane/DB queue rails are preferred over new orchestration layers
- Composio MCP is the canonical YouTube provider route
- No native Google OAuth unless Composio cannot provide required capability after schema discovery
- No manual review gate for the YouTube pipeline
- Mechanical QA gates only
- No public/spend/outreach provider mutation outside this exact YouTube publishing workflow

## Improvements over the raw plan

1. Use existing CallScore DB queue / Hermes worker rails first; add BullMQ only if discovery proves it is already present or materially cleaner.
2. Keep LangGraph spike-only unless the existing Hermes layer is insufficient. Prompt 10 made this canonical.
3. Make `callscore-youtube-newsroom-head` an operational role under the existing full canonical agent system, not a lightweight/lite agent.
4. Treat YouTube publishing as a new owned-public channel lane in the GTM registry.
5. Use deterministic mechanical QA as the automated publish gate.
6. Keep YouTube public publishing allowed by config, not human approval.
7. Add redaction/secret-shape scan before any commit.
8. Do not commit generated video artifacts except tiny test fixtures.
9. Store production job artifacts under ignored runtime artifact paths.
10. Add analytics ingestion as non-blocking follow-up stage.

---

# Prompt 0 — YouTube Automation Control Law

You are operating inside the canonical CallScore clean-kitchen system.

Your task is to build the CallScore YouTube automation engine without breaking runtime, agents, DB, provider routes, or existing marketing automation.

Canonical constraints:

- Runtime repo: `/opt/crypto-tuber-ranked`
- Workplane repo: `/srv/agents/repos/callscore-workplane`
- Ledger path inside runtime repo: `docs/youtube-automation/IMPLEMENTATION_LEDGER.md`
- Zod is canonical for state, schema validation, LLM output validation, job transitions, and persisted JSON state.
- Existing Hermes/Workplane/DB queue rails are preferred. BullMQ is allowed only if discovery proves it is present or materially cleaner.
- LangGraph is spike-only unless discovery proves the existing Hermes workflow layer is insufficient. Do not create a second control plane.
- Composio MCP is the canonical YouTube API route.
- Do not implement native Google OAuth unless Composio lacks a required capability after schema discovery.
- No HeyGen, Synthesia, ElevenLabs, D-ID, Runway, Pika, InVideo, Creatomate, Shotstack, paid avatar APIs, stock-footage systems, or manual editing.
- No manual approval gate for YouTube publishing.
- Use mechanical gates only: valid data, valid script schema, supported claims, valid audio, valid captions, valid video, valid thumbnail, valid metadata, valid Composio response.
- If `VIDEO_AUTO_PUBLISH=true`, publish or schedule automatically according to config.
- Do not print or commit secrets.
- Do not commit generated video artifacts except test fixtures.
- Write receipts for every phase.
- Update the implementation ledger continuously.

Stop conditions:

- secret exposure risk
- destructive DB or migration action not required by the task
- production deploy attempt
- provider mutation outside YouTube upload/update/thumbnail flow
- missing Composio YouTube connection after discovery
- media QA failure after one automated repair attempt

Deliverables:

- `docs/youtube-automation/IMPLEMENTATION_LEDGER.md`
- prompt-specific receipt in the workplane receipt root
- updated master/workplane state if needed

---

# Prompt 1 — Short Runtime Discovery and Ledger Init

Execute a short discovery pass only. Do not over-plan.

Discover:

- package manager and scripts
- TypeScript config and module conventions
- existing Zod schemas and autonomy contracts
- DB access helpers
- existing queue / scheduler / worker rails
- Redis/BullMQ presence or absence
- Composio MCP configuration and existing provider rules
- artifact/output conventions
- test/typecheck/lint commands
- existing marketing/GTM registry entrypoints
- existing git state

Create:

- `docs/youtube-automation/IMPLEMENTATION_LEDGER.md`
- `docs/youtube-automation/discovery.json`

Decision rules:

- Use existing Hermes/DB queue rails unless discovery proves BullMQ is already present or cleaner.
- Use existing full canonical agents. Do not create lite agents.
- Add a YouTube newsroom lane to the GTM/channel registry only if the registry pattern is clear.

Acceptance:

- discovery completed
- ledger created
- no code implementation blocked on broad research

---

# Prompt 2 — Canonical Video Domain Skeleton and Zod State Model

Implement the video automation domain under existing repo conventions.

Suggested root, adapt if necessary:

`src/video/`

Create Zod schemas for:

- `CallDirection`
- `CallOutcome`
- `CallRecord`
- `CreatorScore`
- `VideoFormat`
- `ScenePlan`
- `ScriptPackage`
- `YoutubeMetadata`
- `VideoJobStatus`
- `VideoJobState`
- `ComposioPublishResult`
- `QaReport`

Rules:

- persisted state is JSON-compatible
- dates are ISO strings
- no Date objects in persisted state
- no Map/Set/classes/functions in persisted state
- no transforms in LLM-facing schemas
- every LLM/tool output is parsed by Zod before use
- every state transition is parsed by Zod before write

Implement:

- `src/video/schemas/video.schemas.ts`
- `src/video/schemas/youtube.schemas.ts`
- tests for schemas

Acceptance:

- `VideoJobState` supports all required statuses
- tests pass
- ledger updated

---

# Prompt 3 — Artifact Paths and State Store

Implement deterministic artifact handling.

Artifact root:

`artifacts/video-jobs/{jobId}/`

Required artifacts:

- `state.json`
- `input-data.json`
- `candidate-ranking.json`
- `planner-output.json`
- `script.md`
- `scenes.json`
- `audio.raw.wav`
- `audio.normalized.wav`
- `captions.json`
- `captions.srt`
- `video.mp4`
- `thumbnail.png`
- `thumbnail.jpg`
- `qa-report.json`
- `composio-upload-response.json`
- `publish-result.json`

Implement:

- `src/video/artifacts/artifact-paths.ts`
- `src/video/artifacts/state-store.ts`

Rules:

- never overwrite artifacts unless `--force`
- all writes go through Zod-validated state
- generated artifacts must be git-ignored unless test fixtures

Acceptance:

- deterministic job directory creation
- overwrite protection tested
- state transition tested

---

# Prompt 4 — Real CallScore Candidate Loader and Ranking

Build deterministic candidate loading from the existing CallScore DB/API.

Implement:

- `src/video/data/load-callscore-video-candidates.ts`
- `src/video/data/rank-video-candidates.ts`
- `src/video/data/mock-video-candidates.ts` for tests only

Candidate score:

`abs(scoreDelta) * 0.25 + resolvedCallsWeight * 0.20 + rankMovementWeight * 0.15 + recencyWeight * 0.15 + dataCompletenessWeight * 0.15 + creatorRecognitionWeight * 0.10`

Rules:

- LLM must never choose topics from nothing.
- Load real candidates first.
- If creator data is insufficient, fall back to `leaderboard_update`.
- Persist `input-data.json` and `candidate-ranking.json`.

Acceptance:

- real loader works read-only
- deterministic ranking tested
- fallback tested

---

# Prompt 5 — Automated Planner, Script, Scene Plan, Metadata, and Claim Validation

Implement planning using the existing Hermes workflow layer unless a small isolated graph is truly necessary.

Planning stages:

- loadData
- rankCandidates
- selectFormat
- selectSubject
- generateScript
- generateScenePlan
- generateMetadata
- validateClaims
- finalizePlan

Implement:

- `src/video/planning/video-planner.graph.ts` or existing Hermes workflow equivalent
- prompt files for daily short, investigation, leaderboard update, creator breakdown, scene plan, metadata
- `validate-script.ts`
- `validate-claims.ts`

Rules:

- no manual review
- schema repair once
- claim repair once
- if twice failed: mark failed and fallback to next candidate/format
- allowed language: tracked, recorded, scored, according to CallScore data, available record shows
- banned language: scam, fraud, liar, criminal, guaranteed, buy, sell, financial advice

Acceptance:

- ScriptPackage validates
- ScenePlan validates
- YoutubeMetadata validates
- unsupported numeric claims blocked
- planner writes planner-output/script/scenes

---

# Prompt 6 — Kokoro TTS, Audio Normalization, Captions, and SRT

Implement TTS and captions.

Primary TTS:

- `kokoro-js`
- model: `onnx-community/Kokoro-82M-v1.0-ONNX`
- dtype: `q8`
- voice: `af_heart`
- device: cpu where possible, wasm fallback

Fallback:

- Python Kokoro behind the same TypeScript interface only if JS path fails in HHVM
- document exact reason in ledger

Implement:

- `src/video/tts/kokoro.ts`
- `src/video/tts/normalize-audio.ts`
- `src/video/captions/generate-captions.ts`
- `src/video/captions/write-srt.ts`

Rules:

- output `audio.raw.wav`
- output `audio.normalized.wav`
- normalize with FFmpeg
- captions timed from script/scene durations
- max two lines when possible
- readable mobile captions

Acceptance:

- WAV exists and has audio stream
- SRT and captions JSON exist
- caption generation tested

---

# Prompt 7 — Remotion Compositions and Rendering

Implement Remotion rendering with CallScore product-led visuals.

Register compositions:

- `CallScoreShortVertical`
- `CallScoreInvestigationHorizontal`
- `CallScoreLeaderboardVertical`
- `CallScoreCreatorBreakdownVertical`

Implement components:

- BrandFrame
- CreatorCard
- ScoreBadge
- ScoreDelta
- Leaderboard
- CallTimeline
- MethodologyCard
- VerdictCard
- Captions
- CTA

Rules:

- use `bundle()`
- use `selectComposition()`
- pass same `inputProps` into selectComposition and renderMedia
- pass selected composition object into renderMedia
- render h264 MP4
- include audio and captions
- include CallScore branding and CTA
- no fake creator images
- no stock footage dependency
- no avatar

Acceptance:

- each format renders a valid MP4
- dimensions match the format
- video includes audio, captions, product branding, score/leaderboard data, CTA

---

# Prompt 8 — Deterministic Thumbnail Generation

Implement deterministic thumbnails with SVG + Sharp or existing image tooling.

Generate:

- `thumbnail.png`
- `thumbnail.jpg`

Rules:

- no AI image generation v1
- longform thumbnail: 1280x720
- short cover: 1080x1920
- include creator/topic, score/stat/movement, CallScore brand

Acceptance:

- thumbnail validates dimensions
- thumbnail file exists
- thumbnail QA passes

---

# Prompt 9 — Composio YouTube Discovery and Publisher Interface

Use Composio MCP as canonical YouTube API route.

Discover exact tool schemas before coding argument names.

Expected tools to inspect:

- YOUTUBE_UPLOAD_VIDEO
- YOUTUBE_MULTIPART_UPLOAD_VIDEO
- YOUTUBE_UPDATE_THUMBNAIL
- YOUTUBE_UPDATE_VIDEO
- YOUTUBE_LIST_CHANNELS
- YOUTUBE_GET_VIDEO_DETAILS_BATCH
- YOUTUBE_LIST_CHANNEL_VIDEOS
- YOUTUBE_GET_CHANNEL_STATISTICS

Implement:

- `src/video/composio/discover-youtube-tools.ts`
- `src/video/composio/composio-client.ts`
- `src/video/composio/youtube-publisher.ts`

Publisher interface:

```ts
export interface VideoPublisher {
  publishVideo(input: {
    jobId: string;
    videoPath: string;
    thumbnailPath: string;
    metadata: YoutubeMetadata;
    privacyStatus: "private" | "unlisted" | "public";
    publishAt?: string;
  }): Promise<{
    youtubeVideoId: string;
    publishUrl?: string;
    rawResponse: unknown;
  }>;
}
```

Rules:

- direct Composio execution for production calls
- use multipart if standard upload cannot handle file
- update metadata
- set thumbnail
- persist raw response, YouTube ID, publish URL
- native Google APIs only behind same interface and only if Composio lacks required capability

Acceptance:

- tool schemas captured in ledger
- mocked publisher tests pass
- real Composio dry validation can list channel/tool availability without uploading

---

# Prompt 10 — Publishing Config and Mechanical QA

Implement automatic publish behavior and deterministic QA.

Env config:

- `VIDEO_AUTOMATION_ENABLED`
- `VIDEO_AUTO_PUBLISH`
- `VIDEO_YOUTUBE_PRIVACY`
- `VIDEO_PUBLISH_MODE`
- `VIDEO_SCHEDULE_TIME_LOCAL`
- `VIDEO_TIMEZONE`
- `VIDEO_ARTIFACTS_DIR`
- Kokoro envs
- render envs
- Composio env names only, no secrets

Implement QA:

- state validates
- video exists
- video has audio stream
- dimensions match format
- duration valid
- thumbnail exists and dimensions valid
- metadata validates
- script has no unsupported numeric claims
- Composio config exists

Rules:

- if QA passes and `VIDEO_AUTO_PUBLISH=true`, publish/schedule automatically
- if `VIDEO_YOUTUBE_PRIVACY=public`, public publish is allowed by config
- if scheduled time has passed, schedule next valid slot
- no manual approval gate
- if QA fails, mark failed and recover once if obvious

Acceptance:

- QA report generated
- publish config tested
- public/private/scheduled logic tested

---

# Prompt 11 — Queue Workers and Scheduler

Use existing CallScore queue/scheduler rails unless BullMQ is clearly present or cleaner.

Stages:

- video-plan
- video-audio
- video-captions
- video-render
- video-thumbnail
- video-qa
- video-publish
- video-analytics

Every worker must:

- load state
- parse with Zod
- check prior artifact
- execute one stage
- write artifacts
- update state
- enqueue next stage
- fail clearly with saved error

Schedule:

- Daily Short: every day
- Weekly Investigation: weekly
- Leaderboard Update: weekly
- Creator Breakdown: on demand from marketing agents

Acceptance:

- worker mode processes plan to analytics
- scheduler enqueues according to env config
- no manual gate added

---

# Prompt 12 — CLI Commands and Env Example

Add package scripts:

```json
{
  "video:discover": "tsx src/video/cli/video-discover-composio.ts",
  "video:daily": "tsx src/video/cli/video-daily.ts",
  "video:publish": "tsx src/video/cli/video-publish.ts",
  "video:worker": "tsx src/video/cli/video-worker.ts",
  "video:backfill": "tsx src/video/cli/video-backfill.ts"
}
```

Implement:

- `video-discover-composio.ts`
- `video-daily.ts`
- `video-publish.ts`
- `video-worker.ts`
- `video-backfill.ts`

Update env example with names only. Do not commit secrets.

Acceptance:

- commands run
- help output available
- ledger lists command usage

---

# Prompt 13 — Analytics Ingestion and Topic Feedback

Implement non-blocking analytics ingestion via Composio YouTube where available.

Collect if available:

- video ID
- title
- publish status
- view count
- like count
- comment count
- channel stats
- video details

Persist using existing CallScore storage pattern.

Rules:

- analytics must not block publishing
- failed analytics marks warning, not publish failure
- use analytics later to improve candidate scoring

Acceptance:

- analytics stage writes artifact/state
- mocked Composio analytics test passes

---

# Prompt 14 — Tests, Typecheck, Lint, and Secret Scan

Add practical tests for:

- Zod schemas
- candidate ranking
- script claim validator
- caption generation
- artifact paths
- metadata validation
- QA parser
- publisher interface with mocked Composio response
- publishing config logic
- worker transition logic

Run repo-equivalent:

- `npm run typecheck`
- `npm run test`
- `npm run lint`

If commands differ, use discovered repo scripts.

Run secret-shape scan before commit.

Acceptance:

- all relevant tests pass or pre-existing failures are documented precisely
- no key/DB-URL-shaped values staged
- ledger updated

---

# Prompt 15 — Full Local Automated Pipeline Run

Run:

`npm run video:daily`

Expected artifacts:

- state.json
- input-data.json
- candidate-ranking.json
- planner-output.json
- script.md
- scenes.json
- audio.raw.wav
- audio.normalized.wav
- captions.json
- captions.srt
- video.mp4
- thumbnail.jpg
- qa-report.json
- publish-result.json if publishing enabled

Rules:

- if `VIDEO_AUTO_PUBLISH=false`, stop after QA and record not-published-by-config
- if `VIDEO_AUTO_PUBLISH=true`, publish/schedule automatically according to config
- no manual approval prompt

Acceptance:

- local pipeline completes
- generated MP4 is valid
- QA passes
- state is reproducible from artifacts

---

# Prompt 16 — Production Composio YouTube Publish Validation

Use the real Composio YouTube connection.

Preflight:

- discover YouTube tools again
- verify YouTube channel connection
- validate metadata and video/thumbnail paths
- verify publishing config

If `VIDEO_AUTO_PUBLISH=true`, publish/schedule automatically.

Rules:

- do not ask for manual approval
- do not publish if config mechanically forbids it
- do not native Google OAuth unless Composio capability missing after discovery
- persist raw Composio responses

Acceptance:

- YouTube video ID persisted if published/scheduled
- publish URL/status persisted
- thumbnail update confirmed or warning recorded if API limitation
- upload tool and thumbnail tool names recorded

---

# Prompt 17 — Final Completion Report and Commit

Produce final completion report.

Report:

- files created
- files modified
- package scripts added
- env vars added
- Composio YouTube tools discovered
- exact upload tool used
- exact thumbnail tool used
- public/scheduled/private publish result
- YouTube video ID if published
- artifact directory
- test/typecheck/lint results
- known limitations
- next revenue-focused improvements

Commit:

- code
- tests
- docs
- implementation ledger

Do not commit:

- secrets
- generated production media artifacts
- raw Composio secrets
- env files

Acceptance:

- runtime repo clean or intentionally dirty with receipt
- workplane receipt written
- final report exists
- system meets acceptance criteria or precise blockers recorded


---

## 2026-06-23 Addendum — MCP-only private provider path promoted

Canonical runtime promotion completed in `/opt/crypto-tuber-ranked`.

- Runtime commit: `bbb0aa4` — `Promote MCP-only private provider path`
- Workplane receipt commit: `2234997` — `Record MCP-only private provider promotion`
- Canonical command: `npm run video:mcp-proof -- artifacts/video-jobs/<jobId>/state.json`
- TypeScript wrapper: `src/video/composio/mcp-youtube-publisher.ts`
- MCP helper: `src/video/composio/private_provider_helper.py`
- Config selector: `VIDEO_PUBLISH_PROVIDER=hermes_mcp_composio`
- Safety default: `VIDEO_PRIVATE_CANARY_ONLY=true`
- Proof artifact: `/opt/crypto-tuber-ranked/artifacts/video-jobs/daily_short-2026-06-23T09-04-49-194Z/mcp-youtube-publish-result.json`

Future agents must use the Hermes MCP → Composio MCP path and must not recreate direct Composio HTTP/API-key bridges.
