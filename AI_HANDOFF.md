# AI Handoff — ELAB Client Portal

This is the shared handoff for Codex, Claude Code, ChatGPT, Grok and other assistants with repository access.

## Current handoff
- **Last update (UTC):** 2026-11-13 02:05 UTC
- **Assistant:** Claude Code (Claude Opus 5.5)
- **Goal:** Owner asked for the public homepage and sign-in page in the same Apple style as the signed-in pages (PR #40, merged and live). Mockup approved first.
- **Branch / PR:** `feat/portal-public-apple` from `origin/main` 812520f; PR opened. **Not merged, not deployed.**
- **Files changed:** `src/pages/Homepage.tsx` + `src/home-refinement.css` (rewritten; same links, FAQ text, tour targets and "Get started" dialog), `src/components/AuthShell.tsx` + new `src/auth-v2.css` (one centred column on grey; used by Login, Register, ForgotPassword, ResetPassword, Recruiter/Contact login + register), `src/pages/Login.tsx` (markup only; sign-in logic untouched, framer-motion dropped from this page).
- **Copy changes (owner may revert):** eyebrow "For doctors, nurses and allied health professionals"; "From first message to licence."; partner sign-ups moved to one quiet line on sign-in and a "Partners" footer column on the homepage; phone numbers removed from the sign-in page (still in homepage footer).
- **Checks:** `tsc --noEmit` clean, `vite build` OK; viewed signed-out on localhost at pane width (~800px) and 375px: homepage top to footer, Get started dialog, /login, /register, /forgot-password, /recruiter/login; no horizontal scroll at 375px. Did not submit any form.
- **Next action:** owner reviews/merges; merging to `main` deploys via Vercel.

## Previous handoff (2026-11-13 01:35 UTC)
- Signed-in pages redesign + four data-display fixes: PR #40, merged 812520f and live.

## Updating this file
Record the UTC timestamp, assistant/tool, goal, branch/commit/PR, exact files changed, completed work, checks run and results, known issues, unfinished work, and next actionable step.

Do not save credentials, customer/patient information, raw chats or sensitive logs. Inspect Git state and code before trusting another assistant's status. Commit updates on a working branch/PR when authorized; otherwise supply a copyable summary and explicitly state it was not saved.
