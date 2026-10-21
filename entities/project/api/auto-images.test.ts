import type { CaptureSession } from "@shared/api/capture-browser/session";
import type { HighlightModel } from "@shared/lib/highlight-agent/run-highlight-agent";
import { describe, expect, it, vi } from "vitest";

// The sandboxed browser is an external system; tests drive it through a fake.
const openCaptureSession = vi.fn();
vi.mock("@shared/api/capture-browser/session", () => ({ openCaptureSession }));

const {
  captureFirstProjectImage,
  fillProjectHighlights,
  HIGHLIGHT_RUNS_PER_DAY,
} = await import("./auto-images");
type AutoImageStore = import("./auto-images").AutoImageStore;

/** A mock whose result is delivered asynchronously, like the real port. */
function resolved<A extends unknown[], R>(impl: (...args: A) => R) {
  return vi.fn((...args: A) => Promise.resolve(impl(...args)));
}
const NOW = Date.parse("2026-10-21T03:00:00Z");

function memoryStore(options: { recentRuns?: number } = {}) {
  const gallery = { images: [{ path: "u1/first.jpg" }] as { path: string }[] };
  const runs: Array<{ id: string; status: string; added: number }> = [];
  const uploads: string[] = [];
  const removed: string[] = [];
  let ownerEditsAfter = Number.POSITIVE_INFINITY;
  const store: AutoImageStore = {
    countRunsSince: vi.fn(async () => options.recentRuns ?? 0),
    startRun: resolved(() => {
      runs.push({ id: `run-${runs.length + 1}`, status: "running", added: 0 });
      return `run-${runs.length}`;
    }),
    finishRun: resolved((id, status, added) => {
      const run = runs.find((r) => r.id === id);
      if (run) {
        run.status = status;
        run.added = added;
      }
    }),
    uploadImage: resolved((userId, _image) => {
      const path = `${userId}/auto-${uploads.length + 1}.jpg`;
      uploads.push(path);
      return path;
    }),
    removeImage: resolved((path) => {
      removed.push(path);
    }),
    appendImage: resolved((_projectId, expected, image) => {
      if (gallery.images.length >= ownerEditsAfter) {
        gallery.images = [{ path: "u1/owner-upload.jpg" }];
      }
      if (JSON.stringify(expected) !== JSON.stringify(gallery.images)) {
        return false;
      }
      gallery.images = [...gallery.images, image];
      return true;
    }),
    refresh: vi.fn(),
  };
  return {
    store,
    gallery,
    runs,
    removed,
    ownerEditsOnceGalleryHas(count: number) {
      ownerEditsAfter = count;
    },
  };
}

function fakeSession(hashes: string[]) {
  let n = 0;
  const session: CaptureSession = {
    firstScreen: { hash: "first", image: Buffer.from("first") },
    firstView: Buffer.from("first-view"),
    act: vi.fn(async () => ({
      ok: true,
      url: "https://lunch.example.com/",
      changed: true,
      view: Buffer.from("view"),
    })),
    capture: resolved(() => {
      const hash = hashes[n] ?? `h${n}`;
      n += 1;
      return { hash, image: Buffer.from(hash) };
    }),
    close: vi.fn(async () => undefined),
  };
  return session;
}

function capturingModel(count: number): HighlightModel {
  let made = 0;
  return {
    next: resolved(() => {
      made += 1;
      if (made % 2 === 1 && made <= count * 2) {
        return {
          kind: "tool" as const,
          name: "click",
          input: { x: 1, y: 1, note: "n" },
        };
      }
      if (made <= count * 2) {
        return {
          kind: "tool" as const,
          name: "capture_highlight",
          input: { caption: `화면 ${made / 2}`, note: "n" },
        };
      }
      return { kind: "tool" as const, name: "finish", input: { note: "n" } };
    }),
  };
}

const project = {
  title: "점심 룰렛",
  tagline: "오늘 점심 메뉴를 골라 주는 룰렛",
};

