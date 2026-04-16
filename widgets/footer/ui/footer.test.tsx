import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./footer";

const COPYRIGHT_TEXT = /© 2026 claude-hunt/i;
const GITHUB_LABEL = /github/i;
const FEEDBACK_LABEL = /feedback/i;
const CREATOR_LABEL = /^toycrane$/i;
const TERMS_LABEL = /^이용약관$/;
const PRIVACY_LABEL = /^개인정보 처리방침$/;
const BUILT_BY_TEXT = /built by/i;
const NOOPENER = /noopener/;
const NOREFERRER = /noreferrer/;
const GITHUB_URL = "https://github.com/toy-crane/claude-hunt";
const FEEDBACK_URL = "https://github.com/toy-crane/claude-hunt/issues/new";
const CREATOR_URL = "https://toycrane.xyz";

describe("<Footer />", () => {
  it("renders a footer landmark with the © 2026 claude-hunt copyright", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(COPYRIGHT_TEXT)).toBeInTheDocument();
  });

  it("renders the GitHub link pointing at the repository", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: GITHUB_LABEL });
    expect(link).toHaveAttribute("href", GITHUB_URL);
  });

  it("renders the Feedback link pointing at the new-issue page", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: FEEDBACK_LABEL });
    expect(link).toHaveAttribute("href", FEEDBACK_URL);
  });

  it("renders 'Built by toycrane' with the name linking to toycrane.xyz", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(BUILT_BY_TEXT)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: CREATOR_LABEL });
    expect(link).toHaveAttribute("href", CREATOR_URL);
  });

  it("opens every external link in a new tab with safe rel attributes", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    const externalLinks = within(footer)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("http"));

    expect(externalLinks.length).toBeGreaterThanOrEqual(3);
    for (const link of externalLinks) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel") ?? "").toMatch(NOOPENER);
      expect(link.getAttribute("rel") ?? "").toMatch(NOREFERRER);
    }
  });

  it("renders an internal link to /terms labelled 이용약관", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: TERMS_LABEL });
    expect(link).toHaveAttribute("href", "/terms");
    expect(link).not.toHaveAttribute("target", "_blank");
  });

  it("renders an internal link to /privacy labelled 개인정보 처리방침", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: PRIVACY_LABEL });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).not.toHaveAttribute("target", "_blank");
  });

  it("renders a Separator on the top edge instead of a raw border-t class", () => {
    const { container } = render(<Footer />);

    expect(
      container.querySelector('[data-slot="separator"]')
    ).toBeInTheDocument();
    expect(container.querySelector(".border-t")).not.toBeInTheDocument();
  });
});
