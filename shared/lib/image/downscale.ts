const MAX_LONG_EDGE = 1920;
const WEBP_QUALITY = 0.85;
const DECODE_ERROR_MESSAGE =
  "Could not process this image. Try a different file.";

export type DownscaleResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

/**
 * Downscales and re-encodes a user-picked image to a WebP file suitable
 * for upload to the `project-screenshots` bucket. Preserves aspect
 * ratio, caps the longest side at 1920 px, and does not upscale
 * sources that are already smaller.
 *
 * Returns `{ ok: false, error }` with a user-facing message when the
 * browser cannot decode the file or the encoder fails — the caller
 * should surface the error and skip the upload.
 */
export async function downscaleImage(file: File): Promise<DownscaleResult> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(
      1,
      MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    const targetW = Math.round(bitmap.width * scale);
    const targetH = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: DECODE_ERROR_MESSAGE };
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: WEBP_QUALITY,
    });

    const dot = file.name.lastIndexOf(".");
    const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
    const output = new File([blob], `${stem}.webp`, { type: "image/webp" });
    return { ok: true, file: output };
  } catch {
    return { ok: false, error: DECODE_ERROR_MESSAGE };
  } finally {
    bitmap?.close();
  }
}
