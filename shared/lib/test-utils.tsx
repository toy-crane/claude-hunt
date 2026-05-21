import { render } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

export function createMockSupabaseClient(overrides?: {
  getUser?: () => Promise<unknown>;
  signInWithOtp?: () => Promise<unknown>;
  signInWithOAuth?: () => Promise<unknown>;
  signOut?: () => Promise<unknown>;
  exchangeCodeForSession?: (code: string) => Promise<unknown>;
}) {
  return {
    auth: {
      getUser:
        overrides?.getUser ??
        vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOtp:
        overrides?.signInWithOtp ?? vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth:
        overrides?.signInWithOAuth ??
        vi.fn().mockResolvedValue({ error: null }),
      signOut: overrides?.signOut ?? vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession:
        overrides?.exchangeCodeForSession ??
        vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

export async function renderServerComponent(
  asyncComponent: Promise<React.JSX.Element>
) {
  const jsx = await asyncComponent;
  return render(jsx);
}

/**
 * Renders a client component under `NuqsTestingAdapter` so any `useQueryState`
 * / `useQueryStates` hooks resolve against the supplied URL search string.
 * Pass `"?cohort=cohort-a"` style strings (leading `?` optional).
 */
export function renderWithSearchParams(ui: ReactElement, search = "") {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter searchParams={search}>{children}</NuqsTestingAdapter>
    ),
  });
}
