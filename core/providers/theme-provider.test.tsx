import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: mockSetTheme,
  }),
}));

// Import after mock setup
import { ThemeProvider } from "./theme-provider";

describe("theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders its children unchanged", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hi</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId("child")).toHaveTextContent("hi");
  });

  it("does not toggle the theme when the 'd' key is pressed", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    );

    await user.keyboard("d");

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("does not toggle the theme when 'd' is pressed inside an input", async () => {
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
