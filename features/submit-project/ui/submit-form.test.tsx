import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadScreenshot = vi.fn();
const submitProject = vi.fn();

vi.mock("../lib/upload-screenshot.ts", () => ({
  uploadScreenshot,
}));
vi.mock("../api/actions.ts", () => ({
  submitProject,
}));

const { SubmitForm } = await import("./submit-form.tsx");

function makePng(name = "shot.png", size = 1024) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  const title = screen.getByLabelText("Title") as HTMLInputElement;
  const tagline = screen.getByLabelText("Tagline") as HTMLTextAreaElement;
  const url = screen.getByLabelText("Project URL") as HTMLInputElement;
  const file = screen.getByLabelText("Screenshot") as HTMLInputElement;
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

  it("renders a cohort-less warning and disables submit when cohortId is null", () => {
    render(<SubmitForm cohortId={null} />);

    expect(
      screen.getByTestId("submit-form-cohort-warning")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit project" })
    ).toBeDisabled();
  });

  it("enables submit and hides the warning when cohortId is set", () => {
    render(<SubmitForm cohortId="cohort-1" />);

    expect(
      screen.queryByTestId("submit-form-cohort-warning")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit project" })
    ).toBeEnabled();
  });

  it("uploads the screenshot then calls the server action on valid submit", async () => {
    uploadScreenshot.mockResolvedValue({ path: "user-1/shot.png" });
    submitProject.mockResolvedValue({ ok: true, projectId: "p1" });

    render(<SubmitForm cohortId="cohort-1" />);
    await fillAndSubmit();

    expect(await screen.findByText("Project submitted!")).toBeInTheDocument();
    expect(uploadScreenshot).toHaveBeenCalledTimes(1);
    expect(submitProject).toHaveBeenCalledWith({
      title: "My App",
      tagline: "A cool tool",
      projectUrl: "https://myapp.com",
      screenshotPath: "user-1/shot.png",
    });
  });

  it("surfaces an upload error without calling the server action", async () => {
    uploadScreenshot.mockResolvedValue({
      error: "File must be 5 MB or smaller",
    });

    render(<SubmitForm cohortId="cohort-1" />);
    await fillAndSubmit();

    expect(
      await screen.findByTestId("submit-form-field-error")
    ).toHaveTextContent("5 MB");
    expect(submitProject).not.toHaveBeenCalled();
  });
});
