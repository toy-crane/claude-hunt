// Postgres SQLSTATE for unique_violation on profiles_display_name_ci_unique.
const UNIQUE_VIOLATION_CODE = "23505";
const DISPLAY_NAME_UNIQUE_INDEX = "profiles_display_name_ci_unique";

export const DISPLAY_NAME_TAKEN_MESSAGE = "이미 사용 중인 표시명이에요.";

export function isDisplayNameUniqueViolation(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  if (error.code !== UNIQUE_VIOLATION_CODE) {
    return false;
  }
  return (
    (error.message ?? "").includes(DISPLAY_NAME_UNIQUE_INDEX) ||
    (error.details ?? "").includes(DISPLAY_NAME_UNIQUE_INDEX)
  );
}
