import type { ProjectDetail } from "@widgets/project-detail";
import { vi } from "vitest";

const fetchProjectDetailMock = vi.fn();

vi.mock("@widgets/project-detail", () => ({
  fetchProjectDetail: fetchProjectDetailMock,
  Hero: () => null,
}));

vi.mock("@widgets/comment-list", () => ({
  fetchCommentThreads: vi.fn(),
  CommentList: () => null,
}));

vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: vi.fn().mockResolvedValue(null),
}));

const sampleProject: ProjectDetail = {
  id: "abc-123",
  title: "샘플 프로젝트",
  tagline: "한 줄 설명",
  project_url: "https://example.com",
  github_url: null,
  cohort_id: null,
  cohort_label: null,
  cohort_name: null,
  user_id: "user-1",
  author_avatar_url: null,
  author_display_name: "토이크레인",
  images: [],
  screenshotUrls: ["https://cdn.example.com/img.png"],
  primaryScreenshotUrl: "https://cdn.example.com/img.png",
  vote_count: 0,
  viewer_has_voted: false,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-15T00:00:00Z",
};

describe("buildProjectJsonLd", () => {
  it("emits CreativeWork and BreadcrumbList nodes in @graph", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const data = buildProjectJsonLd(sampleProject);
    const types = data["@graph"].map((node) => node["@type"]);
    expect(types).toEqual(["CreativeWork", "BreadcrumbList"]);
  });

  it("uses the production origin for absolute URL fields", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const json = JSON.stringify(buildProjectJsonLd(sampleProject));
    expect(json).toContain("https://www.claude-hunt.com/projects/abc-123");
    expect(json).not.toContain("localhost");
  });

  it("includes author when display name is present", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const data = buildProjectJsonLd(sampleProject);
    expect(data["@graph"][0]).toMatchObject({
      author: { "@type": "Person", name: "토이크레인" },
    });
  });

  it("omits author when display name is null", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const data = buildProjectJsonLd({
      ...sampleProject,
      author_display_name: null,
    });
    expect(data["@graph"][0]).not.toHaveProperty("author");
  });

  it("omits image when primaryScreenshotUrl is empty", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const data = buildProjectJsonLd({
      ...sampleProject,
      primaryScreenshotUrl: "",
    });
    expect(data["@graph"][0]).not.toHaveProperty("image");
  });

  it("places site root as the first breadcrumb item", async () => {
    const { buildProjectJsonLd } = await import("./page");
    const data = buildProjectJsonLd(sampleProject);
    expect(data["@graph"][1]).toMatchObject({
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "클로드 헌트",
          item: "https://www.claude-hunt.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: sampleProject.title,
        },
      ],
    });
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("declares a self-referencing canonical for a found project", async () => {
    fetchProjectDetailMock.mockResolvedValue(sampleProject);
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "abc-123" }),
    });
    expect(metadata.alternates?.canonical).toBe("/projects/abc-123");
  });

  it("uses an absolute title with the brand suffix and no cohort", async () => {
    fetchProjectDetailMock.mockResolvedValue({
      ...sampleProject,
      cohort_label: "LG전자 4기",
    });
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "abc-123" }),
    });
    expect(metadata.title).toEqual({
      absolute: "샘플 프로젝트 — 클로드 헌트",
    });
  });

  it("mirrors the document title in openGraph.title and twitter.title", async () => {
    fetchProjectDetailMock.mockResolvedValue(sampleProject);
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "abc-123" }),
    });
    expect(metadata.openGraph?.title).toBe("샘플 프로젝트 — 클로드 헌트");
    const twitter = metadata.twitter as { title?: string };
    expect(twitter.title).toBe("샘플 프로젝트 — 클로드 헌트");
  });
});
