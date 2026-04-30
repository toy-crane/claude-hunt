import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadScreenshot = vi.fn();
const submitProject = vi.fn();
const routerPush = vi.fn();

vi.mock("@shared/lib/screenshot-upload", () => ({
  uploadScreenshot,
}));
vi.mock("../api/actions.ts", () => ({
  submitProject,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

// Stub ImageSlots: render a fake "add image" button so tests can put
// the form in any image-state without driving the real DnD UI. The
// stub also forwards the latest value via a data attribute so we can
// inspect it.
let nextSlotId = 0;
function makeFile(name = "shot.png") {
  return new File([new Uint8Array(8)], name, { type: "image/png" });
}
vi.mock("@features/upload-project-images", () => ({
  ImageSlots: ({
    value,
    onChange,
    onError,
  }: {
    value: { id: string; file: File; preview: string }[];
    onChange: (next: { id: string; file: File; preview: string }[]) => void;
    onError?: (msg: string) => void;
  }) => (
    <div data-image-count={value.length} data-testid="image-slots-stub">
      <button
        data-testid="image-slots-stub-add"
        onClick={() => {
          const slot = {
            id: `s-${++nextSlotId}`,
            file: makeFile(`shot-${nextSlotId}.png`),
            preview: `blob:${nextSlotId}`,
          };
          onChange([...value, slot]);
        }}
        type="button"
      >
        add
      </button>
      <button
        data-testid="image-slots-stub-error"
        onClick={() => onError?.("최대 5장까지 업로드할 수 있어요")}
        type="button"
      >
        trigger error
      </button>
    </div>
  ),
}));

const { SubmitForm } = await import("./submit-form");

const LABEL_TITLE = /제목/;
const LABEL_TAGLINE = /한 줄 소개/;
const LABEL_URL = /프로젝트 URL/;

function fillTextFields() {
  const title = screen.getByLabelText(LABEL_TITLE) as HTMLInputElement;
  const tagline = screen.getByLabelText(LABEL_TAGLINE) as HTMLTextAreaElement;
  const url = screen.getByLabelText(LABEL_URL) as HTMLInputElement;
  fireEvent.change(title, { target: { value: "My App" } });
  fireEvent.change(tagline, { target: { value: "A cool tool" } });
  fireEvent.change(url, { target: { value: "https://myapp.com" } });
  return title.form as HTMLFormElement;
}

function addOneImage() {
  fireEvent.click(screen.getByTestId("image-slots-stub-add"));
}

describe("SubmitForm", () => {
  beforeEach(() => {
    uploadScreenshot.mockReset();
    submitProject.mockReset();
    routerPush.mockReset();
    nextSlotId = 0;
  });

  it("renders an enabled Submit button when cohortId is set", () => {
    render(<SubmitForm cohortId="cohort-1" />);
    expect(screen.getByRole("button", { name: "프로젝트 제출" })).toBeEnabled();
  });

  it("rejects submit when no images are attached", async () => {
    render(<SubmitForm cohortId="cohort-1" />);
    const form = fillTextFields();
    fireEvent.submit(form);

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("스크린샷을 1장 이상");
    expect(uploadScreenshot).not.toHaveBeenCalled();
    expect(submitProject).not.toHaveBeenCalled();
  });

  it("uploads each attached image then calls the server action with the path array", async () => {
    uploadScreenshot
      .mockResolvedValueOnce({ path: "user-1/a.webp" })
      .mockResolvedValueOnce({ path: "user-1/b.webp" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });

    render(<SubmitForm cohortId="cohort-1" />);
    addOneImage();
    addOneImage();
    const form = fillTextFields();
    fireEvent.submit(form);

    await vi.waitFor(() => {
      expect(submitProject).toHaveBeenCalledWith({
        title: "My App",
        tagline: "A cool tool",
        projectUrl: "https://myapp.com",
        imagePaths: ["user-1/a.webp", "user-1/b.webp"],
      });
    });
    expect(uploadScreenshot).toHaveBeenCalledTimes(2);
  });

  it("redirects to the new project's detail page on success", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/a.webp" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });

    render(<SubmitForm cohortId="cohort-1" />);
    addOneImage();
    fireEvent.submit(fillTextFields());

    await vi.waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/projects/p1");
    });
  });

  it("does not redirect when the server action returns ok: false", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/a.webp" });
    submitProject.mockResolvedValue({
      ok: false,
      error: "Could not submit project",
    });

    render(<SubmitForm cohortId="cohort-1" />);
    addOneImage();
    fireEvent.submit(fillTextFields());

    expect(
      await screen.findByTestId("submit-form-submit-error")
    ).toHaveTextContent("Could not submit project");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("surfaces an upload error without calling the server action", async () => {
    uploadScreenshot.mockResolvedValue({
      error: "File must be 25 MB or smaller",
    });

    render(<SubmitForm cohortId="cohort-1" />);
    addOneImage();
    fireEvent.submit(fillTextFields());

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("25 MB");
    expect(submitProject).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("displays validation errors raised by the image-slots component", async () => {
    render(<SubmitForm cohortId="cohort-1" />);
    fireEvent.click(screen.getByTestId("image-slots-stub-error"));

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("최대 5장까지");
  });
});
