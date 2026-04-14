import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.fn();
const getUserMock = vi.fn();
const createClient = vi.fn();

const downscaleImage = vi.fn();

vi.mock("@shared/api/supabase/client.ts", () => ({
  createClient: () => createClient(),
}));

vi.mock("@shared/lib/image/index.ts", () => ({
  downscaleImage,
}));

const { uploadScreenshot } = await import("./upload-screenshot");

const MIME_ERROR_REGEX = /JPEG, PNG, or WebP/;
const USER_SCOPED_WEBP_PATH_REGEX = /^user-1\/.+\.webp$/;
const WEBP_EXTENSION_REGEX = /\.webp$/;

function makeFile(name = "shot.jpg", type = "image/jpeg", bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function installSupabase(options?: { uploadError?: { message: string } }) {
  uploadMock.mockReset();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  uploadMock.mockResolvedValue({ error: options?.uploadError ?? null });

  createClient.mockReset();
  createClient.mockReturnValue({
    auth: { getUser: getUserMock },
    storage: {
      from: vi.fn(() => ({ upload: uploadMock })),
    },
  });
}

describe("uploadScreenshot", () => {
  beforeEach(() => {
    downscaleImage.mockReset();
    installSupabase();
  });

  it("returns the MIME error and never calls storage.upload for .gif files", async () => {
    const result = await uploadScreenshot(makeFile("shot.gif", "image/gif"));

    expect(result.error).toMatch(MIME_ERROR_REGEX);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(downscaleImage).not.toHaveBeenCalled();
  });

  it("returns the size error and never calls storage.upload for oversize files", async () => {
    const result = await uploadScreenshot(
      makeFile("big.png", "image/png", 26 * 1024 * 1024)
    );

    expect(result.error).toBe("File must be 25 MB or smaller");
    expect(uploadMock).not.toHaveBeenCalled();
    expect(downscaleImage).not.toHaveBeenCalled();
  });

  it("returns the decode-failure error and never calls storage.upload when downscale fails", async () => {
    downscaleImage.mockResolvedValue({
      ok: false,
      error: "Could not process this image. Try a different file.",
    });

    const result = await uploadScreenshot(makeFile());

    expect(result.error).toBe(
      "Could not process this image. Try a different file."
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uploads the downscaled WebP file once on the happy path and returns a .webp path", async () => {
    const downscaled = new File([new Uint8Array(512)], "shot.webp", {
      type: "image/webp",
    });
    downscaleImage.mockResolvedValue({ ok: true, file: downscaled });

    const result = await uploadScreenshot(makeFile("shot.jpg", "image/jpeg"));

    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(USER_SCOPED_WEBP_PATH_REGEX);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [uploadedPath, uploadedFile, uploadOptions] =
      uploadMock.mock.calls[0];
    expect(uploadedPath).toMatch(WEBP_EXTENSION_REGEX);
    expect(uploadedFile).toBe(downscaled);
    expect(uploadOptions).toMatchObject({
      contentType: "image/webp",
      upsert: false,
    });
  });

  it("propagates the storage error message when upload fails", async () => {
    const downscaled = new File([new Uint8Array(512)], "shot.webp", {
      type: "image/webp",
    });
    downscaleImage.mockResolvedValue({ ok: true, file: downscaled });
    installSupabase({ uploadError: { message: "storage quota exceeded" } });

    const result = await uploadScreenshot(makeFile());

    expect(result.error).toBe("storage quota exceeded");
    expect(result.path).toBeUndefined();
  });
});
