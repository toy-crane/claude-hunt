"use client";

import { Button } from "@shared/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog.tsx";
import { Field, FieldLabel } from "@shared/ui/field.tsx";
import { Input } from "@shared/ui/input.tsx";
import { Spinner } from "@shared/ui/spinner.tsx";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { withdrawAccount } from "../api/actions.ts";

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
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>This will permanently remove:</DialogDescription>
        </DialogHeader>

        <ul className="ml-4 list-disc text-muted-foreground text-xs/relaxed">
          <li>Your profile (display name, email, avatar)</li>
          <li>All projects you have submitted</li>
          <li>All votes you have cast</li>
          <li>All uploaded screenshots</li>
        </ul>

        <Field data-invalid={error === null ? undefined : ""}>
          <FieldLabel htmlFor={confirmationId}>
            Type <span className="font-medium text-foreground">{email}</span> to
            confirm.
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
            Cancel
          </Button>
          <Button
            data-testid="withdraw-confirm"
            disabled={!matches || isPending}
            onClick={handleConfirm}
            type="button"
            variant="destructive"
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Deleting..." : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
