import { useEffect, useRef, useState } from "react";

import { TechnicianPhotoCapture } from "@/features/work-orders/TechnicianPhotoCapture";
import { WorkOrderPhotoTimeline } from "@/features/work-orders/WorkOrderPhotoTimeline";
import { useWorkOrderMedia } from "@/hooks/useWorkOrderMedia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { SuccessCheck } from "@/components/feedback/SuccessCheck";

interface WorkOrderPhotoSectionProps {
  workOrderId: string;
}

export const WorkOrderPhotoSection: React.FC<WorkOrderPhotoSectionProps> = ({ workOrderId }) => {
  const {
    media,
    isLoading,
    uploadMedia,
    deleteMedia,
    updateCaption,
    updateCategory,
    isUploading,
    uploadQueueItems,
    cancelUpload,
    retryUpload,
    removeUpload,
    error,
  } = useWorkOrderMedia(workOrderId);
  const uploadSuccessIds = useRef(new Set<string>());
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    uploadQueueItems.forEach((item) => {
      if (item.status === "success" && !uploadSuccessIds.current.has(item.id)) {
        uploadSuccessIds.current.add(item.id);
        setUploadSuccessMessage(`${item.fileName} uploaded`);
      }
    });
  }, [uploadQueueItems]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl flex items-center gap-2">
              Work order documentation
              <Badge variant="secondary">{media.length} files</Badge>
            </CardTitle>
          </div>
          <CardDescription>
            Capture evidence, annotate findings, and keep advisors and customers informed in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div id="work-order-photo-capture">
            <TechnicianPhotoCapture onUpload={uploadMedia} isUploading={isUploading} />
          </div>
          {uploadSuccessMessage && (
            <div className="flex justify-end">
              <SuccessCheck message={uploadSuccessMessage} onDone={() => setUploadSuccessMessage(null)} />
            </div>
          )}
          <WorkOrderPhotoTimeline
            workOrderId={workOrderId}
            media={media}
            isLoading={isLoading}
            onDelete={deleteMedia}
            onUpdateCaption={updateCaption}
            onUpdateCategory={updateCategory}
            pendingUploads={uploadQueueItems}
            onCancelUpload={cancelUpload}
            onRetryUpload={retryUpload}
            onDismissUpload={removeUpload}
          />
          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Unable to load photos</AlertTitle>
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
