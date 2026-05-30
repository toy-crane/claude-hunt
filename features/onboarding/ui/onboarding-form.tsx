"use client";

import type { Cohort } from "@entities/cohort";
import {
  DISPLAY_NAME_REQUIRED_MESSAGE,
  displayNameSchema,
} from "@entities/profile";
import { createClient } from "@shared/api/supabase/client";
import { getZodErrorMessage } from "@shared/lib/validation";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/alert";
import { AuthLayout } from "@shared/ui/auth-layout";
import { Button } from "@shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Separator } from "@shared/ui/separator";
import { Spinner } from "@shared/ui/spinner";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { completeOnboarding } from "../api/actions";

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

  function validate(): { displayName: string; cohortId: string } | null {
    const parsed = displayNameSchema.safeParse(displayName);
    const cohortValid = selectedCohortId !== COHORT_UNSELECTED;

    setDisplayNameError(
      parsed.success
        ? null
        : getZodErrorMessage(parsed.error, DISPLAY_NAME_REQUIRED_MESSAGE)
    );
    setCohortError(cohortValid ? null : "클래스를 선택해 주세요.");

    if (!(parsed.success && cohortValid)) {
      return null;
    }
    return { displayName: parsed.data, cohortId: selectedCohortId };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (noCohorts) {
      return;
    }
    const input = validate();
    if (!input) {
      return;
    }
    startTransition(async () => {
      const result = await completeOnboarding(input);
      if (!result.ok) {
        setSubmitError(result.error ?? "온보딩을 완료할 수 없어요.");
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
    <AuthLayout
      description="클래스를 선택하고 닉네임을 설정하면 프로젝트를 제출할 수 있어요."
      title="프로필 설정"
    >
      <form
        aria-label="온보딩 완료"
        className="flex flex-col gap-6"
        noValidate
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <Field data-invalid={displayNameError ? true : undefined}>
            <FieldLabel htmlFor={displayNameId}>닉네임</FieldLabel>
            <Input
              aria-invalid={displayNameError ? true : undefined}
              disabled={isPending || isSigningOut}
              id={displayNameId}
              name="displayName"
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (displayNameError) {
                  setDisplayNameError(null);
                }
              }}
              placeholder="닉네임을 입력하세요"
              value={displayName}
            />
            {displayNameError ? (
              <FieldError data-testid="onboarding-display-name-error">
                {displayNameError}
              </FieldError>
            ) : null}
          </Field>

          {noCohorts ? (
            <Alert data-testid="onboarding-no-cohorts">
              <AlertTitle>클래스가 아직 없어요.</AlertTitle>
              <AlertDescription>
                강사에게 클래스 배정을 요청해 주세요.
              </AlertDescription>
            </Alert>
          ) : (
            <Field data-invalid={cohortError ? true : undefined}>
              <FieldLabel htmlFor={cohortId}>클래스</FieldLabel>
              <Select
                disabled={isPending || isSigningOut}
                onValueChange={(value) => {
                  setSelectedCohortId(value);
                  if (cohortError) {
                    setCohortError(null);
                  }
                }}
                value={selectedCohortId}
              >
                <SelectTrigger
                  aria-invalid={cohortError ? true : undefined}
                  className="w-full"
                  data-testid="onboarding-cohort-trigger"
                  id={cohortId}
                >
                  <SelectValue placeholder="클래스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cohortError ? (
                <FieldError data-testid="onboarding-cohort-error">
                  {cohortError}
                </FieldError>
              ) : null}
            </Field>
          )}
        </FieldGroup>

        {submitError ? (
          <FieldError data-testid="onboarding-submit-error">
            {submitError}
          </FieldError>
        ) : null}

        <Button
          data-testid="onboarding-submit"
          disabled={submitDisabled}
          type="submit"
        >
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          계속하기
        </Button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Separator />
          <span className="text-muted-foreground text-xs">또는</span>
          <Separator />
        </div>

        <Button
          data-testid="onboarding-sign-out"
          disabled={isPending || isSigningOut}
          onClick={handleSignOut}
          type="button"
          variant="outline"
        >
          로그아웃
        </Button>
      </form>
    </AuthLayout>
  );
}
