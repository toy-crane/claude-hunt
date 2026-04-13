import { render } from "@testing-library/react";
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
