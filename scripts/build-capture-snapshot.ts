/**
 * Builds the Vercel Sandbox snapshot the capture browser starts from:
 * Playwright, its Chromium build, and Korean fonts, installed under
 * /opt/capture. Prints the snapshot id to store as
 * CAPTURE_SANDBOX_SNAPSHOT_ID in each environment.
 *
 *   bun run capture:snapshot
 *
 * Needs Vercel credentials for the claude-hunt project (VERCEL_OIDC_TOKEN
 * from `vercel env pull`, loaded from .env.local by Bun). Rebuild when the
 * Playwright version or the sandbox base image changes.
 */
import { Sandbox } from "@vercel/sandbox";

const PLAYWRIGHT_VERSION = "1.59.1";
const HOME = "/opt/capture";

async function run(sandbox: Sandbox, script: string) {
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", script],
    sudo: true,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `step failed (${result.exitCode}): ${script}\n${await result.stderr()}`
    );
  }
}

const sandbox = await Sandbox.create({
  resources: { vcpus: 2 },
  timeout: 15 * 60 * 1000,
  region: "icn1",
  persistent: false,
});
console.log(`building in ${sandbox.name}…`);

try {
  await run(
    sandbox,
    `mkdir -p ${HOME} && cd ${HOME} && npm init -y >/dev/null && npm install playwright@${PLAYWRIGHT_VERSION} >/dev/null`
  );
  // The default image is newer than Playwright's supported Ubuntu list, so
  // install the Ubuntu 24.04 build and its system dependencies.
  await run(
    sandbox,
    `cd ${HOME} && PLAYWRIGHT_BROWSERS_PATH=${HOME}/browsers PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright install --with-deps chromium`
  );
  await run(
    sandbox,
    "apt-get install -y -q fonts-noto-cjk fontconfig >/dev/null && fc-cache -f >/dev/null"
  );
  // The app writes and runs its driver here as the default sandbox user.
  await run(sandbox, `chmod -R a+rwX ${HOME}`);

  const snapshot = await sandbox.snapshot({ expiration: 0 });
  console.log(`CAPTURE_SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);
} catch (error) {
  await sandbox.stop().catch(() => undefined);
  throw error;
}
