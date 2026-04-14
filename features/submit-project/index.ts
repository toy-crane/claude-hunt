export type { SubmitProjectResult } from "./api/actions";
export { submitProject } from "./api/actions";
export type { SubmitProjectInput } from "./api/schema";
export {
  ALLOWED_SCREENSHOT_MIME_TYPES,
  MAX_SCREENSHOT_BYTES,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
  submitProjectInputSchema,
  validateScreenshotFile,
} from "./api/schema";
export { uploadScreenshot } from "./lib/upload-screenshot";
export type { SubmitDialogProps } from "./ui/submit-dialog";
export { SubmitDialog } from "./ui/submit-dialog";
export type { SubmitFormProps } from "./ui/submit-form";
export { SubmitForm } from "./ui/submit-form";
