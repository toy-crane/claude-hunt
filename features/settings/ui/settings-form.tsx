"use client";

import { Button } from "@shared/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Spinner } from "@shared/ui/spinner.tsx";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDisplayName } from "../api/actions.ts";

export interface SettingsFormProps {
  email: string;
  initialDisplayName: string;
}

export function SettingsForm({ initialDisplayName, email }: SettingsFormProps) {
  const displayNameId = useId();
  const emailId = useId();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateDisplayName(displayName);
      if (result.ok) {
        toast.success("Display name updated");
        router.refresh();
        return;
      }
      setError(result.error.message);
    });
  }

  return (
    <form aria-label="Update display name" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={displayNameId}>Display name</FieldLabel>
          <Input
            aria-invalid={error !== null}
            disabled={isPending}
            id={displayNameId}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
          <FieldDescription>
            Shown on your project cards. Up to 50 characters.
          </FieldDescription>
          {error ? (
            <p
              className="text-destructive text-xs"
              data-testid="settings-display-name-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div>
            <Button disabled={isPending} type="submit">
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input
            disabled
            id={emailId}
            name="email"
            readOnly
            type="email"
            value={email}
          />
          <FieldDescription>Read-only.</FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
