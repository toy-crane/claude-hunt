"use client";

import { Button } from "@shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog";
import { Field, FieldLabel } from "@shared/ui/field";
import { Input } from "@shared/ui/input";
import { Spinner } from "@shared/ui/spinner";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { withdrawAccount } from "../api/actions";

export interface WithdrawDialogProps {
  email: string;
}

export function WithdrawDialog({ email }: WithdrawDialogProps) {
  const confirmationId = useId();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return;
    }
    setOpen(next);
    if (!next) {
      setConfirmation("");
      setError(null);
    }
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawAccount();
      if (result.ok) {
        router.replace("/");
        return;
      }
      setError(result.error);
    });
  }

  const matches = confirmation === email;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button
          data-testid="withdraw-trigger"
          type="button"
          variant="destructive"
        >
          탈퇴
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정 삭제</DialogTitle>
          <DialogDescription>다음 항목이 영구 삭제됩니다:</DialogDescription>
        </DialogHeader>

        <ul className="ml-4 list-disc text-muted-foreground text-xs/relaxed">
          <li>프로필 (닉네임, 이메일, 아바타)</li>
          <li>제출한 모든 프로젝트</li>
          <li>추천한 모든 기록</li>
          <li>업로드한 모든 스크린샷</li>
        </ul>

        <Field data-invalid={error === null ? undefined : ""}>
          <FieldLabel htmlFor={confirmationId}>
            확인을 위해{" "}
            <span className="font-medium text-foreground">{email}</span> 을(를)
            입력해 주세요.
          </FieldLabel>
          <Input
            aria-invalid={error !== null}
            autoComplete="off"
            disabled={isPending}
            id={confirmationId}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email}
            value={confirmation}
          />
        </Field>

        {error ? (
          <p
            className="text-destructive text-xs"
            data-testid="withdraw-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            취소
          </Button>
          <Button
            data-testid="withdraw-confirm"
            disabled={!matches || isPending}
            onClick={handleConfirm}
            type="button"
            variant="destructive"
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "삭제 중..." : "계정 삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
