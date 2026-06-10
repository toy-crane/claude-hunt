import { beforeEach, describe, expect, it, vi } from "vitest";

const SIGNED_IN_REGEX = /로그인/;
const INSTRUCTOR_REGEX = /강사/;

const revalidatePathMock = vi.fn();
const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));

const getClaims = vi.fn();
const from = vi.fn();
const mockClient = {
  auth: { getClaims },
  from,
};

vi.mock("@shared/api/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}));

const { submitProject } = await import("./actions");

const validInput = {
  title: "My App",
  tagline: "A cool tool",
  projectUrl: "https://myapp.com",
  imagePaths: ["user-1/shot.png"],
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  updateTagMock.mockClear();
  getClaims.mockReset();
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
    getClaims.mockResolvedValue({ data: null, error: null });

    const result = await submitProject(validInput);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(SIGNED_IN_REGEX);
  });

  it("rejects when the user has no cohort assigned", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
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
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("inserts a project and revalidates the home page on success", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
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
        images: [{ path: "user-1/shot.png" }],
      })
    );
    expect(updateTagMock).toHaveBeenCalledWith("projects");
    // The settings 내 프로젝트 list reads via the uncached fetchMyProjects,
    // so submit must revalidate /settings like delete/edit do.
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("writes the description to the insert when provided", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { insertQuery } = stubProfileThenInsert({
      cohortId: "cohort-1",
      insertedId: "proj-1",
    });

    await submitProject({ ...validInput, description: "자세한 설명입니다." });

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: "자세한 설명입니다." })
    );
  });

  it("writes a null description when omitted", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const { insertQuery } = stubProfileThenInsert({
      cohortId: "cohort-1",
      insertedId: "proj-1",
    });

    await submitProject(validInput);

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it("surfaces storage/db errors back to the caller", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
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
