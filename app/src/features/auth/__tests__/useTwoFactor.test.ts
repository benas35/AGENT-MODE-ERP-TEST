import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useTwoFactor } from "@/features/auth/useTwoFactor";

const mfaMock = vi.hoisted(() => ({
  enroll: vi.fn(),
  verify: vi.fn(),
  challenge: vi.fn(),
  unenroll: vi.fn(),
  listFactors: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      mfa: mfaMock,
    },
  },
}));

describe("useTwoFactor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enrollment data", async () => {
    mfaMock.enroll.mockResolvedValueOnce({ data: { id: "factor-1", totp: { qr_code: "qr" } } });
    const { result } = renderHook(() => useTwoFactor());

    let enrollment;
    await act(async () => {
      enrollment = await result.current.enroll();
    });

    expect(enrollment?.id).toBe("factor-1");
    expect(mfaMock.enroll).toHaveBeenCalled();
  });

  it("verifies with a challenged factor", async () => {
    mfaMock.challenge.mockResolvedValueOnce({ data: { id: "challenge-1" } });
    mfaMock.verify.mockResolvedValueOnce({});
    const { result } = renderHook(() => useTwoFactor());

    await act(async () => {
      const success = await result.current.verify("factor-1", "123456");
      expect(success).toBe(true);
    });

    expect(mfaMock.challenge).toHaveBeenCalled();
    expect(mfaMock.verify).toHaveBeenCalledWith({ factorId: "factor-1", challengeId: "challenge-1", code: "123456" });
  });
});
