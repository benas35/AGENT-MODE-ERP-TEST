import { TechnicianPhotoCapture } from "@/features/work-orders/TechnicianPhotoCapture";
import { WorkOrderPhotoTimeline } from "@/features/work-orders/WorkOrderPhotoTimeline";
import { useWorkOrderMedia } from "@/hooks/useWorkOrderMedia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

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
    error,
  } = useWorkOrderMedia(workOrderId);

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
          <TechnicianPhotoCapture onUpload={uploadMedia} isUploading={isUploading} />
          <WorkOrderPhotoTimeline
            workOrderId={workOrderId}
            media={media}
            isLoading={isLoading}
            onDelete={deleteMedia}
            onUpdateCaption={updateCaption}
            onUpdateCategory={updateCategory}
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
