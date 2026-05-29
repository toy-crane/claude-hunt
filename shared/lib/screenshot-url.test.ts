import type { Database } from "@shared/api/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { withScreenshotUrls } from "./screenshot-url";

function fakeSupabase(): SupabaseClient<Database> {
  return {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

describe("withScreenshotUrls", () => {
  it("resolves the public URL from primary_image_path", () => {
    const result = withScreenshotUrls(fakeSupabase(), [
      { id: "a", primary_image_path: "u1/a.png" },
    ]);
    expect(result[0].screenshotUrl).toBe("https://cdn.example.com/u1/a.png");
    // Preserves the rest of the row.
    expect(result[0].id).toBe("a");
  });

  it("returns an empty string when there is no image path", () => {
    const result = withScreenshotUrls(fakeSupabase(), [
      { id: "b", primary_image_path: null },
    ]);
    expect(result[0].screenshotUrl).toBe("");
  });
});
