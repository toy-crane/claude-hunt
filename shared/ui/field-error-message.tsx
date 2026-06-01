import { FieldError } from "@shared/ui/field";

/** Renders a field error when a message is present; nothing otherwise. */
export function FieldErrorMessage({
  message,
  testId,
}: {
  message?: string;
  testId: string;
}) {
  if (!message) {
    return null;
  }
  return <FieldError data-testid={testId}>{message}</FieldError>;
}
