import { describe, expect, it, vi } from "vitest";

// The sandbox is an external system; tests drive a fake that answers the
// driver's curl calls by endpoint.
const runCommand = vi.fn((...args: unknown[]) => {
  if (typeof args[0] !== "string") {
    return Promise.resolve({});
  }
  const curlArgs = args[1] as string[];
  const endpoint = curlArgs.at(-1) ?? "";
  const reply = endpoint.endsWith("/capture")
    ? { ok: true, hash: "h1" }
    : { ok: true, url: "https://tally.example.com/", changed: true };
  return Promise.resolve({
    stdout: () => Promise.resolve(JSON.stringify(reply)),
  });
});
const writeFiles = vi.fn((_files: unknown[]) => Promise.resolve());
const sandbox = {
  runCommand,
  writeFiles,
  readFileToBuffer: vi.fn(async () => Buffer.from("jpeg")),
  stop: vi.fn(async () => undefined),
};
vi.mock("@vercel/sandbox", () => ({
  Sandbox: { create: vi.fn(async () => sandbox) },
}));
vi.mock("@shared/config/env", () => ({
  env: { CAPTURE_SANDBOX_SNAPSHOT_ID: "snap_test" },
}));

const { openCaptureSession } = await import("./session");

describe("openCaptureSession", () => {
  it("hands typed text to the browser driver through a file, never on a sandbox command line", async () => {
    const opened = await openCaptureSession("https://tally.example.com", {
      lifetimeMs: 60_000,
    });
    if (!opened.ok) {
      throw new Error("session did not open");
    }

    await opened.session.act("type_text", { text: "Ch-secret-9!" });

    expect(JSON.stringify(runCommand.mock.calls)).not.toContain("Ch-secret-9!");
    const written = writeFiles.mock.calls
      .flatMap(([files]) => files as Array<{ content: Buffer }>)
      .map((file) => file.content.toString());
    expect(written.some((content) => content.includes("Ch-secret-9!"))).toBe(
      true
    );
  });
});
