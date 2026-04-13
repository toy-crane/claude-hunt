import { createMockSupabaseClient } from "@shared/lib/test-utils.tsx";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "./login-form.tsx";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockClient = createMockSupabaseClient();

vi.mock("@shared/api/supabase/client", () => ({
  createClient: () => mockClient,
}));

const GITHUB_RE = /GitHub/i;
const GOOGLE_RE = /Google/i;
const SENDING_RE = /Sending/i;
const CALLBACK_PATH_RE = /\/auth\/callback$/;

function neverResolve() {
  // Intentionally never resolves to keep loading state active
  return new Promise<never>(() => undefined);
}

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth.signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  });

  it("F-AUTH-LOGIN-001: shows OTP sent confirmation after entering email and clicking Continue", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("We sent a magic link to")
        )
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("test@example.com", { exact: false })
    ).toBeInTheDocument();
  });

  it("F-AUTH-LOGIN-002: Try another email resets the form", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Get to OTP sent state
    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Try another email" })
      ).toBeInTheDocument();
    });

    // Click "Try another email"
    await user.click(screen.getByRole("button", { name: "Try another email" }));

    // Email input reappears with empty value
    const newEmailInput = screen.getByLabelText("Email");
    expect(newEmailInput).toHaveValue("");

    // OTP message gone
    expect(
      screen.queryByText((content) =>
        content.includes("We sent a magic link to")
      )
    ).not.toBeInTheDocument();
  });

  it("F-AUTH-LOGIN-003: all interactive elements disabled during loading", async () => {
    mockClient.auth.signInWithOtp = vi.fn().mockReturnValue(neverResolve());

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GITHUB_RE })).toBeDisabled();
      expect(screen.getByRole("button", { name: GOOGLE_RE })).toBeDisabled();
      expect(screen.getByLabelText("Email")).toBeDisabled();
      expect(screen.getByRole("button", { name: SENDING_RE })).toBeDisabled();
    });
  });

  it("F-AUTH-LOGIN-004: Continue button shows 'Sending...' during loading", async () => {
    mockClient.auth.signInWithOtp = vi.fn().mockReturnValue(neverResolve());

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sending..." })
      ).toBeInTheDocument();
    });
  });

  it("F-AUTH-LOGIN-005: clicking GitHub calls signInWithOAuth with provider=github and /auth/callback redirectTo", async () => {
    mockClient.auth.signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: GITHUB_RE }));

    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = (mockClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(arg.provider).toBe("github");
    expect(arg.options.redirectTo).toMatch(CALLBACK_PATH_RE);
  });

  it("F-AUTH-LOGIN-006: clicking Google calls signInWithOAuth with provider=google and /auth/callback redirectTo", async () => {
    mockClient.auth.signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: GOOGLE_RE }));

    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = (mockClient.auth.signInWithOAuth as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(arg.provider).toBe("google");
    expect(arg.options.redirectTo).toMatch(CALLBACK_PATH_RE);
  });

  it("F-AUTH-LOGIN-007: OTP error keeps email form visible and re-enables inputs", async () => {
    mockClient.auth.signInWithOtp = vi
      .fn()
      .mockResolvedValue({ error: { message: "rate limited" } });

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // OTP confirmation screen does NOT appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Continue" })
      ).not.toBeDisabled();
    });
    expect(
      screen.queryByText((content) =>
        content.includes("We sent a magic link to")
      )
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: GITHUB_RE })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: GOOGLE_RE })).not.toBeDisabled();
  });

  it("F-AUTH-LOGIN-008: OAuth error re-enables GitHub and Google buttons", async () => {
    mockClient.auth.signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ error: { message: "provider error" } });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: GITHUB_RE }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: GITHUB_RE })
      ).not.toBeDisabled();
    });
    expect(screen.getByRole("button", { name: GOOGLE_RE })).not.toBeDisabled();
  });
});
