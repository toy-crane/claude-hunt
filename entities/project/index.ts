export {
  GITHUB_URL_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  MAX_PROJECT_IMAGES,
  MAX_TAGLINE_LENGTH,
  MAX_TITLE_LENGTH,
} from "./model/constants";
export type {
  Project,
  ProjectImage,
  ProjectInsert,
  ProjectUpdate,
} from "./model/schema";
export type {
  ProjectFieldErrors,
  ProjectFieldName,
  ProjectFieldValues,
} from "./model/validation";
export {
  projectFieldsSchema,
  readProjectFieldValues,
  validateProjectFields,
} from "./model/validation";
