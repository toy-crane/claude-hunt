import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@widgets/header", () => ({
  Header: () => <div data-testid="site-header-stub" />,
}));

vi.mock("@widgets/footer", () => ({
  Footer: () => <div data-testid="site-footer-stub" />,
}));

async function renderPage() {
  const { default: Page } = await import("./page");
  render(<Page />);
}

const EFFECTIVE_DATE_TEXT = /시행일:\s*2026년\s*4월\s*16일/;
const BACK_LINK_LABEL = /홈으로/;
const CONTACT_EMAIL_TEXT = /alwaysfun2183@gmail\.com/;
const CLAUSE_13_TITLE = /제13조/;
const CLAUSE_14_TITLE = /제14조/;
const KR_LAW_TEXT = /대한민국/;
const SEOUL_COURT_TEXT = /서울중앙지방법원/;
const CLAUSE_14_SENTENCE = /본 약관은 2026년 4월 16일부터 시행됩니다\./;

const EXPECTED_SECTION_HEADINGS = [
  /^제1조 \(목적\)$/,
  /^제2조 \(용어의 정의\)$/,
  /^제3조 \(약관의 게시와 개정\)$/,
  /^제4조 \(이용계약의 체결\)$/,
  /^제5조 \(회원 정보의 관리\)$/,
  /^제6조 \(운영자의 의무\)$/,
  /^제7조 \(회원의 의무\)$/,
  /^제8조 \(서비스의 제공 및 변경\)$/,
  /^제9조 \(서비스 이용의 제한\)$/,
  /^제10조 \(게시물의 관리 및 권리\)$/,
  /^제11조 \(면책조항\)$/,
  /^제12조 \(계약 해지\)$/,
  /^제13조 \(준거법 및 관할\)$/,
  /^제14조 \(시행일\)$/,
];

describe("terms page (/terms)", () => {
  it("renders the document title as an h1", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "서비스 이용약관", level: 1 })
    ).toBeInTheDocument();
  });

  it("exports metadata.title so the browser tab reads the clause name", async () => {
    const { metadata } = await import("./page");
    expect(metadata).toEqual(
      expect.objectContaining({ title: "서비스 이용약관" })
    );
  });

  it("shows the effective date 2026년 4월 16일", async () => {
    await renderPage();

    expect(screen.getByText(EFFECTIVE_DATE_TEXT)).toBeInTheDocument();
  });

  it("renders a back link pointing to /", async () => {
    await renderPage();

    const back = screen.getByRole("link", { name: BACK_LINK_LABEL });
    expect(back).toHaveAttribute("href", "/");
  });

  it("shows the contact email in the footer contact block", async () => {
    await renderPage();

    expect(screen.getByText(CONTACT_EMAIL_TEXT)).toBeInTheDocument();
  });

  it("renders the 14 numbered clause headings in order", async () => {
    await renderPage();

    const article = screen.getByRole("article");
    const headings = within(article)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim() ?? "");

    for (const [index, pattern] of EXPECTED_SECTION_HEADINGS.entries()) {
      expect(headings[index], `heading ${index + 1}`).toMatch(pattern);
    }
  });

  it("clause 13 (준거법 및 관할) names Korean law and the Seoul Central District Court", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: CLAUSE_13_TITLE, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(KR_LAW_TEXT)).toBeInTheDocument();
    expect(within(clause).getByText(SEOUL_COURT_TEXT)).toBeInTheDocument();
  });

  it("clause 14 (시행일) states the exact effective date sentence", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: CLAUSE_14_TITLE, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(CLAUSE_14_SENTENCE)).toBeInTheDocument();
  });

  it("reuses the site Header and Footer widgets", async () => {
    await renderPage();

    expect(screen.getByTestId("site-header-stub")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer-stub")).toBeInTheDocument();
  });
});
