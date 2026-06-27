# CallScore OKF Snapshot Manifest

Generated: 2026-06-27T13:02:00Z
Snapshot directory: `/srv/agents/repos/callscore-workplane/infra/hermes-profile-snapshots/callscore-okf-20260627/`

## Required outputs

- `okf-rewrite-map.md`
- `okf-rewrite-pilot/`
- `codebase-memory-refresh-receipt.md`
- `snapshot-manifest.md`

## Pilot source paths

| Pilot | Original safe source path | Reason selected |
|---|---|---|
| Product system index | `/opt/crypto-tuber-ranked/docs/system-index/system-map.md` | Architecture/system map; no secrets/provider payloads |
| Workplane system map | `/srv/agents/repos/callscore-workplane/docs/architecture/system-map.md` | Architecture map; no runtime state |
| Workplane loop contract | `/srv/agents/repos/callscore-workplane/docs/contracts/workplane-loop-engineering-eval.md` | Operating contract; no auth/state artifacts |

## Pilot output paths

- `/srv/agents/repos/callscore-workplane/infra/hermes-profile-snapshots/callscore-okf-20260627/okf-rewrite-pilot/product-system-index-okf/`
- `/srv/agents/repos/callscore-workplane/infra/hermes-profile-snapshots/callscore-okf-20260627/okf-rewrite-pilot/workplane-system-map-okf/`
- `/srv/agents/repos/callscore-workplane/infra/hermes-profile-snapshots/callscore-okf-20260627/okf-rewrite-pilot/workplane-loop-contract-okf/`

## Excluded classes

- Secrets: `.env`, `.env.*`, auth files, token/cookie/API-key files, connection strings.
- Runtime/state: state DBs, SQLite DBs, graph DB files, sessions, checkpoints, caches, logs.
- Sensitive operations: raw provider payloads, raw publication receipts, DMs, emails, customer/payment/Whop payloads.
- Heavy/generated trees: `node_modules/`, `.git/`, `.next/`, `.netlify/`, `.tmp/`, media/build artifacts.
- Protected stores: `protected/`, `receipts/`, `provider-accounts/`, `secrets/`.

## Codebase-memory scope

- Used existing full app map and codebase-memory ledger state.
- Did not remap/reindex the app for this rewrite step.
- `detect_changes` on active indexed product/control-plane projects reported zero changed files before writing this snapshot.

## File manifest and checksums

```
182274a20a9947ca9ec50655f5d588eda369958d3f9160de5ef90639ffc5d57c  codebase-memory-refresh-receipt.md  2131 bytes
e68d860dc490a14aaca4efa034ce92a04520ed8a54730001a94a03eb45291ad4  okf-rewrite-map.md  7943 bytes
b00d23f55e8115946775dce2042ca9d916400de521b671446ea9f93412d2d933  okf-rewrite-pilot/product-system-index-okf/index.md  245 bytes
46a20507226a8b633617c736d4db67b21ba34f2847baf99708e55962a953d02a  okf-rewrite-pilot/product-system-index-okf/log.md  143 bytes
ed8d003c80b47acf86f53a1a0e621110bc794e9035a4fd9bbc515df8ac939bfe  okf-rewrite-pilot/product-system-index-okf/.okf-conversion-report.json  458 bytes
2555e8e38d8bba833ef5d3f4bb507f287aad0cd1a53c083851140a25635c8b08  okf-rewrite-pilot/product-system-index-okf/system-map.md  3236 bytes
1cbea8f837309b5f52ad818f5595b97d615348d5a4248631d3d8b628d906c832  okf-rewrite-pilot/workplane-loop-contract-okf/index.md  266 bytes
cdf222b2644970c19cf399f516b78df8a2e5f2d45c72227d3988f72152adae63  okf-rewrite-pilot/workplane-loop-contract-okf/log.md  146 bytes
426336fc212b2efe3828069c6b2e4ee3ef056ae15deffaba2b9495b260d22325  okf-rewrite-pilot/workplane-loop-contract-okf/.okf-conversion-report.json  569 bytes
04b757916c6ab06a878a1adad129999bebfd2e74ea8b45dfde9568656ca6973b  okf-rewrite-pilot/workplane-loop-contract-okf/workplane-loop-engineering-eval.md  966 bytes
d53750b136bbf17d80fb4f2a77b3db9f92f79b84bc6303cdba847f1f9bb3a2da  okf-rewrite-pilot/workplane-system-map-okf/index.md  249 bytes
a7e369fd6a6a4b2a4698b26f2cd9687754548a8630d5fc448910617078e99fa7  okf-rewrite-pilot/workplane-system-map-okf/log.md  143 bytes
1d1bba4b4025600955e4b9f95290b88a946033464abe3669901c8e0850cf84c7  okf-rewrite-pilot/workplane-system-map-okf/.okf-conversion-report.json  437 bytes
1cac08031b925b27157dca8d505a2163e86bc0699166535403434a9656e1772d  okf-rewrite-pilot/workplane-system-map-okf/system-map.md  974 bytes
b6b499fe7ef91f395f97c7cb99a2096fe6ba44739cfb6acf6fb21ec5be042d03  snapshot-manifest.md  3974 bytes
```

## Validation commands

```bash
python3 /srv/agents/hermes/profiles/callscore/skills/markdown-to-okf/scripts/okf_convert.py validate --bundle <pilot-bundle>
grep -R forbidden-path-patterns infra/hermes-profile-snapshots/callscore-okf-20260627
git status --short
```

## Validation results

Fresh validation run: 2026-06-27T13:47:39Z

- `markdown-to-okf validate` on `product-system-index-okf`: PASS, 1 concept, 0 errors, 0 warnings.
- `markdown-to-okf validate` on `workplane-system-map-okf`: PASS, 1 concept, 0 errors, 0 warnings.
- `markdown-to-okf validate` on `workplane-loop-contract-okf`: PASS, 1 concept, 0 errors, 0 warnings.
- Required output existence check: PASS.
- Forbidden output path class check: PASS.
- Credential-shaped content scan: PASS.
- `git diff --check`: PASS.

Final manifest SHA256 is computed during commit validation, not embedded here to avoid self-hash recursion.
