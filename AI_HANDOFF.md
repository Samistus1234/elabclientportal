# AI Handoff — ELAB Client Portal

This is the shared handoff for Codex, Claude Code, ChatGPT, Grok and other assistants with repository access.

## Current handoff
- **Last update (UTC):** 2026-11-13 01:35 UTC
- **Assistant:** Claude Code (Claude Opus 5.5)
- **Goal:** Owner asked for the signed-in client portal to follow the Apple style used elsewhere (mockup approved first).
- **Branch / PR:** `feat/portal-apple-redesign` (from `origin/main` 566e0fa); PR opened for review. **Not merged, not deployed.**
- **Files changed:** `src/portal-v2.css` (Apple tokens + new classes), `src/components/portal/PortalLayout.tsx` (wide wordmark `public/elab-logo-blue.png`, five tabs — Updates removed from nav), `src/components/portal/ElabUpdates.tsx` + `elab-updates.css` (strip hidden on Home when empty), `src/lib/portalData.ts` (`displayName`, `finishedLabel`, `dedupeUpdates`), `src/pages/portal/{Home,ApplicationView,Applications,DocumentsPage,Payments,AccountSettings,Help}.tsx`.
- **Bugs fixed:** finished applications showed the step they stopped on (now Completed/Closed/Cancelled; cancelled no longer shows every step ticked); Home feed repeated back-and-forth stage moves; History empty on most applications (now merges documents + start date, collapses move bursts < 24h); names stored in capitals shown as typed.
- **Removed:** the AI "Case summary" card from the application page (component file kept).
- **Checks:** `tsc --noEmit` clean, `vite build` OK, helper checks (scratch script) pass; owner's own account viewed on localhost at 1280px and 375px: Home, Applications, three application pages, Documents, Payments, Help. No lint config exists in this repo.
- **Not done:** public homepage and sign-in page still old style (separate pass); dark mode not looked at in a browser; Vercel branch previews are off, so no preview URL.
- **Next action:** owner reviews/merges the PR; merging to `main` deploys via Vercel git integration.

## Updating this file
Record the UTC timestamp, assistant/tool, goal, branch/commit/PR, exact files changed, completed work, checks run and results, known issues, unfinished work, and next actionable step.

Do not save credentials, customer/patient information, raw chats or sensitive logs. Inspect Git state and code before trusting another assistant's status. Commit updates on a working branch/PR when authorized; otherwise supply a copyable summary and explicitly state it was not saved.
