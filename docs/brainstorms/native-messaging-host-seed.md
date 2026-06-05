# Brainstorm seed: Native messaging host for stdio MCP support

**Status:** seed (not yet a requirements doc)

## Problem

Browser extensions cannot spawn child processes, so they cannot use the standard
stdio transport that most MCP servers ship with. Today the extension only supports
MCP servers that expose an HTTP/SSE transport on `localhost`. This leaves a large
swath of the existing MCP ecosystem (anything that runs as a stdio CLI tool — the
default for most reference servers) unreachable.

A [native messaging host](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
is a small local executable the browser can launch and communicate with over stdio.
The extension could ship (or guide the user to install) a native host that acts as a
stdio ↔ SSE bridge: the host spawns the MCP server as a child, the extension talks
to the host over Chrome's native messaging channel, and the host relays MCP messages
on stdio.

## Why it matters

- **Vastly expanded MCP server compatibility.** The vast majority of community MCP
  servers default to stdio.
- **Aligned with project identity.** Still fully local; the native host is a process
  on the user's machine.
- **Removes a frequent FAQ.** Users routinely try to wire up a stdio MCP server and
  hit a wall.

## Reference points

- [CLAUDE.md "Known Limitations"](../../CLAUDE.md) — flags this gap explicitly under
  "No stdio MCP transport"
- [src/lib/mcp/](../../src/lib/mcp/) — current MCP client (HTTP/SSE only)
- Chrome Native Messaging docs: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

## Open questions to explore in /ce-brainstorm

- Distribution: do we ship the native host as a separate downloadable, or document
  user-side installation steps? What's the install UX on macOS / Linux / Windows?
- Process lifecycle: who launches the MCP server child — the host on demand per
  call, or persistently on extension startup?
- Security model: how do we let users vet which stdio binaries the host is allowed
  to spawn?
- Cross-platform: native messaging registration differs per OS (manifest JSON in
  specific directories). What's the install/uninstall story?
- Fallback: does the extension continue to support HTTP/SSE transport in parallel,
  or does the native host become the unified transport?
- Does this break the Chrome Web Store distribution model (does Web Store allow
  extensions to require a native messaging host)?

## Next step

Run `/ce-brainstorm` against this seed to produce
`docs/brainstorms/native-messaging-host-requirements.md`.
