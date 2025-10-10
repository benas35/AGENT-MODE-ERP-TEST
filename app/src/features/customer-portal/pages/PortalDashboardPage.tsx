import { useEffect, useState } from "react";
import { usePortalWorkOrders, usePortalMessages, useServiceHistoryDownload } from "../hooks/usePortalData";
import { usePortalSession } from "../hooks/usePortalSession";
import { PortalWorkOrderStatus } from "../components/PortalWorkOrderStatus";
import { PortalMessagePanel } from "../components/PortalMessagePanel";
import { PortalApprovalActions } from "../components/PortalApprovalActions";
import { PortalDocumentsPanel } from "../components/PortalDocumentsPanel";
import { PortalPreferencesForm } from "../components/PortalPreferencesForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const PortalDashboardPage = () => {
  const { session } = usePortalSession();
  const { data: workOrders = [], isLoading } = usePortalWorkOrders();
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const downloadHistory = useServiceHistoryDownload();

  useEffect(() => {
    if (!selectedWorkOrderId && workOrders.length > 0) {
      setSelectedWorkOrderId(workOrders[0].id);
    }
  }, [workOrders, selectedWorkOrderId]);

  const selectedWorkOrder = workOrders.find((item) => item.id === selectedWorkOrderId) ?? null;
  const { messages, isLoading: messagesLoading, sendMessage } = usePortalMessages(selectedWorkOrderId);

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Sveiki sugrįžę!</h1>
          <p className="text-sm text-muted-foreground">Peržiūrėkite darbo eigą, bendraukite su patarėju ir patvirtinkite papildomus darbus.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={downloadHistory} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Atsisiųsti istoriją
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full md:w-64">
          <Select value={selectedWorkOrderId ?? ""} onValueChange={setSelectedWorkOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Pasirinkite darbo užsakymą" />
            </SelectTrigger>
            <SelectContent>
              {workOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.workOrderNumber} · {order.title ?? "Darbo užsakymas"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Prisijungęs klientas: {session.customerId}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Apžvalga</TabsTrigger>
          <TabsTrigger value="messages">Žinutės</TabsTrigger>
          <TabsTrigger value="documents">Dokumentai</TabsTrigger>
          <TabsTrigger value="preferences">Nustatymai</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PortalWorkOrderStatus workOrder={selectedWorkOrder} messages={messages} />
          <PortalApprovalActions workOrder={selectedWorkOrder} />
        </TabsContent>

        <TabsContent value="messages">
          <PortalMessagePanel
            messages={messages}
            isLoading={messagesLoading || isLoading}
            onSend={async ({ body }) => {
              await sendMessage({ body, workOrderId: selectedWorkOrderId });
            }}
          />
        </TabsContent>

        <TabsContent value="documents">
          <PortalDocumentsPanel messages={messages} />
        </TabsContent>

        <TabsContent value="preferences">
          <PortalPreferencesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};
