import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type FileMetadata,
  formatBytes,
  useFileUpload,
} from "./use-file-upload";

// jsdom does not implement the object-URL APIs the hook uses for previews.
beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
  globalThis.URL.revokeObjectURL = vi.fn();
});

function pngFile(name = "a.png", bytes = 3): File {
  return new File(["x".repeat(bytes)], name, { type: "image/png" });
}

describe("formatBytes", () => {
  it("returns '0 Bytes' for zero", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  it("formats kilobytes and megabytes with two decimals by default", () => {
    expect(formatBytes(1024)).toBe("1KB");
    expect(formatBytes(1_572_864)).toBe("1.5MB");
  });
});

describe("useFileUpload — initial state", () => {
  it("seeds files from initialFiles, using each entry's url as the preview", () => {
    const initial: FileMetadata[] = [
      { id: "f1", name: "x.png", size: 10, type: "image/png", url: "/x.png" },
    ];
    const { result } = renderHook(() =>
      useFileUpload({ initialFiles: initial })
    );

    expect(result.current[0].files).toHaveLength(1);
    expect(result.current[0].files[0].id).toBe("f1");
    expect(result.current[0].files[0].preview).toBe("/x.png");
  });
});

describe("useFileUpload — single-file mode", () => {
  it("adds a file and generates an object-URL preview", () => {
    const onFilesChange = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onFilesChange }));

    act(() => result.current[1].addFiles([pngFile()]));

    expect(result.current[0].files).toHaveLength(1);
    expect(result.current[0].files[0].preview).toBe("blob:preview");
    expect(onFilesChange).toHaveBeenCalled();
  });

  it("replaces the previous file instead of appending", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => result.current[1].addFiles([pngFile("first.png")]));
    act(() => result.current[1].addFiles([pngFile("second.png")]));

    expect(result.current[0].files).toHaveLength(1);
    expect(result.current[0].files[0].file.name).toBe("second.png");
  });

  it("rejects a file over maxSize and reports via onError", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ maxSize: 1, onError }));

    act(() => result.current[1].addFiles([pngFile("big.png", 10)]));

    expect(result.current[0].files).toHaveLength(0);
    expect(result.current[0].errors[0]).toContain("exceeds the maximum size");
    expect(onError).toHaveBeenCalled();
  });

  it("rejects a file whose type is not in the accept list", () => {
    const { result } = renderHook(() =>
      useFileUpload({ accept: "image/jpeg" })
    );

    act(() => result.current[1].addFiles([pngFile()]));

    expect(result.current[0].files).toHaveLength(0);
    expect(result.current[0].errors[0]).toContain("not an accepted file type");
  });
});

describe("useFileUpload — multiple-file mode", () => {
  it("appends files up to maxFiles and rejects the batch that would exceed it", () => {
    const { result } = renderHook(() =>
      useFileUpload({ multiple: true, maxFiles: 2 })
    );

    act(() => result.current[1].addFiles([pngFile("a.png"), pngFile("b.png")]));
    expect(result.current[0].files).toHaveLength(2);

    act(() => result.current[1].addFiles([pngFile("c.png")]));
    expect(result.current[0].files).toHaveLength(2);
    expect(result.current[0].errors[0]).toContain("maximum of 2 files");
  });

  it("silently skips a duplicate (same name and size)", () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));

    act(() => result.current[1].addFiles([pngFile("dup.png", 3)]));
    act(() => result.current[1].addFiles([pngFile("dup.png", 3)]));

    expect(result.current[0].files).toHaveLength(1);
  });
});

describe("useFileUpload — removal and clearing", () => {
  it("removeFile drops the file and revokes its object URL", () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => result.current[1].addFiles([pngFile()]));
    const id = result.current[0].files[0].id;

    act(() => result.current[1].removeFile(id));

    expect(result.current[0].files).toHaveLength(0);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("clearFiles empties the list", () => {
    const { result } = renderHook(() => useFileUpload({ multiple: true }));
    act(() => result.current[1].addFiles([pngFile("a.png"), pngFile("b.png")]));

    act(() => result.current[1].clearFiles());

    expect(result.current[0].files).toHaveLength(0);
  });

  it("clearErrors removes errors without touching files", () => {
    const { result } = renderHook(() => useFileUpload({ maxSize: 1 }));
    act(() => result.current[1].addFiles([pngFile("big.png", 10)]));
    expect(result.current[0].errors).not.toHaveLength(0);

    act(() => result.current[1].clearErrors());

    expect(result.current[0].errors).toHaveLength(0);
  });
});

describe("useFileUpload — input wiring", () => {
  it("getInputProps merges defaults with caller overrides", () => {
    const { result } = renderHook(() =>
      useFileUpload({ accept: "image/png", multiple: true })
    );

    const props = result.current[1].getInputProps({ disabled: true });

    expect(props.type).toBe("file");
    expect(props.accept).toBe("image/png");
    expect(props.multiple).toBe(true);
    expect(props.disabled).toBe(true);
  });

  it("handleFileChange feeds selected files into addFiles", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current[1].handleFileChange({
        target: { files: [pngFile()] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current[0].files).toHaveLength(1);
  });
});
