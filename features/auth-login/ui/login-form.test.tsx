import { createMockSupabaseClient } from "@shared/lib/test-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "./login-form";

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const GITHUB_RE = /GitHub/i;
const GOOGLE_RE = /Google/i;
const SENDING_RE = /보내는 중/;
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

  it("shows the claude-hunt logo and not the legacy 'Claude Hunt' text", () => {
    const { container } = render(<LoginForm />);
    // New CLI-style wordmark is present
    expect(screen.getByText("claude-hunt")).toBeInTheDocument();
    // Legacy exact-case title-case string must be gone
    expect(container.textContent).not.toContain("Claude Hunt");
  });

  it("exposes the logo as a link to / with aria-label 'claude-hunt 홈'", () => {
    render(<LoginForm />);
    const link = screen.getByRole("link", { name: "claude-hunt 홈" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("animates the login logo cursor", () => {
    render(<LoginForm />);
    const cursor = screen.getByText("_");
    expect(cursor.style.animationName).toBe("logo-cursor-blink");
    expect(cursor.style.animationDuration).toBe("1s");
  });

  it("renders exactly one h1 with the Korean heading", () => {
    const { container } = render(<LoginForm />);
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("로그인");
  });

  it("renders the Korean subtitle after the h1", () => {
    const { container } = render(<LoginForm />);
    const heading = screen.getByRole("heading", { level: 1 });
    const subtitle = screen.getByText("자유롭게 프로젝트를 공유해 보세요");
    const all = Array.from(container.querySelectorAll("*"));
    expect(all.indexOf(subtitle)).toBeGreaterThan(all.indexOf(heading));
  });

  it("renders the shared page-shell classes (unified with /onboarding)", () => {
    const { container } = render(<LoginForm />);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    for (const cls of [
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "bg-zinc-50",
      "px-4",
      "py-16",
      "md:py-32",
      "dark:bg-transparent",
    ]) {
      expect(section?.className).toContain(cls);
    }
  });

  it("has exactly one claude-hunt Logo on /login (single source of header truth)", () => {
    render(<LoginForm />);
    const logos = screen.getAllByRole("link", { name: "claude-hunt 홈" });
    expect(logos).toHaveLength(1);
  });

  it("shows OTP sent confirmation after entering email and clicking Continue", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("이메일");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "계속하기" }));

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("매직 링크를 보냈어요"))
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("test@example.com", { exact: false })
    ).toBeInTheDocument();
  });

  it("Try another email resets the form", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Get to OTP sent state
    const emailInput = screen.getByLabelText("이메일");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "계속하기" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "다른 이메일로 시도" })
      ).toBeInTheDocument();
    });

    // Click "Try another email"
    await user.click(
      screen.getByRole("button", { name: "다른 이메일로 시도" })
    );

    // Email input reappears with empty value
    const newEmailInput = screen.getByLabelText("이메일");
    expect(newEmailInput).toHaveValue("");

    // OTP message gone
    expect(
      screen.queryByText((content) => content.includes("매직 링크를 보냈어요"))
    ).not.toBeInTheDocument();
  });

  it("all interactive elements disabled during loading", async () => {
    mockClient.auth.signInWithOtp = vi.fn().mockReturnValue(neverResolve());

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("이메일");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "계속하기" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: GITHUB_RE })).toBeDisabled();
      expect(screen.getByRole("button", { name: GOOGLE_RE })).toBeDisabled();
      expect(screen.getByLabelText("이메일")).toBeDisabled();
      expect(screen.getByRole("button", { name: SENDING_RE })).toBeDisabled();
    });
  });

  it("Continue button shows 'Sending...' during loading", async () => {
    mockClient.auth.signInWithOtp = vi.fn().mockReturnValue(neverResolve());

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("이메일");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "계속하기" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "보내는 중..." })
      ).toBeInTheDocument();
    });
  });

  it("clicking GitHub calls signInWithOAuth with provider=github and /auth/callback redirectTo", async () => {
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

  it("clicking Google calls signInWithOAuth with provider=google and /auth/callback redirectTo", async () => {
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

  it("OTP error keeps email form visible and re-enables inputs", async () => {
    mockClient.auth.signInWithOtp = vi
      .fn()
      .mockResolvedValue({ error: { message: "rate limited" } });

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("이메일");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "계속하기" }));

    // OTP confirmation screen does NOT appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "계속하기" })
      ).not.toBeDisabled();
    });
    expect(
      screen.queryByText((content) => content.includes("매직 링크를 보냈어요"))
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("이메일")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: GITHUB_RE })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: GOOGLE_RE })).not.toBeDisabled();
  });

  it("OAuth error re-enables GitHub and Google buttons", async () => {
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
