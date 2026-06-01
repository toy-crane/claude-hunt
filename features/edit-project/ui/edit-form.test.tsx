import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const editProject = vi.fn();
vi.mock("../api/actions", () => ({
  editProject,
}));

const uploadScreenshot = vi.fn();
vi.mock("@shared/lib/screenshot-upload", () => ({
  uploadScreenshot,
}));

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

const routerPush = vi.fn();
const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub ImageSlots so we don't have to drive the real DnD UI — the
// edit form seeds existing images at mount time, which is enough for
// the submit path under test.
vi.mock("@features/upload-project-images", () => ({
  ImageSlots: ({
    value,
  }: {
    value: { id: string; file: File; preview: string }[];
  }) => <div data-image-count={value.length} data-testid="image-slots-stub" />,
}));

const { EditForm } = await import("./edit-form");

const SAVE_LABEL = /저장/;
const LABEL_DESCRIPTION = /프로젝트 설명/;

const initial = {
  description: null,
  githubUrl: null,
  imagePaths: ["user-1/a.webp"],
  imageUrls: ["https://example.com/a.webp"],
  projectId: "p1",
  projectUrl: "https://myapp.com",
  tagline: "A cool tool",
  title: "My App",
};

describe("<EditForm />", () => {
  beforeEach(() => {
    editProject.mockReset();
    routerPush.mockReset();
    routerRefresh.mockReset();
  });

  it("shows a Spinner on the Save button while pending and keeps the static label", async () => {
    editProject.mockImplementation(
      () => new Promise<{ ok: true; projectId: string }>(() => undefined)
    );

    render(<EditForm initial={initial} />);
    const form = screen
      .getByRole("button", { name: SAVE_LABEL })
      .closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: SAVE_LABEL });
      expect(button).toBeDisabled();
      expect(button.querySelector('[role="status"]')).toBeInTheDocument();
      expect(button.textContent).toContain("저장");
      expect(button.textContent).not.toContain("저장 중");
    });
  });

  it("renders a single-line tagline input and the description textarea seeded with its value", () => {
    render(<EditForm initial={{ ...initial, description: "기존 설명" }} />);
    expect(screen.getByLabelText("한 줄 소개").tagName).toBe("INPUT");
    const description = screen.getByLabelText(
      LABEL_DESCRIPTION
    ) as HTMLTextAreaElement;
    expect(description.tagName).toBe("TEXTAREA");
    expect(description.value).toBe("기존 설명");
  });

  it("sends the edited description to the server action", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/a.webp" });
    editProject.mockResolvedValue({ ok: true });

    render(<EditForm initial={{ ...initial, description: "기존 설명" }} />);
    fireEvent.change(screen.getByLabelText(LABEL_DESCRIPTION), {
      target: { value: "새 설명" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: SAVE_LABEL })
        .closest("form") as HTMLFormElement
    );

    await waitFor(() => {
      expect(editProject).toHaveBeenCalledWith(
        expect.objectContaining({ description: "새 설명" })
      );
    });
  });

  it("shows an inline error under the title field when it is cleared", async () => {
    render(<EditForm initial={initial} />);
    const title = screen.getByLabelText("제목") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "" } });
    fireEvent.submit(title.form as HTMLFormElement);

    expect(
      await screen.findByTestId("edit-form-error-title")
    ).toHaveTextContent("제목을 입력해 주세요.");
    expect(editProject).not.toHaveBeenCalled();
  });

  it("clears a field error once the user edits the field", async () => {
    render(<EditForm initial={initial} />);
    const title = screen.getByLabelText("제목") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "" } });
    fireEvent.submit(title.form as HTMLFormElement);

    expect(
      await screen.findByTestId("edit-form-error-title")
    ).toHaveTextContent("제목을 입력해 주세요.");

    fireEvent.change(title, { target: { value: "New title" } });
    expect(screen.queryByTestId("edit-form-error-title")).toBeNull();
  });
});
