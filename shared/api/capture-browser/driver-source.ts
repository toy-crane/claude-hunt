/**
 * Source of the small browser driver that runs inside the capture sandbox.
 *
 * It owns one headless Chromium page and listens on localhost only, so the
 * app talks to it through sandbox commands instead of an exposed port. The
 * page of an untrusted project URL therefore never runs next to the app's
 * secrets (docs/decisions/project-url-capture.md).
 *
 * Every command except /health must carry the session's random token in
 * an `x-driver-token` header. The captured page runs inside the same
 * sandbox and could otherwise post to the driver; browsers cannot attach a
 * custom header to such a request without a CORS preflight the driver never
 * grants.
 *
 * Endpoints (JSON in, JSON out):
 * - GET  /health                → { ok: true }
 * - POST /open    { url }       → { ok, url, reason? } and writes VIEW_PATH
 * - POST /act     { name, input }→ { ok, url, changed, note? } and writes VIEW_PATH
 * - POST /capture               → { ok, hash } and writes CAPTURE_PATH
 *
 * VIEW_PATH is a compact screenshot for the model; CAPTURE_PATH is the
 * gallery-quality image. Both are 1280×800 JPEGs.
 */
export const DRIVER_PORT = 7777;
export const VIEW_PATH = "/tmp/capture-view.jpg";
export const CAPTURE_PATH = "/tmp/capture-shot.jpg";

export const CAPTURE_DRIVER_SOURCE = `
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = Number(process.env.DRIVER_PORT || ${DRIVER_PORT});
const VIEW_PATH = process.env.VIEW_PATH || "${VIEW_PATH}";
const CAPTURE_PATH = process.env.CAPTURE_PATH || "${CAPTURE_PATH}";
const TOKEN = process.env.DRIVER_TOKEN || "";
const VIEWPORT = { width: 1280, height: 800 };
const KEYS = new Set(["Enter", "Escape", "Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
// Long enough for a sign-in email or password taken from the owner's
// description; still caps runaway typing.
const MAX_TYPED = 200;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, locale: "ko-KR", acceptDownloads: false });
let page = null;

// Every open starts from a fresh page: a failed navigation can leave the old
// page unable to take screenshots.
async function freshPage() {
  if (page) await page.close().catch(() => {});
  page = await context.newPage();
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));
  // New windows and tabs never take over the capture.
  page.on("popup", (popup) => popup.close().catch(() => {}));
}

let startUrl = null;
let host = null;

const md5 = (buf) => createHash("md5").update(buf).digest("hex");

async function settle() {
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(700);
}

async function view() {
  const buf = await page.screenshot({ type: "jpeg", quality: 70 });
  writeFileSync(VIEW_PATH, buf);
  return md5(buf);
}

async function open(url) {
  await freshPage();
  let response;
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (error) {
    return { ok: false, reason: "navigation_failed" };
  }
  if (!response) return { ok: false, reason: "no_response" };
  if (response.status() >= 400) return { ok: false, reason: "http_" + response.status() };
  await settle();
  startUrl = page.url();
  host = new URL(startUrl).hostname;
  await view();
  return { ok: true, url: page.url() };
}

async function act(name, input) {
  const before = md5(await page.screenshot({ type: "jpeg", quality: 70 }));
  switch (name) {
    case "click": await page.mouse.click(Number(input.x), Number(input.y)); break;
    case "type_text": await page.keyboard.type(String(input.text).slice(0, MAX_TYPED), { delay: 20 }); break;
    case "press_key": if (KEYS.has(input.key)) await page.keyboard.press(input.key); break;
    case "scroll": await page.mouse.wheel(0, input.direction === "up" ? -700 : 700); break;
    case "go_back": await page.goBack({ timeout: 5000 }).catch(() => {}); break;
    case "wait": await page.waitForTimeout(input.seconds === 5 ? 5000 : 2000); break;
    default: return { ok: false, reason: "unknown_action" };
  }
  await settle();
  let note;
  if (!/^https?:/.test(page.url())) {
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await settle();
    note = "returned_to_start";
  } else if (new URL(page.url()).hostname !== host) {
    await page.goBack({ timeout: 5000 }).catch(() => page.goto(startUrl).catch(() => {}));
    await settle();
    note = "left_project_host";
  }
  const after = await view();
  return { ok: true, url: page.url(), changed: before !== after, note };
}

async function capture() {
  const buf = await page.screenshot({ type: "jpeg", quality: 85 });
  writeFileSync(CAPTURE_PATH, buf);
  return { ok: true, hash: md5(buf) };
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}

const server = createServer(async (req, res) => {
  let result;
  try {
    const body = await readBody(req);
    if (req.url === "/health") result = { ok: true };
    else if (!TOKEN || req.headers["x-driver-token"] !== TOKEN) result = { ok: false, reason: "forbidden" };
    else if (req.url === "/open") result = await open(String(body.url || ""));
    else if (!page) result = { ok: false, reason: "not_open" };
    else if (req.url === "/act") result = await act(String(body.name || ""), body.input || {});
    else if (req.url === "/capture") result = await capture();
    else result = { ok: false, reason: "not_found" };
  } catch (error) {
    result = { ok: false, reason: "driver_error", message: String(error && error.message || error).slice(0, 200) };
  }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(result));
});
server.listen(PORT, "127.0.0.1");
`;
