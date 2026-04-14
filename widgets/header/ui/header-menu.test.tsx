import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderMenu } from "./header-menu.tsx";

const ACCOUNT_MENU_LABEL = /open account menu/i;
const FALLBACK_ICON_LABEL = /account/i;
const THEME_LABEL = /^theme$/i;
const LIGHT_LABEL = /^light$/i;
const DARK_LABEL = /^dark$/i;
const SYSTEM_LABEL = /^system$/i;

const setThemeMock = vi.fn();
let currentTheme: string | undefined = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme: setThemeMock }),
}));

describe("<HeaderMenu />", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    currentTheme = "system";
  });

  it("renders an account menu trigger with an accessible label", () => {
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    expect(
      screen.getByRole("button", { name: ACCOUNT_MENU_LABEL })
    ).toBeInTheDocument();
  });

  it("shows the uppercase first character of the display name when no avatar image", () => {
    render(<HeaderMenu avatarUrl={null} displayName="alice" />);

    const fallback = screen.getByTestId("header-avatar-fallback");
    expect(fallback).toHaveTextContent("A");
  });

  it("shows the first character for multi-word display names", () => {
    render(<HeaderMenu avatarUrl={null} displayName="Bob Smith" />);

    const fallback = screen.getByTestId("header-avatar-fallback");
    expect(fallback).toHaveTextContent("B");
  });

  it("shows a generic user icon when display name is missing", () => {
    render(<HeaderMenu avatarUrl={null} displayName={null} />);

    expect(
      screen.getByLabelText(FALLBACK_ICON_LABEL, { selector: "svg" })
    ).toBeInTheDocument();
  });

  it("shows a generic user icon when display name is whitespace only", () => {
    render(<HeaderMenu avatarUrl={null} displayName="   " />);

    expect(
      screen.getByLabelText(FALLBACK_ICON_LABEL, { selector: "svg" })
    ).toBeInTheDocument();
  });

  it("opens a Theme section with Light, Dark, and System options", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));

    expect(screen.getByText(THEME_LABEL)).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: LIGHT_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: DARK_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: SYSTEM_LABEL })
    ).toBeInTheDocument();
  });

  it("marks the active theme with aria-checked=true", async () => {
    currentTheme = "dark";
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));

    const darkItem = screen.getByRole("menuitemradio", { name: DARK_LABEL });
    expect(darkItem).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("menuitemradio", { name: LIGHT_LABEL })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("calls setTheme with 'dark' when the Dark item is selected", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));
    await user.click(screen.getByRole("menuitemradio", { name: DARK_LABEL }));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with 'light' when the Light item is selected", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));
    await user.click(screen.getByRole("menuitemradio", { name: LIGHT_LABEL }));

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("calls setTheme with 'system' when the System item is selected", async () => {
    currentTheme = "dark";
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));
    await user.click(screen.getByRole("menuitemradio", { name: SYSTEM_LABEL }));

    expect(setThemeMock).toHaveBeenCalledWith("system");
  });

  it("closes the menu when the Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu avatarUrl={null} displayName="Alice" />);

    await user.click(screen.getByRole("button", { name: ACCOUNT_MENU_LABEL }));
    expect(screen.getByText(THEME_LABEL)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText(THEME_LABEL)).not.toBeInTheDocument();
  });
});
