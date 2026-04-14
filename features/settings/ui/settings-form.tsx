"use client";

import { Button } from "@shared/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import { useId, useState } from "react";

export interface SettingsFormProps {
  email: string;
  initialDisplayName: string;
}

/**
 * Settings form for the signed-in user. Display name editing is
 * wired up in a follow-up task; this shell captures the layout and
 * exposes the read-only email.
 */
export function SettingsForm({ initialDisplayName, email }: SettingsFormProps) {
  const displayNameId = useId();
  const emailId = useId();
  const [displayName, setDisplayName] = useState(initialDisplayName);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={displayNameId}>Display name</FieldLabel>
        <Input
          id={displayNameId}
          name="displayName"
          onChange={(event) => setDisplayName(event.target.value)}
          value={displayName}
        />
        <FieldDescription>
          Shown on your project cards. Up to 50 characters.
        </FieldDescription>
        <div>
          <Button disabled type="button">
            Save
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
  );
}
