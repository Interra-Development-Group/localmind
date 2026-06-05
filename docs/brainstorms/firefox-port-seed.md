# Brainstorm seed: Firefox port

**Status:** seed (not yet a requirements doc)

## Problem

Ollama Sidekick is Chrome-only today. Plasmo's MV3 output is partially
Firefox-compatible — Firefox supports MV3 with caveats — but the side panel API the
extension's entire UI is built around is Chrome-specific. Firefox's analogous
concept is the sidebar action, which has a different API shape and lifecycle.

A meaningful subset of the privacy-conscious target audience uses Firefox.
Restricting the product to Chrome leaves that user base unserved.

## Why it matters

- **Target user alignment.** Privacy-conscious users skew toward Firefox at higher
  rates than the general population.
- **Distribution channel diversification.** addons.mozilla.org submission flow is
  separate from Chrome Web Store; not depending on a single store is healthy.
- **Tests the architecture.** Forcing Firefox compatibility surfaces hidden Chrome
  assumptions in the codebase — a good architectural pressure test even if we don't
  ship Firefox immediately.

## Reference points

- [CLAUDE.md](../../CLAUDE.md) — architecture; flags Chrome-specific APIs
  throughout (sidePanel, chrome.alarms, chrome.storage, native messaging
  registration)
- Plasmo's [target documentation](https://docs.plasmo.com/) — multi-browser build
  config
- Mozilla's [sidebar action API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)
- Mozilla's MV3 status: https://blog.mozilla.org/addons/2023/05/16/manifest-v3-signing-available-november-21-on-firefox-nightly/

## Open questions to explore in /ce-brainstorm

- Is this a port (separate build target, separate listing) or a unification (same
  codebase, conditional API access via a thin compatibility layer)?
- Which Chrome APIs we depend on have direct Firefox equivalents and which don't?
  Specifically: `chrome.sidePanel`, `chrome.alarms`, `chrome.storage.session`,
  `chrome.scripting`, content script `<all_urls>` permission UX.
- How much of the side panel UI needs to be re-laid-out for Firefox's sidebar
  paradigm (which is narrower and lifecycled differently)?
- Service worker behavior differs between Chrome and Firefox. Does our port-based
  streaming approach work as-is on Firefox?
- IndexedDB and `chrome.storage.local` quota behave differently across browsers —
  any data we'd lose or migrate on a cross-browser user's flow?
- Does Firefox's review process accept the same `<all_urls>` content-script
  justification?

## Next step

Run `/ce-brainstorm` against this seed to produce
`docs/brainstorms/firefox-port-requirements.md`.
