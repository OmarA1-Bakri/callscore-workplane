# ytdlp Provider Conflict Resolution

Immediate fix completed: `whop-auto-ytdlp-pot-provider-1` was removed. `crypto-tuber-ranked-ytdlp-pot-provider-1` remains running and healthy and serves `127.0.0.1:4416/ping`.

This did not edit `/opt/crypto-tuber-ranked/docker-compose.yml`; therefore it is not permanent architecture repair.

Follow-up architecture options:

1. Split compose project services so only one project owns `ytdlp-pot-provider`.
2. Add a `whop-auto` override that excludes `ytdlp-pot-provider`.
3. Ensure only the `crypto-tuber-ranked` project owns the singleton port-4416 provider.

Do not implement this compose edit without separate approval.
