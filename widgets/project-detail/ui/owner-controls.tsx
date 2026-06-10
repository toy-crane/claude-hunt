"use client";

import { deleteProject } from "@features/delete-project";
import { RiDeleteBin6Line, RiPencilLine } from "@remixicon/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/ui/alert-dialog";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface OwnerControlsProps {
  projectId: string;
  projectTitle: string;
}

/**
 * Top-right of the detail page hero — pencil and trash icon buttons,
 * visible only to the owner. Pencil links to the edit page; trash
 * opens a confirmation dialog and deletes on confirm. Matches the
 * wireframe (Screen 1).
 */
export function OwnerControls({ projectId, projectTitle }: OwnerControlsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDeleting(true);
    try {
      const result = await deleteProject({ projectId });
      if (!result.ok) {
        toast.error(
          result.error ??
            "프로젝트를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      toast.success("프로젝트를 삭제했어요.");
      setConfirmOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="project-detail-owner-controls"
    >
      <Button aria-label="편집" asChild size="icon" variant="outline">
        <Link href={`/projects/${projectId}/edit`}>
          <RiPencilLine />
        </Link>
      </Button>
      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogTrigger asChild>
          <Button aria-label="삭제" size="icon" variant="outline">
            <RiDeleteBin6Line />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 프로젝트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{projectTitle}" 프로젝트와 첨부한 이미지가 함께 삭제돼요. 되돌릴
              수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? <Spinner data-icon="inline-start" /> : null}
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
