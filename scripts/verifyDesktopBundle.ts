/**
 * Electrobun postBuild hook (see electrobun.config.ts `scripts.postBuild`): asserts the embedded
 * native binaries survived the resource copy with their executable bit. It must run as a hook — the
 * stable pipeline re-packages the real .app into a self-extracting bundle right after postBuild, so
 * this is the only point where the final Resources/app is inspectable from outside electrobun. A
 * non-zero exit here aborts the whole build.
 */

import { accessSync, constants, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EMBEDDED_BINARIES = ["codex-bin", "codex-code-mode-host"];

const buildDir = process.env.ELECTROBUN_BUILD_DIR;
if (!buildDir) {
  console.error("verifyDesktopBundle: ELECTROBUN_BUILD_DIR is missing (this script must run as a postBuild hook)");
  process.exit(1);
}

const appBundle = readdirSync(buildDir).find(
  (entry) => entry.endsWith(".app") && existsSync(join(buildDir, entry, "Contents", "Resources", "app")),
);
if (!appBundle) {
  console.error(`verifyDesktopBundle: no .app bundle with Resources/app under ${buildDir}`);
  process.exit(1);
}

const resourcesApp = join(buildDir, appBundle, "Contents", "Resources", "app");
for (const name of EMBEDDED_BINARIES) {
  const path = join(resourcesApp, name);
  if (!existsSync(path)) {
    console.error(`verifyDesktopBundle: embedded binary missing: ${path}`);
    process.exit(1);
  }
  try {
    accessSync(path, constants.X_OK);
  } catch {
    console.error(`verifyDesktopBundle: binary is not executable (+x lost during the copy): ${path}`);
    process.exit(1);
  }
}

console.log(`verifyDesktopBundle: OK (${EMBEDDED_BINARIES.join(", ")} executable in ${appBundle})`);
