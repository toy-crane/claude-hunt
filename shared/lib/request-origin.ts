/**
 * Resolve the externally-visible origin of a request for building redirect
 * URLs. Behind a reverse proxy (the local portless HTTPS proxy on
 * `*.claude-hunt.localhost`), `request.url` carries the dev server's bind
 * address (e.g. `https://localhost:4293`) — a host the browser cannot reach
 * over HTTPS — while the proxy passes the real origin in
 * `x-forwarded-host` / `x-forwarded-proto`. Prefer those headers and fall
 * back to `request.url` for direct access (e.g. Playwright on
 * `localhost:3000`). On Vercel the platform manages `x-forwarded-host`, so
 * production behavior is unchanged.
 */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      new URL(request.url).protocol.replace(":", "");
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
