# myELAB Phase 1 — Capacitor shell and release pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the ELAB Client Portal building, signing and uploading as a native app on both platforms — with no native features yet — so the release pipeline is proven before any feature depends on it.

**Architecture:** Capacitor 7 wraps the existing Vite/React SPA with locally bundled assets (no `server.url`, which is the App Store 4.2 rejection pattern). The app ships under the existing `org.elabsolution.app` identity, signed with the existing upload keystore. Every native capability in later phases sits behind `Capacitor.isNativePlatform()`, so the live website is never affected.

**Tech Stack:** Capacitor 7.6.x, Vite 5, React 18, TypeScript, Xcode 27, Android Gradle + JDK 21.

**Spec:** `docs/superpowers/specs/2026-09-19-portal-native-app-design.md` (phase 1 of 4)

## Global Constraints

- **App display name: `myELAB`** exactly. Applies to `appName` in `capacitor.config.ts`, iOS `CFBundleDisplayName`, and the Android `app_name` string.
- **Package / bundle id: `org.elabsolution.app`** — reusing the existing Play listing. Do not invent a new id.
- **`webDir: 'dist'`, and NO `server.url`.** Remote-URL shells are the Apple 4.2 rejection pattern.
- **Android signing must reuse** `elabsolution-upload.keystore`. Play rejects any other key for this package.
- **`versionCode` starts at 2** (the rejected 2026-08-29 submission consumed 1); `versionName` `1.0.0`.
- **Xcode 27 requires `IPHONEOS_DEPLOYMENT_TARGET` ≥ 15.0.** Capacitor's `assertDeploymentTarget` only floors pods at 14.0, so the Podfile needs an explicit 15.0 floor or the archive fails on every pod target.
- **Gradle cannot run on JDK 24.** Build with Android Studio's bundled JBR 21.
- **No native features in this phase** — no push, camera, or biometric. Shell only.
- The live website must keep building and deploying exactly as it does today.

---

## File Structure

| File | Responsibility |
|---|---|
| `capacitor.config.ts` (create) | App identity, bundled-assets config, splash/status bar |
| `package.json` (modify) | Capacitor deps; `cap:sync` and `release:check` scripts |
| `android/` (create, committed) | Android shell, signed release config |
| `android/keystore.properties` (create, **gitignored**) | Signing credentials, never committed |
| `ios/` (create, committed) | iOS shell |
| `ios/App/Podfile` (modify after add) | iOS 15.0 deployment-target floor |
| `scripts/release-check.mjs` (create) | Refuses a release build from a dirty or behind-origin checkout, and reports store-vs-main drift |
| `.gitignore` (modify) | Exclude keystore, build outputs, Pods |

---

### Task 1: Capacitor config and dependencies

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `capacitor.config.ts` exporting a `CapacitorConfig` with `appId: 'org.elabsolution.app'`, `appName: 'myELAB'`, `webDir: 'dist'`. Tasks 2 and 3 read it via the Capacitor CLI.

- [ ] **Step 1: Install Capacitor**

```bash
cd ~/elabclientportal
npm install --save @capacitor/core@^7.6.8 @capacitor/app@^7.1.2 @capacitor/splash-screen@^7.0.5 @capacitor/status-bar@^7.0.6
npm install --save-dev @capacitor/cli@^7.6.8
```

