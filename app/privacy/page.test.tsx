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
const DPO_EMAIL_TEXT = /alwaysfun2183@gmail\.com/;

const EXPECTED_SECTION_HEADINGS = [
  /^1\.\s*개인정보의 처리 목적$/,
  /^2\.\s*처리하는 개인정보 항목$/,
  /^3\.\s*개인정보의 처리 및 보유 기간$/,
  /^4\.\s*개인정보의 제3자 제공$/,
  /^5\.\s*개인정보 처리의 위탁$/,
  /^6\.\s*정보주체의 권리와 행사 방법$/,
  /^7\.\s*개인정보의 파기 절차 및 방법$/,
  /^8\.\s*개인정보의 안전성 확보 조치$/,
  /^9\.\s*자동으로 수집되는 개인정보 \(쿠키 등\)$/,
  /^10\.\s*개인정보 보호책임자$/,
  /^11\.\s*권익침해 구제방법$/,
  /^12\.\s*개인정보 처리방침의 변경$/,
];

const SECTION_2_KEYWORDS = [
  /이메일/,
  /OAuth 식별자/,
  /닉네임/,
  /프로필 이미지/,
  /소속 클래스/,
  /프로젝트/,
  /투표 기록/,
  /IP 주소/,
  /User-Agent/,
];

const SECTION_5_PROCESSORS = [/Supabase/, /Vercel/, /Google/, /GitHub/];
const SECTION_9_TOOLS = [
  /Supabase/,
  /Vercel Analytics/,
  /Vercel Speed Insights/,
];
const KISA_CHANNELS = [
  /개인정보분쟁조정위원회/,
  /개인정보침해신고센터/,
  /대검찰청/,
  /경찰청/,
];

const SECTION_3_PHRASE = /지체 없이/;
const SECTION_4_THIRD_PARTY = /제3자에게 제공하지 않/;
const SECTION_12_7_DAY = /7일/;
const SECTION_12_30_DAY = /30일/;
const SECTION_12_DATE = /2026-04-16/;
const DPO_NAME = /toycrane/;

const HEADING_2 = /^2\./;
const HEADING_3 = /^3\./;
const HEADING_4 = /^4\./;
const HEADING_5 = /^5\./;
const HEADING_9 = /^9\./;
const HEADING_10 = /^10\./;
const HEADING_11 = /^11\./;
const HEADING_12 = /^12\./;

describe("privacy page (/privacy)", () => {
  it("renders the document title as an h1", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "개인정보 처리방침", level: 1 })
    ).toBeInTheDocument();
  });

  it("exports metadata.title", async () => {
    const { metadata } = await import("./page");
    expect(metadata).toEqual(
      expect.objectContaining({ title: "개인정보 처리방침" })
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

  it("reuses Header and Footer widgets", async () => {
    await renderPage();
    expect(screen.getByTestId("site-header-stub")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer-stub")).toBeInTheDocument();
  });

  it("renders the 12 KISA-standard section headings in order", async () => {
    await renderPage();

    const article = screen.getByRole("article");
    const headings = within(article)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim() ?? "");

    for (const [index, pattern] of EXPECTED_SECTION_HEADINGS.entries()) {
      expect(headings[index], `heading ${index + 1}`).toMatch(pattern);
    }
  });

  it("section 2 lists every required personal-data item (using 클래스, not cohort)", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_2, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    for (const keyword of SECTION_2_KEYWORDS) {
      expect(
        within(clause).getAllByText(keyword).length,
        `keyword ${keyword}`
      ).toBeGreaterThan(0);
    }
  });

  it("section 3 states deletion is without delay (지체 없이)", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_3, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(SECTION_3_PHRASE)).toBeInTheDocument();
  });

  it("section 4 states no third-party provision", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_4, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(SECTION_4_THIRD_PARTY)).toBeInTheDocument();
  });

  it("section 5 lists all four processors", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_5, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    for (const processor of SECTION_5_PROCESSORS) {
      expect(within(clause).getByText(processor)).toBeInTheDocument();
    }
  });

  it("section 9 discloses the auth session cookie + Vercel Analytics + Speed Insights", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_9, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    for (const tool of SECTION_9_TOOLS) {
      expect(within(clause).getByText(tool)).toBeInTheDocument();
    }
  });

  it("section 10 (DPO) shows toycrane and the contact email", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_10, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(DPO_NAME)).toBeInTheDocument();
    expect(within(clause).getByText(DPO_EMAIL_TEXT)).toBeInTheDocument();
  });

  it("section 11 lists all standard KISA remedy channels", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_11, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    for (const channel of KISA_CHANNELS) {
      expect(within(clause).getByText(channel)).toBeInTheDocument();
    }
  });

  it("section 12 states 7-day notice, 30-day adverse-change notice, and effective date", async () => {
    await renderPage();

    const clause = screen
      .getByRole("heading", { name: HEADING_12, level: 2 })
      .closest("section");
    expect(clause).not.toBeNull();
    if (!clause) {
      return;
    }
    expect(within(clause).getByText(SECTION_12_7_DAY)).toBeInTheDocument();
    expect(within(clause).getByText(SECTION_12_30_DAY)).toBeInTheDocument();
    expect(within(clause).getByText(SECTION_12_DATE)).toBeInTheDocument();
  });
});