describe("fillProjectHighlights", () => {
  it("adds each highlight after the first image, in capture order, and records the run", async () => {
    const { store, gallery, runs } = memoryStore();
    const session = fakeSession(["a", "b", "c"]);

    await fillProjectHighlights({
      session,
      store,
      model: capturingModel(3),
      projectId: "p1",
      userId: "u1",
      project,
      images: [{ path: "u1/first.jpg" }],
      now: () => NOW,
    });

    expect(gallery.images.map((i) => i.path)).toEqual([
      "u1/first.jpg",
      "u1/auto-1.jpg",
      "u1/auto-2.jpg",
      "u1/auto-3.jpg",
    ]);
    expect(runs).toEqual([{ id: "run-1", status: "succeeded", added: 3 }]);
    expect(store.refresh).toHaveBeenCalledTimes(3);
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("never grows the gallery past five images", async () => {
    const { store, gallery } = memoryStore();

    await fillProjectHighlights({
      session: fakeSession(["a", "b", "c", "d", "e", "f"]),
      store,
      model: capturingModel(6),
      projectId: "p1",
      userId: "u1",
      project,
      images: [{ path: "u1/first.jpg" }],
      now: () => NOW,
    });

    expect(gallery.images).toHaveLength(5);
  });

  it("discards a capture that arrives after the owner changed the images, and stops", async () => {
    const { store, gallery, runs, removed, ownerEditsOnceGalleryHas } =
      memoryStore();
    ownerEditsOnceGalleryHas(2);

    await fillProjectHighlights({
      session: fakeSession(["a", "b", "c"]),
      store,
      model: capturingModel(3),
      projectId: "p1",
      userId: "u1",
      project,
      images: [{ path: "u1/first.jpg" }],
      now: () => NOW,
    });

    expect(gallery.images).toEqual([{ path: "u1/owner-upload.jpg" }]);
    expect(removed).toEqual(["u1/auto-2.jpg"]);
    expect(runs).toEqual([{ id: "run-1", status: "cancelled", added: 1 }]);
  });

  it(`skips the highlight run once the owner already used ${HIGHLIGHT_RUNS_PER_DAY} runs in the last day`, async () => {
    const { store, gallery, runs } = memoryStore({
      recentRuns: HIGHLIGHT_RUNS_PER_DAY,
    });
    const session = fakeSession(["a"]);
    const model = capturingModel(1);

    await fillProjectHighlights({
      session,
      store,
      model,
      projectId: "p1",
      userId: "u1",
      project,
      images: [{ path: "u1/first.jpg" }],
      now: () => NOW,
    });

    expect(store.countRunsSince).toHaveBeenCalledWith(
      "u1",
      new Date(NOW - 24 * 60 * 60 * 1000)
    );
    expect(model.next).not.toHaveBeenCalled();
    expect(runs).toEqual([]);
    expect(gallery.images).toHaveLength(1);
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it("records a failed run and still closes the browser when something breaks", async () => {
    const { store, runs } = memoryStore();
    const session = fakeSession(["a"]);
    const model: HighlightModel = {
      next: vi.fn(() => Promise.reject(new Error("model unavailable"))),
    };

    await fillProjectHighlights({
      session,
      store,
      model,
      projectId: "p1",
      userId: "u1",
      project,
      images: [{ path: "u1/first.jpg" }],
      now: () => NOW,
    });

    expect(runs).toEqual([{ id: "run-1", status: "failed", added: 0 }]);
    expect(session.close).toHaveBeenCalledTimes(1);
  });
});

describe("captureFirstProjectImage", () => {
  it("keeps the project's first screen under the owner's folder and leaves the browser open", async () => {
    const session = fakeSession([]);
    openCaptureSession.mockResolvedValueOnce({ ok: true, session });
    const upload = vi.fn(async (userId: string) => `${userId}/first.jpg`);

    const result = await captureFirstProjectImage({
      projectUrl: "https://lunch.example.com",
      userId: "u1",
      upload,
    });

    expect(result).toEqual({ ok: true, path: "u1/first.jpg", session });
    expect(upload).toHaveBeenCalledWith("u1", session.firstScreen.image);
    expect(session.close).not.toHaveBeenCalled();
  });

  it("reports an unreachable URL without storing anything", async () => {
    openCaptureSession.mockResolvedValueOnce({
      ok: false,
      reason: "unreachable",
    });
    const upload = vi.fn();

    const result = await captureFirstProjectImage({
      projectUrl: "https://nowhere.invalid",
      userId: "u1",
      upload,
    });

    expect(result).toEqual({ ok: false, reason: "unreachable" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("closes the browser when the first screen cannot be stored", async () => {
    const session = fakeSession([]);
    openCaptureSession.mockResolvedValueOnce({ ok: true, session });

    const result = await captureFirstProjectImage({
      projectUrl: "https://lunch.example.com",
      userId: "u1",
      upload: vi.fn(() => Promise.reject(new Error("storage down"))),
    });

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(session.close).toHaveBeenCalledTimes(1);
  });
});
