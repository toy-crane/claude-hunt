"use client";

import { Button } from "@shared/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shared/ui/dialog.tsx";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitForm } from "./submit-form.tsx";

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
        <Link href="/login">Submit a project</Link>
      </Button>
    );
  }

  function handleSuccess() {
    setOpen(false);
    toast.success("Project submitted");
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button data-testid="submit-project-trigger">Submit a project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a project</DialogTitle>
          <DialogDescription>
            Share a screenshot, a one-line tagline, and a link to your project.
          </DialogDescription>
        </DialogHeader>
        <SubmitForm cohortId={cohortId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
