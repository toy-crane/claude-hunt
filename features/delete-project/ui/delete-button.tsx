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
import { useState } from "react";
import { deleteProject } from "../api/actions";

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
      setError(result.error ?? "프로젝트를 삭제할 수 없어요.");
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
          삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트를 삭제할까요?</DialogTitle>
          <DialogDescription>
            "{projectTitle}"을(를) 그리드에서 제거합니다. 되돌릴 수 없어요.
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
            취소
          </Button>
          <Button
            data-testid="delete-project-confirm"
            disabled={deleting}
            onClick={handleConfirm}
            type="button"
            variant="destructive"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
