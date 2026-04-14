"use client";

import type { Cohort } from "@entities/cohort/index.ts";
import { createClient } from "@shared/api/supabase/client.ts";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/alert.tsx";
import { Button } from "@shared/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select.tsx";
import { Separator } from "@shared/ui/separator.tsx";
import { Spinner } from "@shared/ui/spinner.tsx";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { completeOnboarding } from "../api/actions.ts";
import { MAX_DISPLAY_NAME_LENGTH } from "../api/schema.ts";

export interface OnboardingFormProps {
  cohorts: Cohort[];
  /** Destination to return to after successful onboarding. */
  initialNext: string;
}

const COHORT_UNSELECTED = "";

export function OnboardingForm({ cohorts, initialNext }: OnboardingFormProps) {
  const displayNameId = useId();
  const cohortId = useId();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState(COHORT_UNSELECTED);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const noCohorts = cohorts.length === 0;

  function validate() {
    let ok = true;
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setDisplayNameError("Display name is required");
      ok = false;
    } else if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      setDisplayNameError(
        `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`
      );
      ok = false;
    } else {
      setDisplayNameError(null);
    }
    if (selectedCohortId === COHORT_UNSELECTED) {
      setCohortError("Please select a cohort");
      ok = false;
    } else {
      setCohortError(null);
    }
    return ok;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (noCohorts) {
      return;
    }
    if (!validate()) {
      return;
    }
    const trimmed = displayName.trim();
    startTransition(async () => {
      const result = await completeOnboarding({
        displayName: trimmed,
        cohortId: selectedCohortId,
      });
      if (!result.ok) {
        setSubmitError(result.error ?? "Could not complete onboarding");
        return;
      }
      router.replace(initialNext);
    });
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  const submitDisabled = isPending || isSigningOut || noCohorts;

  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form
        aria-label="Complete onboarding"
        className="flex w-full max-w-sm flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <div>
          <span className="font-bold text-xl">Claude Hunt</span>
          <h1 className="mt-4 mb-1 font-semibold text-xl">
            Welcome! Let&apos;s set up your profile
          </h1>
          <p className="text-muted-foreground text-sm">
            Pick a cohort and set your display name to start submitting
            projects.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={displayNameId}>Display name</FieldLabel>
            <Input
              aria-invalid={displayNameError !== null}
              disabled={isPending || isSigningOut}
              id={displayNameId}
              name="displayName"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Type your display name"
              value={displayName}
            />
            <FieldDescription>
              Shown on your project cards. 1–{MAX_DISPLAY_NAME_LENGTH}{" "}
              characters.
            </FieldDescription>
            {displayNameError ? (
              <p
                className="text-destructive text-xs"
                data-testid="onboarding-display-name-error"
                role="alert"
              >
                {displayNameError}
              </p>
            ) : null}
          </Field>

          {noCohorts ? (
            <Alert data-testid="onboarding-no-cohorts">
              <AlertTitle>No cohorts are available yet.</AlertTitle>
              <AlertDescription>
                Please contact your instructor to get assigned to a cohort.
              </AlertDescription>
            </Alert>
          ) : (
            <Field>
              <FieldLabel htmlFor={cohortId}>Cohort</FieldLabel>
              <Select
                disabled={isPending || isSigningOut}
                onValueChange={setSelectedCohortId}
                value={selectedCohortId}
              >
                <SelectTrigger
                  aria-invalid={cohortError !== null}
                  className="w-full"
                  data-testid="onboarding-cohort-trigger"
                  id={cohortId}
                >
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cohortError ? (
                <p
                  className="text-destructive text-xs"
                  data-testid="onboarding-cohort-error"
                  role="alert"
                >
                  {cohortError}
                </p>
              ) : null}
            </Field>
          )}
        </FieldGroup>

        {submitError ? (
          <p
            className="text-destructive text-xs"
            data-testid="onboarding-submit-error"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <Button
          data-testid="onboarding-submit"
          disabled={submitDisabled}
          type="submit"
        >
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Saving..." : "Continue"}
        </Button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Separator />
          <span className="text-muted-foreground text-xs">or</span>
          <Separator />
        </div>

        <Button
          data-testid="onboarding-sign-out"
          disabled={isPending || isSigningOut}
          onClick={handleSignOut}
          type="button"
          variant="outline"
        >
          Sign out
        </Button>
      </form>
    </section>
  );
}
