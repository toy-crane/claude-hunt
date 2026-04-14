import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeaderMenu } from "./header-menu.tsx";

const ACCOUNT_MENU_LABEL = /open account menu/i;
const FALLBACK_ICON_LABEL = /account/i;

describe("<HeaderMenu />", () => {
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
});
