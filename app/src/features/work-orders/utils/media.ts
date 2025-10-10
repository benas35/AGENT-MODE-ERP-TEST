import { WorkOrderMediaItem } from "@/hooks/useWorkOrderMedia";

export const createThumbPath = (storagePath: string) => {
  if (storagePath.endsWith("/large.webp")) {
    return storagePath.replace("/large.webp", "/thumb.webp");
  }
  return storagePath;
};

export const formatGps = (gps: WorkOrderMediaItem["gps"]) => {
  if (!gps) return "";
  const accuracy = typeof gps.accuracy === "number" ? ` ±${gps.accuracy.toFixed(0)}m` : "";
  return `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}${accuracy}`;
};

export const findBeforeAfterPair = (media: WorkOrderMediaItem[]) => {
  const before = media.find((item) => item.category === "before");
  const after = media.find((item) => item.category === "after");
  if (!before || !after) return null;
  return { before, after } as const;
};
