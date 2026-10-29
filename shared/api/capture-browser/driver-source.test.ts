// @vitest-environment node
import { type ChildProcess, spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CAPTURE_DRIVER_SOURCE } from "./driver-source";

const PROJECT_ROOT = join(import.meta.dirname, "../../..");
const DRIVER_PORT = 17_777;
const MD5_HEX = /^[0-9a-f]{32}$/;
const DRIVER_TOKEN = "test-token";

// This suite launches a real headless Chromium. CI installs Playwright's
// headless shell before the unit tests and must always run it, so a missing
// browser there fails loudly; locally it is skipped until
// `bunx playwright install chromium` has been run.
const RUN_DRIVER_SUITE =
  Boolean(process.env.CI) || existsSync(chromium.executablePath());

const PAGES: Record<string, string> = {
  "/": `<html><body style="margin:0">
    <h1 id="t">점심 룰렛</h1>
    <button id="spin" style="position:absolute;left:600px;top:400px;width:120px;height:60px"
      onclick="document.body.style.background='orange';document.getElementById('t').textContent='김치찌개'">돌리기</button>
    <a id="away" href="__AWAY__" style="position:absolute;left:100px;top:600px;width:200px;height:40px;display:block">외부</a>
  </body></html>`,
  // Reports every keystroke back to the test server so a test can read what was typed.
  "/form": `<html><body style="margin:0">
    <input id="id" autofocus style="width:600px"
      oninput="fetch('/typed?v=' + encodeURIComponent(this.value))">
  </body></html>`,
};

let lastTyped = "";
let lastTypedAway = "";

let site: Server;
let away: Server;
let siteUrl: string;
let driver: ChildProcess;
let workDir: string;
let driverStderr = "";

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(String((server.address() as AddressInfo).port));
    });
  });
}

async function call(path: string, body?: unknown, token = DRIVER_TOKEN) {
  const res = await fetch(`http://127.0.0.1:${DRIVER_PORT}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: token ? { "x-driver-token": token } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

async function waitForDriver() {
  for (let i = 0; i < 100; i++) {
    try {
      const health = await call("/health");
      if (health.ok) {
        return;
      }
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`driver did not start\n${driverStderr.slice(-2000)}`);
}

describe.skipIf(!RUN_DRIVER_SUITE)("capture driver", () => {
  beforeAll(async () => {
    away = createServer((req, res) => {
      const typed = new URL(req.url ?? "/", "http://x");
      if (typed.pathname === "/typed") {
        lastTypedAway = typed.searchParams.get("v") ?? "";
        res.end("ok");
        return;
      }
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(req.url === "/form" ? (PAGES["/form"] ?? "") : "<h1>away</h1>");
    });
    const awayPort = await listen(away);
    site = createServer((req, res) => {
      const typed = new URL(req.url ?? "/", "http://x");
      if (typed.pathname === "/typed") {
        lastTyped = typed.searchParams.get("v") ?? "";
        res.end("ok");
        return;
      }
      if (typed.pathname === "/sign-in-elsewhere") {
        // e.g. a deployment that sends visitors straight to another host's sign-in
        res.statusCode = 302;
        res.setHeader("location", `http://localhost:${awayPort}/form`);
        res.end();
        return;
      }
      const page = PAGES[req.url ?? ""];
      if (!page) {
        res.statusCode = 404;
        res.end("missing");
        return;
      }
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(page.replace("__AWAY__", `http://localhost:${awayPort}/`));
    });
    siteUrl = `http://127.0.0.1:${await listen(site)}`;

    workDir = mkdtempSync(join(tmpdir(), "capture-driver-"));
    const script = join(workDir, "driver.mjs");
    writeFileSync(script, CAPTURE_DRIVER_SOURCE);
    // Let the script resolve `playwright` from this project's install, the
    // way the sandbox resolves it from its own.
    symlinkSync(
      join(PROJECT_ROOT, "node_modules"),
      join(workDir, "node_modules")
    );
    driver = spawn(process.execPath, [script], {
      env: {
        ...process.env,
        DRIVER_PORT: String(DRIVER_PORT),
        DRIVER_TOKEN,
        VIEW_PATH: join(workDir, "view.jpg"),
        CAPTURE_PATH: join(workDir, "capture.jpg"),
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    driver.stderr?.on("data", (chunk) => {
      driverStderr += String(chunk);
    });
    await waitForDriver();
  }, 60_000);

  afterAll(() => {
    driver?.kill("SIGKILL");
    site?.close();
    away?.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it("opens a reachable page and writes a view for the model", async () => {
    const result = await call("/open", { url: `${siteUrl}/` });
    expect(result).toMatchObject({ ok: true });
    expect(existsSync(join(workDir, "view.jpg"))).toBe(true);
  });

  it("reports a page that answers with an error status as not openable", async () => {
    const result = await call("/open", { url: `${siteUrl}/missing` });
    expect(result).toEqual({ ok: false, reason: "http_404" });
  });

  it("reports an address nothing answers as not openable", async () => {
    const result = await call("/open", { url: "http://127.0.0.1:9/" });
    expect(result).toEqual({ ok: false, reason: "navigation_failed" });
  });

  it("clicks where the model points and reports that the screen changed", async () => {
    await call("/open", { url: `${siteUrl}/` });
    const result = await call("/act", {
      name: "click",
      input: { x: 660, y: 430 },
    });
    expect(result).toMatchObject({ ok: true, changed: true });
  });

  it("comes back when a click leaves the project's host", async () => {
    await call("/open", { url: `${siteUrl}/` });
    const result = await call("/act", {
      name: "click",
      input: { x: 150, y: 620 },
    });
    expect(result.note).toBe("left_project_host");
    expect(new URL(result.url).hostname).toBe("127.0.0.1");
  });

  it("types a long sign-in value in full", async () => {
    const email = "verification-account-for-capture@long-domain.example.com";
    await call("/open", { url: `${siteUrl}/form` });
    const result = await call("/act", {
      name: "type_text",
      input: { text: email },
    });
    expect(result.ok).toBe(true);
    expect(lastTyped).toBe(email);
  });

  it("types nothing on another host's page the project URL redirected to", async () => {
    lastTypedAway = "";
    await call("/open", { url: `${siteUrl}/sign-in-elsewhere` });
    const result = await call("/act", {
      name: "type_text",
      input: { text: "demo-password" },
    });
    expect(result).toMatchObject({
      ok: false,
      note: "typing_off_project_host",
    });
    expect(lastTypedAway).toBe("");
  });

  it("saves a gallery capture of the current screen", async () => {
    await call("/open", { url: `${siteUrl}/` });
    const result = await call("/capture", {});
    expect(result.ok).toBe(true);
    expect(result.hash).toMatch(MD5_HEX);
    expect(existsSync(join(workDir, "capture.jpg"))).toBe(true);
  });

  it("ignores commands that do not carry the session token", async () => {
    // e.g. the captured page itself posting to the driver from inside the sandbox
    const result = await call("/open", { url: "http://127.0.0.1:9/" }, "");
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });
});
