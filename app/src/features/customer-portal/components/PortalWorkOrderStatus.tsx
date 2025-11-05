import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, CheckCircle2, MessageCircle, Wrench } from "lucide-react";
import type { PortalMessage, PortalWorkOrder } from "../hooks/usePortalData";
import { buildTimeline } from "../utils/timeline";
import { PortalMediaGallery } from "./PortalMediaGallery";

const statusProgress: Record<string, number> = {
  SCHEDULED: 10,
  IN_PROGRESS: 50,
  APPROVAL_PENDING: 60,
  WAITING_PARTS: 40,
  READY_FOR_PICKUP: 90,
  COMPLETED: 100,
};

const statusLabel = (status: string | null) => {
  if (!status) return "Nežinomas";
  return status.replace(/_/g, " ").toLowerCase();
};

interface Props {
  workOrder: PortalWorkOrder | null;
  messages: PortalMessage[];
}

export const PortalWorkOrderStatus = ({ workOrder, messages }: Props) => {
  const timeline = buildTimeline(workOrder, messages);
  const progress = statusProgress[workOrder?.status ?? ""] ?? 20;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>{workOrder?.title ?? "Darbo užsakymas"}</span>
            {workOrder?.status && <Badge>{statusLabel(workOrder.status)}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Progreso eiga</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>Darbo užsakymo nr.</span>
              </div>
              <p className="text-base font-medium">{workOrder?.workOrderNumber ?? "-"}</p>
              {workOrder?.description && <p className="text-sm text-muted-foreground">{workOrder.description}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <span>Planuojama atsiėmimo data</span>
              </div>
              <p className="text-base font-medium">
                {workOrder?.promisedAt ? new Date(workOrder.promisedAt).toLocaleString() : "Derinama"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>Suma</span>
              </div>
              <p className="text-base font-medium">
                {typeof workOrder?.total === "number" ? `${workOrder.total.toFixed(2)} €` : "Bus pateikta"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <PortalMediaGallery workOrder={workOrder} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-4 w-4" />
            Įvykių istorija
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kol kas nėra įvykių.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={event.id} className="relative pl-6 text-sm">
                  <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary" />
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString("lt-LT")}
                  </p>
                  {event.description && <p className="mt-1 text-muted-foreground">{event.description}</p>}
                  {index < timeline.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
