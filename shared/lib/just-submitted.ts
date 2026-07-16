const KEY_PREFIX = "ch:just-submitted:";

/**
 * One-shot sessionStorage flag connecting a successful submit to the
 * detail page it navigates to, where an arrival animation consumes it.
 * sessionStorage (not a query param) so the flag never leaks into a
 * shareable URL and cannot replay on refresh or back-navigation.
 * Best-effort: some private modes throw on any storage access.
 */
export function setJustSubmitted(projectId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(`${KEY_PREFIX}${projectId}`, "1");
  } catch {
    // Storage unavailable — the celebration is skipped, nothing breaks.
  }
}

/** Reads and clears the flag; true at most once per submission. */
export function consumeJustSubmitted(projectId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const key = `${KEY_PREFIX}${projectId}`;
    if (window.sessionStorage.getItem(key) === null) {
      return false;
    }
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
