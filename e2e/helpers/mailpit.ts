const MAILPIT_URL = "http://127.0.0.1:54324";
const MAGIC_LINK_RE = /https?:\/\/[^\s"<>]*\/auth\/v1\/verify[^\s"<>]+/;

interface MailpitSearchResponse {
  messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

/**
 * Poll Mailpit for an email sent to `email` and extract the Supabase magic-link URL.
 * Mailpit ships with the local Supabase CLI stack at :54324.
 */
export async function fetchMagicLink(
  email: string,
  timeoutMs = 10_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const searchUrl = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(
      `to:${email}`
    )}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const { messages } = (await searchRes.json()) as MailpitSearchResponse;
      if (messages.length > 0) {
        const msgRes = await fetch(
          `${MAILPIT_URL}/api/v1/message/${messages[0].ID}`
        );
        const msg = (await msgRes.json()) as MailpitMessage;
        // Prefer plain text (no HTML entity encoding); fall back to HTML and
        // decode `&amp;` so query-string separators survive.
        const body = msg.Text || msg.HTML.replaceAll("&amp;", "&");
        const match = body.match(MAGIC_LINK_RE);
        if (match) {
          return match[0];
        }
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(
    `Mailpit: no email received for ${email} within ${timeoutMs}ms`
  );
}

/**
 * Wipe all messages in Mailpit — useful in test setup to avoid stale matches.
 */
export async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}
