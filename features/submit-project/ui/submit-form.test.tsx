import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadScreenshot = vi.fn();
const submitProject = vi.fn();

vi.mock("@shared/lib/screenshot-upload", () => ({
  uploadScreenshot,
}));
vi.mock("../api/actions.ts", () => ({
  submitProject,
}));

const { SubmitForm } = await import("./submit-form");

function makePng(name = "shot.png", size = 1024) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  const title = screen.getByLabelText("제목") as HTMLInputElement;
  const tagline = screen.getByLabelText("한 줄 소개") as HTMLTextAreaElement;
  const url = screen.getByLabelText("프로젝트 URL") as HTMLInputElement;
  const file = screen.getByLabelText("스크린샷") as HTMLInputElement;
  fireEvent.change(title, { target: { value: "My App" } });
  fireEvent.change(tagline, { target: { value: "A cool tool" } });
  fireEvent.change(url, { target: { value: "https://myapp.com" } });
  await user.upload(file, makePng());
  fireEvent.submit(title.form as HTMLFormElement);
}

describe("SubmitForm", () => {
  beforeEach(() => {
    uploadScreenshot.mockReset();
    submitProject.mockReset();
  });

  it("renders an enabled Submit button when cohortId is set", () => {
    // The onboarding gate (middleware + /onboarding) guarantees cohortId
    // is non-null when this form renders.
    render(<SubmitForm cohortId="cohort-1" />);

    expect(
      screen.queryByTestId("submit-form-cohort-warning")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로젝트 제출" })).toBeEnabled();
  });

  it("uploads the screenshot then calls the server action on valid submit", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/shot.png" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });

    render(<SubmitForm cohortId="cohort-1" />);
    await fillAndSubmit();

    await vi.waitFor(() => {
      expect(submitProject).toHaveBeenCalledWith({
        title: "My App",
        tagline: "A cool tool",
        projectUrl: "https://myapp.com",
        screenshotPath: "user-1/shot.png",
      });
    });
    expect(uploadScreenshot).toHaveBeenCalledTimes(1);
  });

  it("calls onSuccess exactly once after a successful submission", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/shot.png" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });
    const onSuccess = vi.fn();

    render(<SubmitForm cohortId="cohort-1" onSuccess={onSuccess} />);
    await fillAndSubmit();

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("does not render an inline 'Project submitted!' success text", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/shot.png" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });

    const onSuccess = vi.fn();
    render(<SubmitForm cohortId="cohort-1" onSuccess={onSuccess} />);
    await fillAndSubmit();

    await vi.waitFor(() => {
      expect(submitProject).toHaveBeenCalled();
    });
    expect(
      screen.queryByText("프로젝트가 제출되었어요.")
    ).not.toBeInTheDocument();
  });

  it("does not call onSuccess when the server action returns ok: false", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/shot.png" });
    submitProject.mockResolvedValue({
      ok: false,
      error: "Could not submit project",
    });
    const onSuccess = vi.fn();

    render(<SubmitForm cohortId="cohort-1" onSuccess={onSuccess} />);
    await fillAndSubmit();

    expect(
      await screen.findByTestId("submit-form-submit-error")
    ).toHaveTextContent("Could not submit project");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("surfaces an upload error without calling the server action", async () => {
    uploadScreenshot.mockResolvedValue({
      error: "File must be 25 MB or smaller",
    });
    const onSuccess = vi.fn();

    render(<SubmitForm cohortId="cohort-1" onSuccess={onSuccess} />);
    await fillAndSubmit();

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("File must be 25 MB or smaller");
    expect(submitProject).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("surfaces the decode-failure error without calling the server action", async () => {
    uploadScreenshot.mockResolvedValue({
      error: "Could not process this image. Try a different file.",
    });

    render(<SubmitForm cohortId="cohort-1" />);
    await fillAndSubmit();

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("Could not process this image. Try a different file.");
    expect(submitProject).not.toHaveBeenCalled();
  });

  it("lets the user retry after a decode failure without a page refresh", async () => {
    uploadScreenshot
      .mockResolvedValueOnce({
        error: "Could not process this image. Try a different file.",
      })
      .mockResolvedValueOnce({ path: "user-1/retry.webp" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p-retry" });

    render(<SubmitForm cohortId="cohort-1" />);

    await fillAndSubmit();
    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("Could not process this image");
    expect(submitProject).not.toHaveBeenCalled();

    const form = (screen.getByLabelText("제목") as HTMLInputElement).form;
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await vi.waitFor(() => {
      expect(submitProject).toHaveBeenCalledWith({
        title: "My App",
        tagline: "A cool tool",
        projectUrl: "https://myapp.com",
        screenshotPath: "user-1/retry.webp",
      });
    });
    expect(uploadScreenshot).toHaveBeenCalledTimes(2);
  });

  it("preserves title, tagline, and URL values after a size rejection", async () => {
    uploadScreenshot.mockResolvedValue({
      error: "File must be 25 MB or smaller",
    });

    render(<SubmitForm cohortId="cohort-1" />);
    await fillAndSubmit();

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("25 MB");

    expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe(
      "My App"
    );
    expect(
      (screen.getByLabelText("한 줄 소개") as HTMLTextAreaElement).value
    ).toBe("A cool tool");
    expect(
      (screen.getByLabelText("프로젝트 URL") as HTMLInputElement).value
    ).toBe("https://myapp.com");
  });
});
