# ELAB portal interface refresh

Based on production commit 144b90dcef93570e94eae5337624ac6b63930ca1.

## Changes
- Official ELAB logo on homepage, access screens and client dashboard.
- Reviewed blue homepage with service rows, account activation links, FAQ, support, policies, tools, office addresses and a public portal tour.
- Shared access layout around existing client, recruiter and institution login/activation forms and password recovery/reset.
- Split application list/detail view, grid view, search, all status filters including cancelled cases, stage disclosure and case links.
- Account checklist, totals, recent activity and recommendations remain in expandable sections. Dashboard tour opens those sections while active.
- Existing application details, document uploads, settings, role routing, backend calls and account handlers are retained. The document shortcut is labelled “All documents” because it opens the existing account-wide page.

## Verification
- TypeScript and production build pass. Existing large-bundle warning remains.
- All 17 existing auth/dashboard action handlers compared against production and unchanged; src/lib, src/App.tsx and supabase have no changes.
- Connected login and activation screens visually checked; actual user signed in successfully.
- Four real applications loaded. Case selection, cancelled filtering, case-reference search, clearing search, four-card grid, stage disclosure and existing document-page loading checked.
- Mobile list/detail navigation checked. Desktop split layout checked in a separate browser tab.
- No test emails, new accounts, passwords, document uploads or database mutations submitted.

Production deployment and post-deploy checks are pending until release execution finishes.

## Inner-page consistency pass — 2026-09-09

Local source now includes the case page, shared stage visualization, documents, support, FAQ and settings refinements. Replaced rainbow summary tiles with compact facts, kept one primary stage-position indicator, and made the generated case summary a keyboard-accessible disclosure. Stage list, timeline, document links and case support remain accessible. Official branding is used on documents, FAQ and support. FAQ filters retain their text on mobile; settings switches now have accessible names and states.

Validation: production build and git diff whitespace checks pass. Fourteen existing named action handlers across case, documents, support and settings compare unchanged against the previous commit. Browser checks covered signed-in case tabs and stage disclosure, documents, FAQ disclosure, support form/tracking views, and settings light/dark appearance. No support tickets, uploads or account mutations were submitted. The original light preference was restored.

These inner-page changes are local only. The earlier staged deployment does not contain this pass and must be rebuilt before release. The custom production domain has not been switched by this pass.
