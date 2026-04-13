import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { createMockSupabaseClient } from "@/__tests__/helpers.tsx";
import { LoginForm } from "@/components/login-form.tsx";

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

function neverResolve() {
  // Intentionally never resolves to keep loading state active
  return new Promise<never>(() => undefined);
}

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.auth.signInWithOtp = vi.fn().mockResolvedValue({ error: null });
  });

  it("LOGIN-001: shows OTP sent confirmation after entering email and clicking Continue", async () => {
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

  it("LOGIN-002: Try another email resets the form", async () => {
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

  it("LOGIN-003: all interactive elements disabled during loading", async () => {
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

  it("LOGIN-004: Continue button shows 'Sending...' during loading", async () => {
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
});
