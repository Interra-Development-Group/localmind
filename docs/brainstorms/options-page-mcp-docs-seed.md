# Brainstorm seed: In-app MCP configuration documentation

**Status:** seed (not yet a requirements doc)

## Problem

The Options page surfaces the MCP server registry (add/remove server URLs), but
provides no on-page guidance about:

- What MCP is and why you'd want to configure a server
- How to run a local MCP server with SSE transport (the only one currently
  supported)
- How to confirm the server is reachable from the extension
- What "tool calling" looks like once a server is connected
- Where to find compatible servers

Users who already know MCP can configure it fine. Users who are MCP-curious but new
to it bounce off — they don't even know what URL they should enter.

Notes from prior conversations have flagged this gap repeatedly ("how does MCP tool
calling work, how do you configure it"). The CONTRIBUTING.md "Docs we'd love help
with" section also calls this out.

## Why it matters

- **Activation funnel.** MCP tool calling is one of the four product pillars in
  STRATEGY.md, but it has the highest setup friction. In-app docs lower the bar.
- **Differentiator.** Most browser AI assistants don't have any MCP integration.
  Making this discoverable and learnable is a competitive advantage.
- **Maintenance.** Better in-app docs reduce GitHub-issue support volume.

## Reference points

- [CLAUDE.md "MCP Integration"](../../CLAUDE.md) — current implementation reference
- [src/lib/mcp/registry.ts](../../src/lib/mcp/registry.ts) — server registry
- The Options page UI: `src/options/` (or wherever the Plasmo options entry lives)
- `notes.md` (now gitignored) — original observation: "how does mcp tool calling
  work, how do you configure it"
- Related: see [native-messaging-host-seed.md](native-messaging-host-seed.md) —
  expanding transport support changes the docs story too

## Open questions to explore in /ce-brainstorm

- What's the minimum viable doc surface — a help drawer, a dedicated section, a
  full walkthrough?
- Should we ship example MCP server configurations users can one-click try
  (filesystem, fetch, etc.)?
- How does connection status surface (existing StatusBar component vs new UI)?
- Should the Options page test a server URL when added (call `/tools` and show the
  discovered tools) before saving?
- Is there value in an in-app "what's MCP?" explainer, or does that belong on the
  GitHub Pages site?
- Same applies to documenting the per-extension-ID `OLLAMA_ORIGINS` command —
  could ship a one-click copy button for the user's actual extension ID. Worth
  scoping in the same brainstorm or a separate one.

## Next step

Run `/ce-brainstorm` against this seed to produce
`docs/brainstorms/options-page-mcp-docs-requirements.md`.
