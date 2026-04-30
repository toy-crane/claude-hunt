export {
  GITHUB_URL_PATTERN,
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
export { projectFieldsSchema } from "./model/validation";
