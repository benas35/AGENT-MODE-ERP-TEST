import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUndoDeferred, registerUndo } from "@/lib/undo";

vi.mock("@/hooks/use-toast", () => {
  return {
    toast: vi.fn(() => ({
      dismiss: vi.fn(),
      update: vi.fn(),
    })),
  };
});

describe("registerUndo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it("commits after the ttl when not undone", async () => {
    const commit = vi.fn();
    const rollback = vi.fn();

    registerUndo({ label: "Test", do: commit, undo: rollback, ttlMs: 1000 });

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
  });

  it("supports manual undo to restore state", async () => {
    let state = ["a", "b", "c"];
    const previous = [...state];

    const deferred = createUndoDeferred();
    deferred.promise.catch(() => undefined);

    const commit = vi.fn(() => {
      state = ["committed"];
      deferred.resolve();
    });

    const handle = registerUndo({
      label: "Remove",
      do: commit,
      undo: () => {
        state = [...previous];
        deferred.reject(new Error("undone"));
      },
      ttlMs: 1000,
    });

    state = ["pending"];

    await handle.triggerUndo();

    expect(state).toEqual(previous);

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(state).toEqual(previous);
    expect(commit).not.toHaveBeenCalled();
  });
});
