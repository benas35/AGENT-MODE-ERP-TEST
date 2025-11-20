import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkOrderApprovals } from "@/hooks/useWorkOrderApprovals";
import { sendCustomerNotification } from "@/lib/customerNotifications";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface WorkOrderApprovalPanelProps {
  workOrderId: string;
  orgId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onApprovalRequested?: () => void;
}

export const WorkOrderApprovalPanel = ({
  workOrderId,
  orgId,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  onApprovalRequested,
}: WorkOrderApprovalPanelProps) => {
  const { approvals, loading, requestApproval } = useWorkOrderApprovals(workOrderId);
  const { toast } = useToast();
  const [message, setMessage] = useState(
    `Hi ${customerName.split(" ")[0] ?? ""}, please review the additional work we found during inspection.`,
  );
  const [channels, setChannels] = useState<string[]>(() => {
    if (customerEmail) return ["email"];
    if (customerPhone) return ["sms"];
    return [];
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setChannels(() => {
      if (customerEmail) return ["email"];
      if (customerPhone) return ["sms"];
      return [];
    });
  }, [customerEmail, customerPhone]);

  const toggleChannel = (channel: string) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  };

  const handleRequest = async () => {
    try {
      setSubmitting(true);
      const approval = await requestApproval(message);

      await sendCustomerNotification({
        orgId,
        customerId,
        workOrderId,
        type: "approval",
        message,
        subject: "Work order approval requested",
        channels,
      });

      toast({
        title: "Approval sent",
        description: "The customer was notified with the approval request.",
      });

      onApprovalRequested?.();
      return approval;
    } catch (err) {
      console.error("Failed to request approval", err);
      toast({
        title: "Unable to send approval",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const channelDisabled = (channel: string) => {
    if (channel === "email") {
      return !customerEmail;
    }
    if (channel === "sms") {
      return !customerPhone;
    }
    return false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="approval-message">Approval message</Label>
          <Textarea
            id="approval-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-[120px]"
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval-channel-email"
                checked={channels.includes("email")}
                onCheckedChange={() => toggleChannel("email")}
                disabled={channelDisabled("email")}
              />
              <Label htmlFor="approval-channel-email" className="text-sm">
                Email {customerEmail ? `(${customerEmail})` : "(no email on file)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approval-channel-sms"
                checked={channels.includes("sms")}
                onCheckedChange={() => toggleChannel("sms")}
                disabled={channelDisabled("sms")}
              />
              <Label htmlFor="approval-channel-sms" className="text-sm">
                SMS {customerPhone ? `(${customerPhone})` : "(no phone on file)"}
              </Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleRequest}
              disabled={submitting || !message.trim() || channels.length === 0}
            >
              {submitting ? "Sending..." : "Request approval"}
            </Button>
          </div>
        </div>

        <Separator />

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={`approval-skeleton-${index}`} className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No approval requests yet. Use the form above to request sign-off on new work.
          </p>
        )}

        {!loading && approvals.length > 0 && (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      approval.status === "PENDING"
                        ? "secondary"
                        : approval.status === "APPROVED"
                          ? "default"
                          : approval.status === "DECLINED"
                            ? "destructive"
                            : "outline"
                    }
                  >
                    {approval.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                  </span>
                </div>
                {approval.message && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{approval.message}</p>
                )}
                {approval.responded_at && (
                  <p className="text-xs text-muted-foreground">
                    Responded {formatDistanceToNow(new Date(approval.responded_at), { addSuffix: true })}
                    {approval.response_message && ` – ${approval.response_message}`}
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
