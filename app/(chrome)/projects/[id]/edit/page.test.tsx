import { render, screen } from "@testing-library/react";
import type { ProjectDetail } from "@widgets/project-detail";
import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIRECT_LOGIN = /REDIRECT:\/login/;
const NOT_FOUND_THROW = /NOT_FOUND/;
const BACK_TO_SETTINGS_LABEL = /설정으로 돌아가기/;

const redirectMock = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const fetchViewerMock = vi.fn();
vi.mock("@shared/api/supabase/viewer", () => ({
  fetchViewer: fetchViewerMock,
}));

const fetchProjectDetailMock = vi.fn();
vi.mock("@widgets/project-detail", () => ({
  fetchProjectDetail: fetchProjectDetailMock,
}));

interface EditFormProps {
  backHref?: string;
  initial: {
    githubUrl: string | null;
    imagePaths: string[];
    imageUrls: string[];
    projectId: string;
    projectUrl: string;
    tagline: string;
    title: string;
  };
}
const editFormMock = vi.fn((_props: EditFormProps) => (
  <div data-testid="edit-form-stub" />
));
vi.mock("@features/edit-project", () => ({
  EditForm: (props: EditFormProps) => editFormMock(props),
}));

function makeProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "proj-1",
    user_id: "owner-1",
    cohort_id: null,
    cohort_label: null,
    cohort_name: null,
    title: "My App",
    tagline: "A cool tool",
    description: null,
    project_url: "https://myapp.com",
    github_url: null,
    images: [{ path: "owner-1/shot.png" }],
    imageUrls: ["https://cdn.example/shot.png"],
    primaryImageUrl: "https://cdn.example/shot.png",
    vote_count: 0,
    viewer_has_voted: false,
    author_display_name: "Owner",
    author_avatar_url: null,
    created_at: "2026-04-14T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    ...overrides,
  };
}

async function renderPage(id: string, searchParams: { from?: string } = {}) {
  const Page = (await import("./page")).default;
  const jsx = await Page({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(searchParams),
  });
  render(jsx);
}

beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  fetchViewerMock.mockReset();
  fetchProjectDetailMock.mockReset();
  editFormMock.mockClear();
});

describe("/projects/[id]/edit page", () => {
  it("redirects signed-out visitors to /login and does not look up the project", async () => {
    fetchViewerMock.mockResolvedValue(null);

    await expect(renderPage("proj-1")).rejects.toThrow(REDIRECT_LOGIN);
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(fetchProjectDetailMock).not.toHaveBeenCalled();
  });

  it("triggers notFound() when the project does not exist", async () => {
    fetchViewerMock.mockResolvedValue({ id: "viewer-1" });
    fetchProjectDetailMock.mockResolvedValue(null);

    await expect(renderPage("proj-1")).rejects.toThrow(NOT_FOUND_THROW);
    expect(notFoundMock).toHaveBeenCalled();
    expect(editFormMock).not.toHaveBeenCalled();
  });

  it("triggers notFound() for a non-owner viewer (least-info disclosure)", async () => {
    fetchViewerMock.mockResolvedValue({ id: "viewer-1" });
    fetchProjectDetailMock.mockResolvedValue(
      makeProject({ user_id: "someone-else" })
    );

    await expect(renderPage("proj-1")).rejects.toThrow(NOT_FOUND_THROW);
    expect(notFoundMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(editFormMock).not.toHaveBeenCalled();
  });

  it("renders EditForm with mapped initial values when the viewer owns the project", async () => {
    fetchViewerMock.mockResolvedValue({ id: "owner-1" });
    fetchProjectDetailMock.mockResolvedValue(
      makeProject({
        id: "proj-1",
        user_id: "owner-1",
        title: "Renamed",
        tagline: "Updated tagline",
        project_url: "https://renamed.example",
        github_url: "https://github.com/owner-1/renamed",
        images: [{ path: "owner-1/a.png" }, { path: "owner-1/b.png" }],
        imageUrls: ["https://cdn/a", "https://cdn/b"],
      })
    );

    await renderPage("proj-1");

    expect(screen.getByTestId("edit-form-stub")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(editFormMock).toHaveBeenCalledWith({
      backHref: "/projects/proj-1",
      initial: {
        projectId: "proj-1",
        title: "Renamed",
        tagline: "Updated tagline",
        projectUrl: "https://renamed.example",
        githubUrl: "https://github.com/owner-1/renamed",
        imageUrls: ["https://cdn/a", "https://cdn/b"],
        imagePaths: ["owner-1/a.png", "owner-1/b.png"],
      },
    });
  });

  it("uses /settings as the back href and 설정 link label when from=settings", async () => {
    fetchViewerMock.mockResolvedValue({ id: "owner-1" });
    fetchProjectDetailMock.mockResolvedValue(
      makeProject({ id: "proj-1", user_id: "owner-1" })
    );

    await renderPage("proj-1", { from: "settings" });

    expect(
      screen.getByRole("link", { name: BACK_TO_SETTINGS_LABEL })
    ).toHaveAttribute("href", "/settings");
    expect(editFormMock).toHaveBeenCalledWith(
      expect.objectContaining({ backHref: "/settings" })
    );
  });

  it("passes the awaited route param id through to fetchProjectDetail with the viewer id", async () => {
    fetchViewerMock.mockResolvedValue({ id: "owner-1" });
    fetchProjectDetailMock.mockResolvedValue(makeProject());

    await renderPage("proj-1");

    expect(fetchProjectDetailMock).toHaveBeenCalledWith("proj-1", "owner-1");
  });
});
