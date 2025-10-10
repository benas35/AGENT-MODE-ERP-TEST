import type { PortalMessage, PortalWorkOrder } from "../hooks/usePortalData";

type TimelineType = "media" | "message" | "status";

export type PortalTimelineEvent = {
  id: string;
  type: TimelineType;
  timestamp: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
};

export const buildTimeline = (workOrder: PortalWorkOrder | null, messages: PortalMessage[]): PortalTimelineEvent[] => {
  const events: PortalTimelineEvent[] = [];

  if (workOrder) {
    if (workOrder.createdAt) {
      events.push({
        id: `${workOrder.id}-created`,
        type: "status",
        timestamp: workOrder.createdAt,
        title: "Darbo užsakymas sukurtas",
        description: workOrder.description ?? undefined,
        payload: { status: workOrder.status },
      });
    }

    if (workOrder.media) {
      workOrder.media.forEach((media) => {
        events.push({
          id: media.id,
          type: "media",
          timestamp: media.createdAt,
          title: `Įkelta nuotrauka (${media.category})`,
          description: media.caption ?? undefined,
          payload: { storagePath: media.storagePath },
        });
      });
    }

    if (workOrder.completedAt) {
      events.push({
        id: `${workOrder.id}-completed`,
        type: "status",
        timestamp: workOrder.completedAt,
        title: "Darbas užbaigtas",
        payload: { status: workOrder.status },
      });
    }
  }

  messages.forEach((message) => {
    events.push({
      id: message.id,
      type: "message",
      timestamp: message.createdAt,
      title: message.direction === "customer" ? "Jūsų žinutė" : "Serviso žinutė",
      description: message.body,
      payload: message.metadata ?? undefined,
    });
  });

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
