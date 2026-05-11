import { vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@shared/api/supabase/anon-server", () => ({
  createAnonServerClient: () => ({
    from: vi.fn(() => ({
      select: selectMock,
    })),
  }),
}));

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes an entry for every static public path", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    const sitemap = (await import("./sitemap")).default;

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://www.claude-hunt.com/",
        "https://www.claude-hunt.com/projects",
        "https://www.claude-hunt.com/privacy",
        "https://www.claude-hunt.com/terms",
      ])
    );
  });

  it("adds one entry per project with its updated_at as lastModified", async () => {
    selectMock.mockResolvedValue({
      data: [
        { id: "p1", updated_at: "2026-05-01T00:00:00Z" },
        { id: "p2", updated_at: "2026-05-10T12:34:56Z" },
      ],
      error: null,
    });
    const sitemap = (await import("./sitemap")).default;

    const entries = await sitemap();
    const p1 = entries.find(
      (entry) => entry.url === "https://www.claude-hunt.com/projects/p1"
    );
    const p2 = entries.find(
      (entry) => entry.url === "https://www.claude-hunt.com/projects/p2"
    );

    expect(p1?.lastModified).toEqual(new Date("2026-05-01T00:00:00Z"));
    expect(p2?.lastModified).toEqual(new Date("2026-05-10T12:34:56Z"));
  });

  it("falls back to only the static entries when the project query errors", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const sitemap = (await import("./sitemap")).default;

    const entries = await sitemap();

    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => !entry.url.includes("/projects/"))).toBe(
      true
    );
  });
});
