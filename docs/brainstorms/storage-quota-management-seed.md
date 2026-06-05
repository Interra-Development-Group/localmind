# Brainstorm seed: Storage quota management UI

**Status:** seed (not yet a requirements doc)

## Problem

The extension stores crawled page snapshots and their embedding vectors in
IndexedDB. Each snapshot averages ~50KB (text + chunks + per-chunk embeddings). A
user with 50 favorites that each follow one-level same-domain link discovery can
easily accumulate hundreds of snapshots over a few weeks.

Today the user has:
- No visibility into how much IndexedDB the extension is using
- No way to see the largest snapshots
- No bulk-clear action surfaced anywhere obvious
- No alert when approaching the browser's per-origin quota (Chrome's quota is
  generous but not infinite, and a "quota exceeded" exception silently fails the
  next write)

The crawler also has no notion of "this snapshot is stale, drop it." Old crawls
accumulate forever.

## Why it matters

- **Operational hygiene.** Users hitting quota silently is a worst-case experience:
  the search stops returning new content, the crawler appears to work but writes
  nothing.
- **Visibility builds trust.** Surfacing "you have 312 snapshots using 18 MB" is a
  small UI investment with outsized trust payoff for a privacy-first product.
- **Enables future features.** Per-favorite quota, "keep latest N", "expire after
  X days" all require this infrastructure.

## Reference points

- [CLAUDE.md "Known Limitations"](../../CLAUDE.md) — flags this under "IndexedDB
  size"
- [src/lib/storage/snapshots.ts](../../src/lib/storage/snapshots.ts) — snapshot
  CRUD layer
- [src/lib/storage/db.ts](../../src/lib/storage/db.ts) — IDB schema
- `navigator.storage.estimate()` — the API for current usage and quota
- The Options page surface is the likely UX home

## Open questions to explore in /ce-brainstorm

- Where does the UI live? Options page, side panel Settings tab, or both?
- Granularity: total bytes only, or per-favorite breakdown? Per-chunk?
- Actions: clear all, clear by favorite, clear by age, clear by embedding-model
  (when models change)?
- Eviction policy: introduce one (LRU? age-based?) or keep it manual?
- Quota-pressure detection: pre-warn at 80% of quota? Hard-fail at 95%?
- Should we offer an export (download as JSON) before clearing, so users don't lose
  their indexed knowledge?

## Next step

Run `/ce-brainstorm` against this seed to produce
`docs/brainstorms/storage-quota-management-requirements.md`.
