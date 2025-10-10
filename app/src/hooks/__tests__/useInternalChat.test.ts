import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() }),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      track: vi.fn(),
      presenceState: vi.fn().mockReturnValue({}),
    }),
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { normalizeAttachments } from "../useInternalChat";

describe("normalizeAttachments", () => {
  it("returns empty array when input falsy", () => {
    expect(normalizeAttachments(undefined)).toEqual([]);
    expect(normalizeAttachments(null)).toEqual([]);
  });

  it("filters entries without storage_path", () => {
    const attachments = normalizeAttachments([
      { storage_path: "internal-message-files/demo.webp", name: "Demo" },
      { name: "Invalid" },
      null,
    ]);

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      storage_path: "internal-message-files/demo.webp",
      name: "Demo",
    });
  });

  it("maps optional metadata when provided", () => {
    const [attachment] = normalizeAttachments([
      { storage_path: "internal-message-files/demo.webp", name: "Demo", mime_type: "image/webp", size: 1234 },
    ]);

    expect(attachment.mime_type).toBe("image/webp");
    expect(attachment.size).toBe(1234);
  });
});
