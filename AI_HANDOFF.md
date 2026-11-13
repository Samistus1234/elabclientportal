# AI Handoff — ELAB Client Portal

This is the shared handoff for Codex, Claude Code, ChatGPT, Grok and other assistants with repository access.

## Current handoff
- **Last update (UTC):** 2026-11-13 02:30 UTC
- **Assistant:** Claude Code (Claude Opus 5.5)
- **Goal:** Owner noticed `/tools` (free tools) was not redesigned with the rest of the portal (#40, #41 merged and live).
- **Branch / PR:** `feat/portal-tools-apple` from `origin/main` 8c1bc60; PR opened. **Not merged, not deployed.**
- **Files changed:** new `src/tools-v2.css` (palette + mapping of the tool pages' old gradient/shadow/primary Tailwind classes, inputs allowed to shrink); `src/components/tools/ToolsLayout.tsx` (new header with breadcrumb, centred title, white panel; exports `ToolsHeader`); `ToolCard.tsx`, `DownloadButton.tsx`, `src/pages/tools/ToolsHome.tsx` rewritten. The 11 tool pages themselves are unchanged (styled through the CSS).
- **Checks:** `tsc` clean, `vite build` OK; hub + merge/compress/password/QR viewed at ~800px; all 11 tool routes measured at 375px, no sideways scroll (QR page was 436px wide before the fix). Not tested: the screens after a file is added (would need test files).
- **Next action:** owner merges; merging to `main` deploys via Vercel.

## Previous handoff (2026-11-13 01:35 UTC)
- Signed-in pages redesign + four data-display fixes: PR #40, merged 812520f and live.

## Updating this file
Record the UTC timestamp, assistant/tool, goal, branch/commit/PR, exact files changed, completed work, checks run and results, known issues, unfinished work, and next actionable step.

Do not save credentials, customer/patient information, raw chats or sensitive logs. Inspect Git state and code before trusting another assistant's status. Commit updates on a working branch/PR when authorized; otherwise supply a copyable summary and explicitly state it was not saved.
