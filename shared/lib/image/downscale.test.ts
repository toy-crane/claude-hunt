import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downscaleImage } from "./downscale.ts";

interface CanvasCall {
  convertToBlob: (options?: {
    quality?: number;
    type?: string;
  }) => Promise<Blob>;
  height: number;
  width: number;
}

const canvasCalls: CanvasCall[] = [];

function installStubs(options: {
  bitmap?: { width: number; height: number };
  bitmapRejects?: Error;
  convertRejects?: Error;
  convertBlob?: Blob;
}) {
  if (options.bitmapRejects) {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(options.bitmapRejects)
    );
  } else {
    const bmp = options.bitmap ?? { width: 100, height: 100 };
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({
        width: bmp.width,
        height: bmp.height,
        close: vi.fn(),
      })
    );
  }

  class StubCanvas {
    width: number;
    height: number;
    convertToBlob: CanvasCall["convertToBlob"];

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.convertToBlob = vi.fn(() => {
        if (options.convertRejects) {
          return Promise.reject(options.convertRejects);
        }
        return Promise.resolve(
          options.convertBlob ??
            new Blob(["webp-bytes"], { type: "image/webp" })
        );
      });
      canvasCalls.push({
        width,
        height,
        convertToBlob: this.convertToBlob,
      });
    }

    getContext() {
      return { drawImage: vi.fn() };
    }
  }
  vi.stubGlobal("OffscreenCanvas", StubCanvas);
}

function makeSourceFile(name = "photo.jpg", type = "image/jpeg"): File {
  return new File([new Uint8Array(1024)], name, { type });
}

describe("downscaleImage", () => {
  beforeEach(() => {
    canvasCalls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downscales a 4000x3000 source to 1920x1440 and returns a WebP file", async () => {
    installStubs({ bitmap: { width: 4000, height: 3000 } });

    const result = await downscaleImage(makeSourceFile("big-photo.jpg"));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(canvasCalls).toHaveLength(1);
    expect(canvasCalls[0].width).toBe(1920);
    expect(canvasCalls[0].height).toBe(1440);
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name).toBe("big-photo.webp");
  });

  it("preserves portrait orientation when height is the longest side", async () => {
    installStubs({ bitmap: { width: 3000, height: 4000 } });

    const result = await downscaleImage(makeSourceFile());

    expect(result.ok).toBe(true);
    expect(canvasCalls[0].width).toBe(1440);
    expect(canvasCalls[0].height).toBe(1920);
  });

  it("does not upscale small sources (800x600 stays 800x600)", async () => {
    installStubs({ bitmap: { width: 800, height: 600 } });

    const result = await downscaleImage(
      makeSourceFile("logo.png", "image/png")
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(canvasCalls[0].width).toBe(800);
    expect(canvasCalls[0].height).toBe(600);
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name).toBe("logo.webp");
  });

  it("returns the decode-failure error when createImageBitmap rejects", async () => {
    installStubs({ bitmapRejects: new Error("decode failed") });

    const result = await downscaleImage(makeSourceFile());

    expect(result).toEqual({
      ok: false,
      error: "Could not process this image. Try a different file.",
    });
  });

  it("returns the decode-failure error when convertToBlob rejects", async () => {
    installStubs({
      bitmap: { width: 1000, height: 800 },
      convertRejects: new Error("encode failed"),
    });

    const result = await downscaleImage(makeSourceFile());

    expect(result).toEqual({
      ok: false,
      error: "Could not process this image. Try a different file.",
    });
  });

  it("passes image/webp + 0.85 quality to convertToBlob", async () => {
    installStubs({ bitmap: { width: 1000, height: 800 } });

    await downscaleImage(makeSourceFile());

    expect(canvasCalls[0].convertToBlob).toHaveBeenCalledWith({
      type: "image/webp",
      quality: 0.85,
    });
  });
});
