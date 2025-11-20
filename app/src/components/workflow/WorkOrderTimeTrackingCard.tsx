import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkOrderTimeLogs } from "@/hooks/useWorkOrderTimeLogs";
import { format } from "date-fns";

interface WorkOrderTimeTrackingCardProps {
  workOrderId: string;
  onTimeLogged?: () => void;
}

export const WorkOrderTimeTrackingCard = ({
  workOrderId,
  onTimeLogged,
}: WorkOrderTimeTrackingCardProps) => {
  const { timeLogs, loading, logTime } = useWorkOrderTimeLogs(workOrderId);
  const [minutes, setMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const totalMinutes = useMemo(
    () => timeLogs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0),
    [timeLogs],
  );

  const handleSubmit = async () => {
    if (!minutes || minutes <= 0) return;
    try {
      setSubmitting(true);
      await logTime({
        minutes,
        notes: notes.trim() || undefined,
        billable,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      });
      setNotes("");
      setMinutes(30);
      setHourlyRate("");
      onTimeLogged?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Time tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/60 p-4 text-sm">
          <div className="font-semibold text-foreground">
            {Math.round(totalMinutes / 6) / 10} hrs logged
          </div>
          <p className="text-muted-foreground">
            Keep technician time entries current to power payroll, labor costing, and cycle time analytics.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time-minutes">Duration (minutes)</Label>
            <Input
              id="time-minutes"
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-rate">Hourly rate (optional)</Label>
            <Input
              id="time-rate"
              type="number"
              min={0}
              step={1}
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="time-billable"
            checked={billable}
            onCheckedChange={(checked) => setBillable(Boolean(checked))}
          />
          <Label htmlFor="time-billable">Billable</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-notes">Notes</Label>
          <Textarea
            id="time-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Capture what work was completed during this time block."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting || minutes <= 0}>
            {submitting ? "Saving..." : "Log time"}
          </Button>
        </div>

        <Separator />

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={`log-skeleton-${index}`} className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && timeLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No time entries yet. Technicians can clock progress directly from the planner or workflow board.
          </p>
        )}

        {!loading && timeLogs.length > 0 && (
          <div className="space-y-3">
            {timeLogs.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-foreground">
                    {entry.user
                      ? `${entry.user.first_name ?? ""} ${entry.user.last_name ?? ""}`.trim()
                      : "Technician"}
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(entry.clock_in), "PPpp")}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {entry.duration_minutes ?? 0} minute{(entry.duration_minutes ?? 0) === 1 ? "" : "s"}
                  {entry.billable === false && " • Non-billable"}
                </div>
                {entry.notes && (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
