"use client";

import { type Cohort, isSelectableCohort } from "@entities/cohort";
import {
  DISPLAY_NAME_REQUIRED_MESSAGE,
  displayNameSchema,
} from "@entities/profile";
import { getZodErrorMessage } from "@shared/lib/validation";
import { Button } from "@shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Spinner } from "@shared/ui/spinner";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProfile } from "../api/actions";

export interface SettingsFormProps {
  cohorts: Cohort[];
  email: string;
  initialCohortId?: string | null;
  initialDisplayName: string;
}

const COHORT_UNSELECTED = "";

export function SettingsForm({
  cohorts,
  email,
  initialCohortId,
  initialDisplayName,
}: SettingsFormProps) {
  const displayNameId = useId();
  const emailId = useId();
  const cohortFieldId = useId();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  // 현재 소속은 운영자 전용 cohort(TOYCRANE)여도 그대로 표시한다. 목록에
  // 아예 없는 id(소속 없음 등)만 미선택으로 시작해 placeholder를 보여준다.
  const [selectedCohortId, setSelectedCohortId] = useState(() =>
    initialCohortId && cohorts.some((cohort) => cohort.id === initialCohortId)
      ? initialCohortId
      : COHORT_UNSELECTED
  );
  // 옵션은 선택 가능한 cohort만 노출한다. 현재 소속이 선택 불가 cohort면
  // 값 표시를 위해 disabled 옵션으로만 추가한다 — 다른 클래스로 바꿀 수는
  // 있지만 새로 고르거나 되돌아올 수는 없다.
  const selectableCohorts = cohorts.filter(isSelectableCohort);
  const currentCohort = cohorts.find((cohort) => cohort.id === initialCohortId);
  const nonSelectableCurrentCohort =
    currentCohort && !isSelectableCohort(currentCohort) ? currentCohort : null;
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDisplayNameError(null);
    setCohortError(null);
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      setDisplayNameError(
        getZodErrorMessage(parsed.error, DISPLAY_NAME_REQUIRED_MESSAGE)
      );
      return;
    }
    startTransition(async () => {
      const result = await updateProfile({
        displayName: parsed.data,
        cohortId:
          selectedCohortId === COHORT_UNSELECTED ? undefined : selectedCohortId,
      });
      if (result.ok) {
        toast.success("프로필을 저장했어요.");
        posthog.capture("profile_updated");
        router.refresh();
        return;
      }
      if (result.error.field === "cohortId") {
        setCohortError(result.error.message);
        return;
      }
      setDisplayNameError(result.error.message);
    });
  }

  return (
    <form
      aria-label="프로필 수정"
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

        {cohorts.length > 0 ? (
          <Field data-invalid={cohortError === null ? undefined : ""}>
            <FieldLabel htmlFor={cohortFieldId}>클래스</FieldLabel>
            <Select
              disabled={isPending}
              onValueChange={(value) => {
                setSelectedCohortId(value);
                if (cohortError) {
                  setCohortError(null);
                }
              }}
              value={selectedCohortId}
            >
              <SelectTrigger
                aria-invalid={cohortError !== null}
                className="w-full"
                data-testid="settings-cohort-trigger"
                id={cohortFieldId}
              >
                <SelectValue placeholder="클래스를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {nonSelectableCurrentCohort ? (
                  <SelectItem disabled value={nonSelectableCurrentCohort.id}>
                    {nonSelectableCurrentCohort.label}
                  </SelectItem>
                ) : null}
                {selectableCohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cohortError ? (
              <p
                className="text-destructive text-xs"
                data-testid="settings-cohort-error"
                role="alert"
              >
                {cohortError}
              </p>
            ) : null}
          </Field>
        ) : null}

        <Field data-invalid={displayNameError === null ? undefined : ""}>
          <FieldLabel htmlFor={displayNameId}>닉네임</FieldLabel>
          <Input
            aria-invalid={displayNameError !== null}
            disabled={isPending}
            id={displayNameId}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
          {displayNameError ? (
            <p
              className="text-destructive text-xs"
              data-testid="settings-display-name-error"
              role="alert"
            >
              {displayNameError}
            </p>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          저장
        </Button>
      </div>
    </form>
  );
}
