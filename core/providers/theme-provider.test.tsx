import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockSetTheme = vi.fn();
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

// Import after mock setup
import { ThemeProvider } from "./theme-provider.tsx";

describe("theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedTheme = "light";
  });

  it("pressing 'd' toggles theme from light to dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    );

    await user.keyboard("d");

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("pressing 'd' toggles theme from dark to light", async () => {
    mockResolvedTheme = "dark";
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    );

    await user.keyboard("d");

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("pressing 'd' in a focused input does not toggle theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <input data-testid="test-input" />
      </ThemeProvider>
    );

    const input = screen.getByTestId("test-input");
    await user.click(input);
    await user.keyboard("d");

    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
