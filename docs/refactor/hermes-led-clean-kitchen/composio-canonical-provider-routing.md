# Composio Canonical Provider Routing

Composio MCP is canonical for third-party provider automation.

Use Composio for Gmail, Discord, Telegram, Attio, PostHog, social platforms, and other provider workflow automation where supported.

If Composio is unavailable or not visible in the current tooling, block provider automation until the route is verified or repaired.

No provider mutation was performed in Prompt 7B.


## YouTube private provider path

The CallScore YouTube automation publishing path is now canonical in `/opt/crypto-tuber-ranked`.

- Command: `npm run video:mcp-proof -- artifacts/video-jobs/<jobId>/state.json`
- Route: Hermes MCP → Composio MCP
- Wrapper: `src/video/composio/mcp-youtube-publisher.ts`
- Helper: `src/video/composio/private_provider_helper.py`
- Result artifact: `mcp-youtube-publish-result.json`
- Default: private-only unless config explicitly changes.

Do not reintroduce direct Composio HTTP/API-key bridges for YouTube upload.
