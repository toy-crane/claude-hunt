import "server-only";

import { createAdminClient } from "@shared/api/supabase/admin";
import type { Json } from "@shared/api/supabase/types";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { revalidateTag } from "next/cache";
import type { AutoImageStore } from "./auto-images";

/**
 * Supabase-backed store for automatic captures. Uses the service role
 * because the highlight run continues after the owner's request has ended;
 * callers pass an owner id they already verified. Gallery changes go
 * through `append_project_auto_image` so a late capture can never overwrite
 * images the owner changed in the meantime.
 */
export function createAutoImageStore(): AutoImageStore {
  const admin = createAdminClient();
  return {
    async countRunsSince(userId, since) {
      const { count, error } = await admin
        .from("project_capture_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since.toISOString());
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
    async startRun(projectId, userId) {
      const { data, error } = await admin
        .from("project_capture_runs")
        .insert({ project_id: projectId, user_id: userId })
        .select("id")
        .single();
      if (error || !data) {
        throw error ?? new Error("capture run not created");
      }
      return data.id;
    },
    async finishRun(runId, status, imagesAdded) {
      await admin
        .from("project_capture_runs")
        .update({
          status,
          images_added: imagesAdded,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    },
    async uploadImage(userId, image) {
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await admin.storage
        .from(SCREENSHOT_BUCKET)
        .upload(path, image, { contentType: "image/jpeg", upsert: false });
      if (error) {
        throw error;
      }
      return path;
    },
    async removeImage(path) {
      await admin.storage.from(SCREENSHOT_BUCKET).remove([path]);
    },
    async appendImage(projectId, expected, image) {
      const { data, error } = await admin.rpc("append_project_auto_image", {
        p_project_id: projectId,
        p_expected_images: expected as unknown as Json,
        p_image: image as unknown as Json,
      });
      if (error) {
        throw error;
      }
      return data === true;
    },
    refresh() {
      // Runs after the owner's response was sent, so `updateTag` (Server
      // Action only) is not available; expire immediately instead.
      revalidateTag(CACHE_TAGS.PROJECTS, { expire: 0 });
    },
  };
}
