import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsForm } from "./settings-form.tsx";

const READ_ONLY_LABEL = /read-only/i;
const SAVE_LABEL = /save/i;

describe("<SettingsForm />", () => {
  it("pre-fills the display-name input with the current value", () => {
    render(
      <SettingsForm email="alice@example.com" initialDisplayName="Alice" />
    );

    const input = screen.getByLabelText("Display name") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("renders the email input disabled and labelled read-only", () => {
    render(
      <SettingsForm email="alice@example.com" initialDisplayName="Alice" />
    );

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email).toBeDisabled();
    expect(email.value).toBe("alice@example.com");
    expect(screen.getByText(READ_ONLY_LABEL)).toBeInTheDocument();
  });

  it("has no Save control attached to the email field", () => {
    render(
      <SettingsForm email="alice@example.com" initialDisplayName="Alice" />
    );

    // The only Save button should sit in the display-name Field, not
    // the Email Field.
    const saveButtons = screen.getAllByRole("button", { name: SAVE_LABEL });
    expect(saveButtons).toHaveLength(1);
  });
});
