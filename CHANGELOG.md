# Changelog

All notable changes to the Vex Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security
- **The realtime feed now carries a credential, and it is scoped to one
  workspace.** `useAgentGuardUpdates` opened `new WebSocket(WS_URL)` with
  nothing attached, and `dashboard-api` accepted it and streamed every
  organisation's execution metadata down it — `org_id`, `agent_id`,
  `session_id`, execution ids, latency, token counts, cost estimates, trace S3
  keys. The `agent_id` comparison in the hook was a cosmetic browser-side
  filter, never a control. The endpoint is public at `ws.tryvex.dev`.

  The hook now fetches a short-lived org-scoped token from the new
  `GET /api/agentguard/ws-token/[account]` before connecting, and offers it as
  a `Sec-WebSocket-Protocol` value — a request header, so unlike a query string
  it stays out of proxy access logs, `Referer` and browser history, while still
  being settable from browser JavaScript. The long-lived `X-Vex-Key` is not
  used and never reaches the browser; `lib/agentguard/ws-token.ts` documents
  why it could not be, even in principle.

  That route is the entire authorisation story for the feed: the engine can
  only check that a token is well-signed and unexpired, so `resolveOrgId`'s
  membership assertion is what decides who reads which org. Every refusal is
  the same 404, so the route cannot be used to enumerate workspace slugs.

  Requires `AGENTGUARD_WS_TOKEN_SECRET`, matching `dashboard-api`'s
  `DASHBOARD_WS_TOKEN_SECRET`. Without it the route answers 503 and the
  dashboard falls back to server-rendered data with no live updates.
  `useAgentGuardUpdates` now takes a required `accountSlug`.

### Added
- PostHog analytics integration
- Google Analytics on landing page
- Blog: "How We Detect AI Agent Drift"
- Markdown rendering in session timeline
- GitHub star widget with dark mode
- Pre-commit hooks with detect-secrets
- Stripe billing configuration with real price IDs

### Changed
- Rebrand from AgentGuard/Dashboard to Vex
- Fix licensing claims to reflect dual-license (Apache 2.0 SDKs + AGPLv3 engine)
- Update all GitHub links to Vex-AI-Dev org

### Fixed
- MakerKit license check bypass for public repo development
