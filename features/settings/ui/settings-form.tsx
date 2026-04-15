"use client";

import { Button } from "@shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDisplayName } from "../api/actions";

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
        toast.success("표시명이 변경되었어요.");
        router.refresh();
        return;
      }
      setError(result.error.message);
    });
  }

  return (
    <form
      aria-label="표시명 변경"
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field data-disabled="">
          <FieldLabel htmlFor={emailId}>이메일</FieldLabel>
          <Input
            disabled
            id={emailId}
            name="email"
            readOnly
            type="email"
            value={email}
          />
        </Field>

        <Field data-invalid={error === null ? undefined : ""}>
          <FieldLabel htmlFor={displayNameId}>표시명</FieldLabel>
          <Input
            aria-invalid={error !== null}
            disabled={isPending}
            id={displayNameId}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
          {error ? (
            <p
              className="text-destructive text-xs"
              data-testid="settings-display-name-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}
