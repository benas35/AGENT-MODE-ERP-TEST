import { describe, expect, it } from "vitest";
import { buildTimeline } from "../timeline";

const baseWorkOrder = {
  id: "wo-1",
  status: "IN_PROGRESS",
  title: "",
  description: "",
  workOrderNumber: "WO-1",
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: null,
  promisedAt: null,
  completedAt: null,
  priority: null,
  subtotal: null,
  total: null,
  vehicle: null,
  media: [
    {
      id: "media-1",
      category: "issue",
      storagePath: "demo/path.jpg",
      caption: "Nuotrauka",
      createdAt: "2024-01-02T08:00:00Z",
      publicUrl: "https://example.com/path.jpg",
    },
  ],
} as any;

const message = {
  id: "msg-1",
  direction: "customer" as const,
  body: "Patvirtinu",
  createdAt: "2024-01-03T09:00:00Z",
  readByCustomerAt: null,
  readByStaffAt: null,
  metadata: null,
};

describe("buildTimeline", () => {
  it("includes work order creation, media and messages", () => {
    const timeline = buildTimeline(baseWorkOrder, [message]);
    expect(timeline).toHaveLength(3);
    expect(timeline[0].type).toBe("status");
    expect(timeline[1].type).toBe("media");
    expect(timeline[2].type).toBe("message");
  });

  it("sorts events chronologically", () => {
    const reversedMessage = { ...message, createdAt: "2023-12-31T09:00:00Z", id: "msg-2" };
    const timeline = buildTimeline(baseWorkOrder, [message, reversedMessage]);

    const timestamps = timeline.map((entry) => new Date(entry.timestamp).getTime());
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    expect(timestamps).toEqual(sortedTimestamps);
    expect(timeline[0].id).toBe("msg-2");
    expect(timeline.at(-1)?.id).toBe("msg-1");
  });
});