- [ ] **Step 2: Write the config**

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.elabsolution.app',
  appName: 'myELAB',
  webDir: 'dist',
  // Local bundled assets. A remote `server.url` is the App Store 4.2
  // "repackaged website" rejection pattern — do not add one.
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0B1423',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B1423',
      overlaysWebView: false,
    },
  },
  ios: {
    contentInset: 'always',
    scheme: 'App',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

- [ ] **Step 3: Add the sync script**

In `package.json` `scripts`, add:

```json
"cap:sync": "npm run build && npx cap sync"
```

- [ ] **Step 4: Verify the web build still works**

Run: `npm run build`
Expected: succeeds, `dist/` produced. The website must be unaffected by this phase.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts
git commit -m "feat(mobile): Capacitor config for myELAB

Bundled assets, no server.url — a remote-URL shell is the App Store 4.2
rejection pattern. Ships under the existing org.elabsolution.app identity."
```

---

### Task 2: Android shell, signed with the existing upload key

**Files:**
- Create: `android/` (committed), `android/keystore.properties` (gitignored)
- Modify: `android/app/build.gradle`, `android/app/src/main/res/values/strings.xml`, `.gitignore`

**Interfaces:**
- Consumes: `capacitor.config.ts` from Task 1.
- Produces: a signed `android/app/build/outputs/bundle/release/app-release.aab` at `versionCode 2` / `versionName 1.0.0`, for Task 5.

**The keystore is the constraint.** Play will reject an upload for `org.elabsolution.app` signed with any other key. The existing one is at
`/Users/samuel/elabsolution-international-llc-web-main/android/app/elabsolution-upload.keystore`, with its credentials beside it in that repo's `keystore.properties`.

- [ ] **Step 1: Add the platform**

```bash
cd ~/elabclientportal
npm install --save @capacitor/android@^7.6.8
npm run build
npx cap add android
```

- [ ] **Step 2: Copy the keystore and its credentials**

```bash
cp /Users/samuel/elabsolution-international-llc-web-main/android/app/elabsolution-upload.keystore \
   android/app/elabsolution-upload.keystore
cp /Users/samuel/elabsolution-international-llc-web-main/android/keystore.properties \
   android/keystore.properties
```

- [ ] **Step 3: Keep secrets out of git**

Append to `.gitignore`:

```
# Android signing — never commit
android/keystore.properties
android/app/*.keystore
android/app/*.jks

# Native build outputs
android/app/build/
android/build/
android/.gradle/
ios/App/Pods/
ios/App/build/
ios/build/
```

Then confirm: `git status --short | grep -E "keystore|\.jks"` must print nothing.

- [ ] **Step 4: Wire signing and versions into `android/app/build.gradle`**

Above `android {`, add:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android {`, set `versionCode 2` and `versionName "1.0.0"` in `defaultConfig`, then add:

```gradle
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file('elabsolution-upload.keystore')
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }
        }
    }
```

- [ ] **Step 5: Set the display name**

In `android/app/src/main/res/values/strings.xml`, set both `app_name` and `title_activity_main` to `myELAB`.

- [ ] **Step 6: Build the signed bundle**

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease
```

Expected: `BUILD SUCCESSFUL`. Gradle cannot run on the JDK 24 that `/usr/libexec/java_home` resolves to — it fails with `Unsupported class file major version 68`.

- [ ] **Step 7: Verify it is signed and correctly versioned**

```bash
cd ~/elabclientportal
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab
unzip -p android/app/build/outputs/bundle/release/app-release.aab base/manifest/AndroidManifest.xml | strings | grep -E "1\.0\.0"
```

Expected: `jar verified.` and the version string present.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(mobile): Android shell signed with the existing upload key

versionCode 2 — the rejected 2026-08-29 submission consumed 1. Play rejects
any key but the original for this package, so the existing upload keystore is
reused; it and keystore.properties are gitignored."
```

---

### Task 3: iOS shell, with the Xcode 27 deployment-target floor

**Files:**
- Create: `ios/` (committed)
- Modify: `ios/App/Podfile`, `ios/App/App/Info.plist`

**Interfaces:**
- Consumes: `capacitor.config.ts` from Task 1.
- Produces: `ios/build/myELAB.xcarchive` at `1.0.0 (2)`, for Task 5.

- [ ] **Step 1: Add the platform**

```bash
cd ~/elabclientportal
npm install --save @capacitor/ios@^7.6.8
npm run build
npx cap add ios
```

- [ ] **Step 2: Floor the pods at iOS 15.0**

Xcode 27's supported range starts at 15.0, but Capacitor's `assertDeploymentTarget` only raises pods to 14.0 — so every pod target fails the archive with *"The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 14.0, but the range of supported deployment target versions is 15.0 to 27.0.x"*.

In `ios/App/Podfile`, replace the `post_install` block with:

```ruby
post_install do |installer|
  assertDeploymentTarget(installer)
  # Capacitor's helper only floors pods at 14.0, which Xcode 27 rejects
  # (supported range is 15.0+). Match the platform and app target instead.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      end
    end
  end
end
```

Then: `cd ios/App && pod install`

Verify: `grep -c "IPHONEOS_DEPLOYMENT_TARGET = 14.0" Pods/Pods.xcodeproj/project.pbxproj` must print `0`.

- [ ] **Step 3: Set the display name and version**

In `ios/App/App/Info.plist`, set `CFBundleDisplayName` to `myELAB`. In `ios/App/App.xcodeproj/project.pbxproj`, set `MARKETING_VERSION = 1.0.0;` and `CURRENT_PROJECT_VERSION = 2;` (both occurrences of each).

- [ ] **Step 4: Archive**

```bash
cd ~/elabclientportal/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ~/elabclientportal/ios/build/myELAB.xcarchive \
  archive -allowProvisioningUpdates
```

Expected: `** ARCHIVE SUCCEEDED **`.

- [ ] **Step 5: Verify the archive is signed by the RIGHT TEAM**

The plist checks below cannot tell a distributable archive from an undistributable one —
a build signed by a personal Apple ID carries exactly the same bundle id, display name,
version and minimum OS. Check the signing authority first, and treat a mismatch as a
failed task, not a warning:

```bash
codesign -dvvv ~/elabclientportal/ios/build/myELAB.xcarchive/Products/Applications/App.app 2>&1 \
  | grep -E "Authority=Apple"
```

Expected: an authority naming team **39C598HQLD** (ELAB Solutions International).
If it names `62A85SPP3B` or any personal Apple ID, the archive is useless for
distribution — delete it and report BLOCKED. Do not treat ARCHIVE SUCCEEDED as success.

- [ ] **Step 6: Verify the archive's identity**

```bash
PL=~/elabclientportal/ios/build/myELAB.xcarchive/Products/Applications/App.app/Info.plist
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PL"   # org.elabsolution.app
/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "$PL"  # myELAB
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PL"  # 1.0.0
/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$PL"     # 15.0
```

- [ ] **Step 7: Commit**

```bash
cd ~/elabclientportal
git add -A
git commit -m "feat(mobile): iOS shell with the Xcode 27 pod deployment floor

Capacitor's assertDeploymentTarget only raises pods to iOS 14.0, which Xcode 27
rejects outright. An explicit 15.0 floor in post_install matches the platform
and app target. cap sync does not rewrite the Podfile, so this survives syncs —
but a Capacitor upgrade could reintroduce it."
```

---

### Task 4: The release check

**Files:**
- Create: `scripts/release-check.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run release:check`, exiting non-zero on an unsafe release state.

The Academy apps sat a month behind `main` and nobody knew until a user said the app felt stale. This makes that visible, and refuses to build a release from a checkout that would ship the wrong code.

- [ ] **Step 1: Write the failing test**

This repo has **no test framework installed** — `package.json` has no `test` script and
no vitest or jest. Rather than add one for a single utility, use Node's built-in runner,
which needs no dependency at all.

```js
// scripts/release-check.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseState } from "./release-check.mjs";

describe("evaluateReleaseState", () => {
  const clean = { branch: "main", dirty: false, behind: 0, ahead: 0 };

  it("passes on a clean main in sync with origin", () => {
    assert.deepEqual(evaluateReleaseState(clean), { ok: true, problems: [] });
  });

  it("refuses a dirty checkout — a release must be reproducible from a commit", () => {
    const v = evaluateReleaseState({ ...clean, dirty: true });
    assert.equal(v.ok, false);
    assert.match(v.problems.join(" "), /uncommitted/i);
  });

  it("refuses a branch other than main", () => {
    const v = evaluateReleaseState({ ...clean, branch: "feat/x" });
    assert.equal(v.ok, false);
    assert.match(v.problems.join(" "), /main/i);
  });

  it("refuses a checkout behind origin — that ships stale code", () => {
    const v = evaluateReleaseState({ ...clean, behind: 3 });
    assert.equal(v.ok, false);
    assert.match(v.problems.join(" "), /behind/i);
  });

  it("reports every problem at once rather than one at a time", () => {
    const v = evaluateReleaseState({ branch: "feat/x", dirty: true, behind: 2, ahead: 0 });
    assert.equal(v.problems.length, 3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/release-check.test.mjs`
Expected: FAIL — cannot resolve `./release-check.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/release-check.mjs
import { execSync } from "node:child_process";

/**
 * Decide whether this checkout may produce a store release.
 *
 * Pure so it can be tested without a git repo. Collects every problem rather
 * than failing on the first, because being told about one blocker at a time
 * is how a release takes three attempts.
 */
export function evaluateReleaseState({ branch, dirty, behind }) {
  const problems = [];
  if (branch !== "main") {
    problems.push(`On branch "${branch}" — release builds must come from main.`);
  }
  if (dirty) {
    problems.push("Uncommitted changes — a release must be reproducible from a commit.");
  }
  if (behind > 0) {
    problems.push(`${behind} commit(s) behind origin/main — this would ship stale code.`);
  }
  return { ok: problems.length === 0, problems };
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

function main() {
  execSync("git fetch origin main --quiet", { stdio: "ignore" });
  const state = {
    branch: git("rev-parse --abbrev-ref HEAD"),
    dirty: git("status --porcelain").length > 0,
    behind: Number(git("rev-list --count HEAD..origin/main")),
    ahead: Number(git("rev-list --count origin/main..HEAD")),
  };

  const verdict = evaluateReleaseState(state);
  console.log(`branch=${state.branch} dirty=${state.dirty} behind=${state.behind} ahead=${state.ahead}`);

  if (!verdict.ok) {
    console.error("\nNot safe to cut a release:");
    for (const p of verdict.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nSafe to cut a release from this checkout.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/release-check.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 5: Add the script**

In `package.json` `scripts`, add:

```json
"release:check": "node scripts/release-check.mjs",
"test:scripts": "node --test scripts/"
```

- [ ] **Step 6: Commit**

```bash
git add scripts/release-check.mjs scripts/release-check.test.mjs package.json
git commit -m "feat(mobile): refuse to cut a release from an unsafe checkout

The Academy apps sat a month behind main and nobody noticed until a user said
the app felt stale. This refuses a release from a non-main, dirty, or
behind-origin checkout, and reports every problem at once."
```

---

### Task 5: Upload to the Play internal track — HUMAN-GATED

**Files:** none changed.

**Interfaces:**
- Consumes: the signed `.aab` from Task 2 and the archive from Task 3.
- Produces: a build on the Play internal testing track.

**Do not perform this task autonomously.** It publishes to a real store listing. Prepare everything, then hand over.

- [ ] **Step 1: Confirm the release state is clean**

Run: `npm run release:check`
Expected: exits 0.

- [ ] **Step 2: Report readiness to the human partner, with:**
- the `.aab` path and its verified version
- the archive path and its verified bundle id / display name
- the reminder that the Play Console for this account is reached via
  `https://play.google.com/console/developers/8772900097283343461/app-list?authuser=support@elabsolution.org`
  (the `u/N` index is not stable)
- the reminder that `org.elabsolution.app` currently holds a **rejected** submission and
  **10 unsubmitted changes belonging to the old marketing shell** — those must be
  triaged, not submitted, and the `Production 1 (1.0)` release among them discarded
- that `file_upload` cannot carry the `.aab` (10 MB tool cap vs ~13 MB), so a human drags it in

- [ ] **Step 3: Wait for the human partner to upload, then verify**

Once they confirm, check the internal track shows `1.0.0 (2)`.

---

## Verification

After Task 4 (everything automatable):

- [ ] `npm run build` still succeeds — the website is unaffected.
- [ ] `npx cap sync` completes for both platforms.
- [ ] The `.aab` is signed (`jarsigner -verify` → "jar verified") at `1.0.0` / `versionCode 2`.
- [ ] The iOS archive reports `org.elabsolution.app`, `myELAB`, `1.0.0`, minOS `15.0`.
- [ ] No keystore, `.jks`, or `keystore.properties` appears in `git status`.
- [ ] `npm run release:check` exits 0 on a clean main, non-zero when dirty.
- [ ] `npm run test:scripts` passes 5 tests with no test framework installed.
- [ ] No `server.url` anywhere in `capacitor.config.ts`.

## Out of scope — later phases

Push notifications (phase 2), camera capture (phase 3, and it depends on the document-upload repair already shipped), biometric unlock (phase 4). This phase adds no native capability at all; it exists to prove the pipeline before anything depends on it.
