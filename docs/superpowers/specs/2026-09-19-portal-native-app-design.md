# ELAB Client Portal — native app (iOS + Android)

**Date:** 2026-09-19
**Status:** Design approved, not yet planned
**Repo:** `elabclientportal`

## Problem

The ELAB Client Portal is the only genuinely app-shaped product ELAB owns: clients
track licensing and DataFlow cases over weeks or months, upload documents, and pay
invoices. It exists only as a website.

Meanwhile `org.elabsolution.app` — the *marketing* site wrapped in Capacitor — is in
the Play Console, rejected on 2026-08-31 because Google's reviewer could not log in.
That app has no sign-in of its own: its auth entry points `window.location.replace`
out of the bundled app to `portal.elabsolution.org`, which runs on a different
Supabase project, so no credentials could ever have produced a session inside it.

The inversion is the real finding: **the brochure was shipped as an app and the
product was left as a website.** This spec corrects that.

## Goals

- A native iOS and Android app for the client portal, serving all three audiences it
  already serves: clients, recruiters, institutional contacts.
- Three native capabilities that justify the app existing at all, under Apple
  Guideline 4.2:
  - push notifications on case/stage changes
  - camera capture straight into document upload
  - biometric unlock
- Ship under the existing `org.elabsolution.app` listing rather than adding a fourth.
- Zero behavioural change to the live website.

## Non-goals

- **Offline viewing** — considered and deferred. Most engineering, least certain payoff.
- **Over-the-air web-bundle updates** (Capgo/Appflow) — the design stays OTA-ready but
  v1 ships bundled assets with scheduled store releases. Rationale: adding OTA before
  the app has a single user means debugging two new systems at once. Revisit when the
  release cadence is measured rather than predicted.
- **GlobalHire as an app.** It is 79 static HTML pages; wrapping it would feel worse
  than the website. PWA if anything.
- Shipping the marketing shell. It should not be submitted.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Audience | All three roles | User's call; whole portal wrapped, no route stripping |
| Shell | Capacitor, assets bundled locally | `server.url` is the 4.2 rejection pattern |
| Repo | Inside `elabclientportal` | One codebase, mirrors `elab-academy-platform` |
| Drift strategy | Scheduled store releases (Option 1) | OTA deferred, not designed out |
| Store identity | Reuse `org.elabsolution.app` | Listing, countries, keystore already exist; Draft, 0 installs |
| Push transport | FCM HTTP v1 for both platforms | One integration, one secret |
| Biometric | Gate, never authentication | A changed fingerprint must not lock a client out of their case |

## Architecture

Capacitor lives in the existing repo. The Vercel web deploy is untouched — shipping
the app becomes a separate, deliberate act.

- `capacitor.config.ts`: `appId: 'org.elabsolution.app'`, `webDir: 'dist'`, **no `server.url`**
- `ios/` and `android/` committed to the repo
- Build: `npm run build` → `npx cap sync` → platform build
- **Every native capability sits behind `Capacitor.isNativePlatform()`.** The portal is
  live and serving clients; app work must not be able to break the website. A test
  enforces this (see Testing).

**App display name: `myELAB`** (decided 2026-09-19). Replaces the listing's current
"ELAB Solutions", which was right for a marketing site and vague for a client portal.
Display name is independent of package name, so `org.elabsolution.app` is still reused.

Applies to: `appName` in `capacitor.config.ts`, the Play and App Store listing titles,
the iOS `CFBundleDisplayName`, and the Android `app_name` string.

## Push notifications

### Reuse the existing pipeline

CC (`fwmhfwprvqaovidykaqt`, shared with the portal) already has `notify-stage-change`,
`notification-dispatcher`, and `_shared/notifications/{executor,formatter,triggers,types}.ts`.
Push is a third channel on that machinery — no new trigger, no second source of truth
about what a stage change means.

- Widen `channel: 'email' | 'whatsapp'` → `| 'push'` in `types.ts` (2 sites)
- Add a push branch in `executor.ts`
- Add push variants to `notification_templates` (short title + body + deep link)

### `device_tokens` (new table, CC project)

`user_id`, `token`, `platform` (`ios|android`), `app`, `last_seen_at`, `revoked_at`.
Unique on `token`. RLS: a user may only touch their own rows; service role reads for
dispatch. The `app` column exists so Academy can share this table later.

### Requirements

- **Dead-token handling is v1.** FCM `UNREGISTERED` → set `revoked_at`, stop sending.
  Without it the table rots and delivery metrics lie.
- **Logout revokes the token.** Shared and handed-down phones are common in this client
  base. A token surviving logout sends the previous client's case notifications to the
  next person who signs in. This is a privacy requirement.
- **Lock-screen content stays vague.** "Your DataFlow case has an update", never "Your
  CGFNS verification was rejected". Case status is health-adjacent; lock screens are
  read by whoever holds the phone. Detail lives behind the tap.
- **Per-stage opt-in**, modelled on GlobalHire's `STAGE_TEMPLATES` map. Start sparse —
  document requested, document accepted, submission made, result received — and expand
  on evidence. A client pinged for internal bookkeeping transitions disables
  notifications permanently.
- **Permission requested after a first meaningful action**, not on cold launch. A denied
  iOS prompt is near-impossible to recover.
- Foreground messages render as in-app toasts, not system notifications.
- Tap deep-links to the case, handled for both cold and warm start.

### Infrastructure

Firebase project for FCM; `google-services.json` (Android); APNs auth key uploaded to
Firebase; Push Notifications capability on the iOS App ID; `FCM_SERVICE_ACCOUNT` secret
in the CC Supabase project.

