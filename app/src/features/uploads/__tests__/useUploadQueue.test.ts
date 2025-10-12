import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useUploadQueue } from "../useUploadQueue";

describe("useUploadQueue", () => {
  it("processes uploads in order and marks success", async () => {
    const uploadFn = vi.fn(async ({ updateProgress }) => {
      updateProgress(25);
      await Promise.resolve();
      updateProgress(75);
    });

    const { result } = renderHook(() =>
      useUploadQueue<string>({
        uploadFn,
      }),
    );

    act(() => {
      result.current.enqueue({ fileName: "image-a.jpg", payload: "file-a" });
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("success");
    });

    expect(result.current.items[0]?.progress).toBe(100);
    expect(uploadFn).toHaveBeenCalledTimes(1);
  });

  it("allows retry after an error", async () => {
    let attempt = 0;
    const uploadFn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error("boom");
      }
    });

    const { result } = renderHook(() =>
      useUploadQueue<string>({
        uploadFn,
      }),
    );

    act(() => {
      result.current.enqueue({ fileName: "image-b.jpg", payload: "file-b" });
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("error");
    });

    act(() => {
      result.current.retry(result.current.items[0]!.id);
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("success");
    });

    expect(attempt).toBe(2);
  });

  it("cancels an in-flight upload", async () => {
    const uploadFn = vi.fn(
      ({ signal }) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );

    const { result } = renderHook(() =>
      useUploadQueue<string>({
        uploadFn,
      }),
    );

    act(() => {
      result.current.enqueue({ fileName: "image-c.jpg", payload: "file-c" });
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("uploading");
    });

    act(() => {
      result.current.cancel(result.current.items[0]!.id);
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("error");
    });

    expect(result.current.items[0]?.error).toMatch(/cancel/i);
  });
});
