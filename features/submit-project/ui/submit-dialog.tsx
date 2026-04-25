"use client";

import { RiAddLine } from "@remixicon/react";
import { Button } from "@shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitForm } from "./submit-form";

export interface SubmitDialogProps {
  /**
   * `cohort_id` of the signed-in viewer's profile. `null` means the
   * viewer has no cohort yet; passed through to the form so it can
   * render its guidance banner.
   */
  cohortId: string | null;
  /** True when the viewer is authenticated. False → renders a link to `/login`. */
  isAuthenticated: boolean;
}

export function SubmitDialog({ isAuthenticated, cohortId }: SubmitDialogProps) {
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button asChild>
        <Link href="/login">
          <RiAddLine data-icon="inline-start" />
          <span>프로젝트 제출</span>
        </Link>
      </Button>
    );
  }

  function handleSuccess() {
    setOpen(false);
    toast.success("프로젝트가 제출되었어요.");
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button data-testid="submit-project-trigger">
          <RiAddLine data-icon="inline-start" />
          <span>프로젝트 제출</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 제출</DialogTitle>
          <DialogDescription>
            스크린샷, 한 줄 소개, 프로젝트 링크를 공유해 주세요.
          </DialogDescription>
        </DialogHeader>
        <SubmitForm cohortId={cohortId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
