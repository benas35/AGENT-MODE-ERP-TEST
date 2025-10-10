import { describe, expect, it } from "vitest";
import { createThumbPath, findBeforeAfterPair, formatGps } from "../media";
import { WorkOrderMediaItem } from "@/hooks/useWorkOrderMedia";

const baseMedia = (overrides: Partial<WorkOrderMediaItem> = {}): WorkOrderMediaItem => ({
  id: overrides.id ?? crypto.randomUUID(),
  org_id: overrides.org_id ?? "org",
  work_order_id: overrides.work_order_id ?? "wo",
  uploaded_by: overrides.uploaded_by ?? "user",
  uploaded_by_name: overrides.uploaded_by_name ?? null,
  storage_path: overrides.storage_path ?? "path/large.webp",
  category: overrides.category ?? "issue",
  caption: overrides.caption ?? null,
  gps: overrides.gps ?? null,
  created_at: overrides.created_at ?? new Date().toISOString(),
  url: overrides.url ?? "https://example.com/large.webp",
  thumbnailUrl: overrides.thumbnailUrl ?? "https://example.com/thumb.webp",
});

describe("media utils", () => {
  it("creates thumb path for known patterns", () => {
    expect(createThumbPath("orgs/1/work-orders/2/large.webp")).toEqual("orgs/1/work-orders/2/thumb.webp");
    expect(createThumbPath("orgs/1/work-orders/2/custom.png")).toEqual("orgs/1/work-orders/2/custom.png");
  });

  it("formats gps coordinates with accuracy", () => {
    const formatted = formatGps({ lat: 54.67891, lng: 25.27963, accuracy: 4 });
    expect(formatted).toEqual("54.6789, 25.2796 ±4m");
    expect(formatGps(null)).toEqual("");
  });

  it("finds before/after pair when present", () => {
    const before = baseMedia({ id: "before", category: "before" });
    const after = baseMedia({ id: "after", category: "after" });
    const issue = baseMedia({ id: "issue", category: "issue" });

    const pair = findBeforeAfterPair([issue, after, before]);
    expect(pair).toBeTruthy();
    expect(pair?.before.id).toEqual("before");
    expect(pair?.after.id).toEqual("after");

    expect(findBeforeAfterPair([issue])).toBeNull();
  });
});
