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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteProject({ projectId });
      if (!result.ok) {
        toast.error(result.error ?? "삭제하지 못했어요.");
        return;
      }
      toast.success("프로젝트가 삭제됐어요.");
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button aria-label="삭제" size="icon" variant="outline">
            <RiDeleteBin6Line />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 프로젝트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{projectTitle}"이(가) 보드에서 사라지고, 첨부된 이미지도 함께
              삭제됩니다. 이 동작은 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
