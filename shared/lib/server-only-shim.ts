// Test-only shim. Next.js's `server-only` package throws at import time to
// block client-bundle resolution. It has no Node-resolvable target, so vitest
// aliases the specifier here.
export {};
