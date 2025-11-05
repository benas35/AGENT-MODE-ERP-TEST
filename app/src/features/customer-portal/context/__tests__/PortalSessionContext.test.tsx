import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PortalSessionProvider, usePortalSessionContext } from "../PortalSessionContext";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const { invokeMock, setSessionMock, signOutMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  setSessionMock: vi.fn().mockResolvedValue({}),
  signOutMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: invokeMock },
    auth: { setSession: setSessionMock, signOut: signOutMock },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PortalSessionProvider>{children}</PortalSessionProvider>
);

describe("PortalSessionContext", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    setSessionMock.mockClear();
    signOutMock.mockClear();
    sessionStorage.clear();
  });

  it("requests magic link and returns to idle state on validation error", async () => {
    invokeMock.mockResolvedValueOnce({ error: { message: "missing" } });
    const { result } = renderHook(() => usePortalSessionContext(), { wrapper });

    await act(async () => {
      await result.current.requestMagicLink({ email: "invalid" });
    });

    expect(result.current.status).toBe("idle");
  });

  it("verifies token and stores session", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        access_token: "token",
        expires_in: 3600,
        org_id: "org",
        customer_id: "cust",
        work_order_id: "wo",
        preferences: {
          notify_email: true,
          notify_sms: false,
          notify_whatsapp: false,
        },
      },
    });

    const { result } = renderHook(() => usePortalSessionContext(), { wrapper });

    let success = false;
    await act(async () => {
      success = await result.current.verifyToken("demo");
    });

    expect(success).toBe(true);
    expect(result.current.session?.customerId).toBe("cust");
    expect(result.current.status).toBe("authenticated");
  });
});