## Camera capture

> **Prerequisite:** this section assumed a working upload path. It does not exist — see
> [the upload repair spec](2026-09-19-client-document-upload-design.md). The design below
> holds, but applies to the repaired path (edge function, `documents` table,
> `source='client_portal'`), not the current broken one.

`handleFiles(files: File[])` in `src/pages/Documents.tsx` is already the single funnel
for drag/drop and the file picker. **Camera feeds that funnel; it does not get its own
path** — otherwise validation, progress UI, storage path and the `client_documents` row
drift apart within two releases.

- Native-only "Take photo" button via `@capacitor/camera`, requesting JPEG directly
- **Multi-page capture**: clients photograph multi-page certificates. Capture accumulates
  into a list, then merges into one PDF, reusing the logic behind `/tools/pdf/from-image`.
  Extract that into a shared lib imported by both the tool page and the capture flow.
- **HEIC:** originally the reason this was investigated; cannot be assessed until uploads
  work at all. The `accept` list is
  `.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx` — no HEIC. If iOS photo-library picks can
  arrive as HEIC today, they are landing in storage unviewable for staff. If confirmed,
  normalise HEIC inside `handleFiles` — which fixes the website too.
- **Permission strings are a review gate.** `NSCameraUsageDescription` /
  `NSPhotoLibraryUsageDescription` must be specific: "ELAB uses your camera to
  photograph documents for your licensing application." Generic strings get rejected.

## Biometric unlock

Gates the app; does not authenticate.

- Supabase session persists in secure storage (Keychain / Keystore via Capacitor Preferences)
- Cold start + existing session + opted in → biometric unlocks the UI
- Failure or unavailability → normal password login. Biometric is never the only way in.
- **No password is ever stored.**
- Opt-in from Settings, default off.

**Risk:** the biometric plugin is community-maintained, not official Capacitor. It is
the only third-party dependency here and is confined to one droppable feature.

## Release and store

- **Signing:** must reuse `elabsolution-upload.keystore`. **This key exists in exactly
  one place — the CEO's laptop.** Losing it makes the listing unusable. Back it up
  before building on it. Same applies to Academy's `elab-upload-key.jks`.
- **versionCode starts at 2** (the rejected submission consumed 1); confirm at upload.
- **iOS App Store record** for this bundle ID needs verifying or creating.
- **Triage the 10 staged Play changes** — they belong to the marketing app. Keep
  countries and reusable store-listing text; discard the `Production 1 (1.0)` release.
- **Demo credentials are a release gate**: one account per role (client, recruiter,
  institutional contact), non-expiring, no OTP, **seeded with realistic sample data**.
  A reviewer who logs in and finds an empty dashboard concludes the app does nothing —
  a 4.2 rejection instead of a credentials one.
- **Version parity check** in the release script, mirroring Academy's `deploy-prod.sh`:
  compare the shipped bundle's commit against `origin/main` and report how far behind
  the stores are.
- **Rollout:** Play internal testing track first, then staged production. Not a full
  rollout on day one.

## Testing

- Unit: push executor branch against a faked FCM; token lifecycle (login registers,
  logout revokes); image→PDF merge; HEIC normalisation if confirmed needed.
- **Guard test: the web build mounts no native features.** Protects the live site.
- Manual, one real device per platform: permission prompt, a push triggered by an actual
  CC stage change, camera→upload→staff can open the file, biometric unlock and fallback.

## Implementation sequencing

This is too large for one undifferentiated plan. Four phases, each independently
valuable and independently shippable to the internal track:

1. **Shell + release pipeline.** Capacitor added, both platforms building and signed,
   version parity check, internal-track upload. No native features yet. Proves the
   pipeline before any feature depends on it, and de-risks the store identity reuse
   (signing against the existing keystore) at the cheapest possible moment.
2. **Push.** Migration, channel widening, executor branch, Firebase/APNs setup, client
   registration and revocation. The largest phase and the one carrying the business case.
3. **Camera capture.** Shared image→PDF lib extraction, capture flow, HEIC verification.
   **BLOCKED until client document upload works** — see
   [the upload repair spec](2026-09-19-client-document-upload-design.md). In-portal upload
   has never worked against the current database, so there is no working `handleFiles()`
   path for camera to feed. That repair ships independently and first.
4. **Biometric.** Smallest, most droppable, and the only third-party dependency —
   deliberately last so it can be cut without disturbing anything else.

Store submission happens after phase 2 at the earliest; phases 3 and 4 can ship as
subsequent releases. Demo-account seeding is a prerequisite of the first submission,
not of phase 1.

## Known toolchain hazards (from the 2026-09-19 Academy release)

- Xcode 27 rejects `IPHONEOS_DEPLOYMENT_TARGET` 14.0. Capacitor's `assertDeploymentTarget`
  only floors pods at 14.0 — add an explicit 15.0 floor in the Podfile `post_install`.
- Gradle 8.x cannot run on JDK 24. Build with Android Studio's bundled JBR 21.
- Claude cannot upload an `.aab` (10 MB tool cap vs ~13 MB bundle) — a human drags it in.
- The Play Console account (`support@elabsolution.org`) is not always at `u/0`; address
  it by `?authuser=support@elabsolution.org` rather than a hardcoded index.

## Open questions

1. ~~App display name~~ — **resolved: `myELAB`**. Confirm exact casing before store metadata.
2. Does an iOS App Store record exist for `org.elabsolution.app`?
3. ~~Is HEIC reaching storage today?~~ — **unanswerable until upload is repaired.** In-portal
   upload has never worked, so no client-uploaded HEIC can exist. Revisit after the repair.
