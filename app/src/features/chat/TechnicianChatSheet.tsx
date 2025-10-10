import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { WorkOrderChat } from "@/features/chat/WorkOrderChat";

interface TechnicianChatSheetProps {
  workOrderId: string;
  technicianId?: string | null;
  participantIds?: string[];
  triggerLabel?: string;
}

export const TechnicianChatSheet = ({
  workOrderId,
  technicianId,
  participantIds = [],
  triggerLabel = "Chat",
}: TechnicianChatSheetProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden p-0">
        <SheetHeader className="px-6 py-4 text-left">
          <SheetTitle className="text-base font-semibold">Technician chat</SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(85vh-72px)] flex-col gap-4 overflow-hidden px-4 pb-4">
          <WorkOrderChat
            workOrderId={workOrderId}
            technicianId={technicianId}
            defaultParticipants={participantIds}
            className="h-full"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
