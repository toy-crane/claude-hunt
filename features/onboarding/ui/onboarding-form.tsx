"use client";

import type { Cohort } from "@entities/cohort";
import { createClient } from "@shared/api/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/alert";
import { AuthLayout } from "@shared/ui/auth-layout";
import { Button } from "@shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@shared/ui/field";
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
import { MAX_DISPLAY_NAME_LENGTH } from "../api/schema";

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
      setDisplayNameError("표시명을 입력해 주세요.");
      ok = false;
    } else if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      setDisplayNameError(
        `표시명은 ${MAX_DISPLAY_NAME_LENGTH}자 이하로 입력해 주세요.`
      );
      ok = false;
    } else {
      setDisplayNameError(null);
    }
    if (selectedCohortId === COHORT_UNSELECTED) {
      setCohortError("기수를 선택해 주세요.");
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
      description="기수를 선택하고 표시명을 설정하면 프로젝트를 제출할 수 있어요."
      title="프로필 설정"
    >
      <form
        aria-label="온보딩 완료"
        className="flex flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={displayNameId}>표시명</FieldLabel>
            <Input
              aria-invalid={displayNameError !== null}
              disabled={isPending || isSigningOut}
              id={displayNameId}
              name="displayName"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="표시명을 입력하세요"
              value={displayName}
            />
            <FieldDescription>
              프로젝트 카드에 표시돼요. 1~{MAX_DISPLAY_NAME_LENGTH}자.
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
              <AlertTitle>기수가 아직 없어요.</AlertTitle>
              <AlertDescription>
                강사에게 기수 배정을 요청해 주세요.
              </AlertDescription>
            </Alert>
          ) : (
            <Field>
              <FieldLabel htmlFor={cohortId}>기수</FieldLabel>
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
                  <SelectValue placeholder="기수를 선택하세요" />
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
          {isPending ? "저장 중..." : "계속하기"}
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
