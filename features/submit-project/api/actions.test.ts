import { beforeEach, describe, expect, it, vi } from "vitest";

const SIGNED_IN_REGEX = /signed in/i;
const INSTRUCTOR_REGEX = /instructor/i;

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const getUser = vi.fn();
const from = vi.fn();
const mockClient = {
  auth: { getUser },
  from,
};

vi.mock("@shared/api/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

const { submitProject } = await import("./actions.ts");

const validInput = {
  title: "My App",
  tagline: "A cool tool",
  projectUrl: "https://myapp.com",
  screenshotPath: "user-1/shot.png",
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  getUser.mockReset();
  from.mockReset();
});

function stubProfileThenInsert(options: {
  cohortId: string | null;
  insertedId?: string;
  insertError?: { message: string };
}) {
  // first from("profiles").select("cohort_id").eq().single()
  const profileQuery = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { cohort_id: options.cohortId },
          error: null,
        }),
      }),
    }),
  };
  // second from("projects").insert().select("id").single()
  const insertQuery = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: options.insertedId ? { id: options.insertedId } : null,
          error: options.insertError ?? null,
        }),
      }),
    }),
  };
  from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return profileQuery;
    }
    if (table === "projects") {
      return insertQuery;
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { profileQuery, insertQuery };
}

describe("submitProject server action", () => {
  it("rejects when the user is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await submitProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(SIGNED_IN_REGEX);
  });

  it("rejects when the user has no cohort assigned", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    stubProfileThenInsert({ cohortId: null });

    const result = await submitProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(INSTRUCTOR_REGEX);
  });

  it("rejects invalid input (empty title) without touching the db", async () => {
    const result = await submitProject({ ...validInput, title: "" });

    expect(result.ok).toBe(false);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("inserts a project and revalidates the home page on success", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const { insertQuery } = stubProfileThenInsert({
      cohortId: "cohort-1",
      insertedId: "proj-1",
    });

    const result = await submitProject(validInput);

    expect(result.ok).toBe(true);
    expect(result.projectId).toBe("proj-1");
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        cohort_id: "cohort-1",
        title: "My App",
        tagline: "A cool tool",
        project_url: "https://myapp.com",
        screenshot_path: "user-1/shot.png",
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("surfaces storage/db errors back to the caller", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    stubProfileThenInsert({
      cohortId: "cohort-1",
      insertError: { message: "duplicate" },
    });

    const result = await submitProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("duplicate");
  });
});
