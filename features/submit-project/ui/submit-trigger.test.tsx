import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmitTrigger } from "./submit-trigger";

describe("<SubmitTrigger />", () => {
  it("links to /projects/new when the viewer is authenticated", () => {
    render(<SubmitTrigger isAuthenticated={true} />);
    const link = screen.getByTestId("submit-project-trigger");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/projects/new");
  });

  it("links to /login when the viewer is anonymous", () => {
    render(<SubmitTrigger isAuthenticated={false} />);
    const link = screen.getByTestId("submit-project-trigger");
    expect(link).toHaveAttribute("href", "/login");
  });
});
