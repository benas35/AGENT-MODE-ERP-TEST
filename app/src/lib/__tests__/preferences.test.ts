import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { clearPreference, getPreference, setPreference, usePreference } from "@/lib/preferences";

const KEY = "test-pref";

describe("preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearPreference(KEY);
  });

  it("falls back to default when missing", () => {
    expect(getPreference(KEY, true)).toBe(true);
  });

  it("persists values across reads", () => {
    setPreference(KEY, { enabled: false });
    expect(getPreference(KEY, { enabled: true })).toEqual({ enabled: false });
  });

  it("updates hook consumers and storage", () => {
    const { result } = renderHook(() => usePreference(KEY, true));

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(getPreference(KEY, true)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(`oldauta.pref:${KEY}`) ?? "null")).toBe(false);
  });
});
