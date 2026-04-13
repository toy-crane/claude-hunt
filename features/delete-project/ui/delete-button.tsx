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
import { useState } from "react";
import { deleteProject } from "../api/actions.ts";

export interface DeleteButtonProps {
  projectId: string;
  projectTitle: string;
}

export function DeleteButton({ projectId, projectTitle }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setDeleting(true);
    const result = await deleteProject(projectId);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete project");
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          data-testid="delete-project-trigger"
          size="sm"
          variant="outline"
        >
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            This removes "{projectTitle}" from the grid. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            className="text-destructive text-xs"
            data-testid="delete-project-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={deleting}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            data-testid="delete-project-confirm"
            disabled={deleting}
            onClick={handleConfirm}
            type="button"
            variant="destructive"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
