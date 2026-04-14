export type { SubmitProjectResult } from "./api/actions.ts";
export { submitProject } from "./api/actions.ts";
export type { SubmitProjectInput } from "./api/schema.ts";
export {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  MAX_SCREENSHOT_BYTES,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  submitProjectInputSchema,
  validateScreenshotFile,
} from "./api/schema.ts";
export { uploadScreenshot } from "./lib/upload-screenshot.ts";
export type { SubmitDialogProps } from "./ui/submit-dialog.tsx";
export { SubmitDialog } from "./ui/submit-dialog.tsx";
export type { SubmitFormProps } from "./ui/submit-form.tsx";
export { SubmitForm } from "./ui/submit-form.tsx";
