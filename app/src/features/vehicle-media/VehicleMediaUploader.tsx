import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUploadQueue, UploadQueueItem } from "@/features/uploads/useUploadQueue";
import { Upload, ImagePlus, Info, RotateCcw, X } from "lucide-react";
import { VehicleMediaKind } from "@/hooks/useVehicleMedia";
import { SuccessCheck } from "@/components/feedback/SuccessCheck";

interface VehicleMediaUploaderProps {
  vehicleId: string;
  defaultKind?: VehicleMediaKind;
}

interface VehicleUploadMeta {
  kind: VehicleMediaKind;
}

const mediaKindOptions: { value: VehicleMediaKind; label: string; helper: string }[] = [
  { value: "hero", label: "Hero", helper: "Primary cover image" },
  { value: "front", label: "Front", helper: "Front exterior shot" },
  { value: "rear", label: "Rear", helper: "Rear exterior shot" },
  { value: "interior", label: "Interior", helper: "Cabin details" },
  { value: "damage", label: "Damage", helper: "Damage documentation" },
];

const statusLabel: Record<UploadQueueItem<File, VehicleUploadMeta>["status"], string> = {
  queued: "Queued",
  uploading: "Uploading",
  success: "Processed",
  error: "Failed",
};

export const VehicleMediaUploader: React.FC<VehicleMediaUploaderProps> = ({
  vehicleId,
  defaultKind = "front",
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedKind, setSelectedKind] = useState<VehicleMediaKind>(defaultKind);
  const lastSucceeded = useRef(new Set<string>());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { items: uploads, enqueue, cancel, retry, remove } = useUploadQueue<File, VehicleUploadMeta, { record?: { id: string } }>(
    {
      context: "uploading vehicle media",
      uploadFn: async ({ item, signal, updateProgress }) => {
        const file = item.payload;
        const kind = item.meta?.kind ?? selectedKind;

        if (!profile?.org_id) {
          throw new Error("Organization context is missing for this user");
        }

        if (!vehicleId) {
          throw new Error("Vehicle context is required to upload media");
        }

        if (signal.aborted) {
          const error = new Error("Upload cancelled");
          error.name = "AbortError";
          throw error;
        }

        updateProgress(10);

        const formData = new FormData();
        formData.append("vehicleId", vehicleId);
        formData.append("orgId", profile.org_id);
        formData.append("kind", kind);
        formData.append("file", file);
        formData.append("fileName", file.name);

        updateProgress(35);

        const { data, error } = await supabase.functions.invoke("media-process", {
          body: formData,
        });

        if (signal.aborted) {
          const abortError = new Error("Upload cancelled");
          abortError.name = "AbortError";
          throw abortError;
        }

        if (error) {
          throw new Error(error.message ?? "Failed to upload media");
        }

        updateProgress(95);

        return data as { record?: { id: string } } | null;
      },
      onSuccess: async (item) => {
        if (vehicleId) {
          await queryClient.invalidateQueries({ queryKey: ["vehicle-media", vehicleId] });
        }

        toast({
          title: "Upload complete",
          description: `${item.fileName} has been processed successfully`,
        });
      },
      onError: (_item, friendly) => {
        toast({
          title: friendly.title,
          description: friendly.description,
          variant: "destructive",
        });
      },
    },
  );

  useEffect(() => {
    uploads.forEach((item) => {
      if (item.status === "success" && !lastSucceeded.current.has(item.id)) {
        lastSucceeded.current.add(item.id);
        setSuccessMessage(`${item.fileName} uploaded`);
      }
    });
  }, [uploads]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    uploads.forEach((item) => {
      if (item.status === "success") {
        timers.push(
          setTimeout(() => {
            remove(item.id);
          }, 2400),
        );
      }

      if (item.status === "error") {
        timers.push(
          setTimeout(() => {
            remove(item.id);
          }, 10000),
        );
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [uploads, remove]);

  const updateKind = useCallback((value: VehicleMediaKind) => {
    setSelectedKind(value);
  }, []);

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming).filter((file) => file.type.startsWith("image/"));

      if (!files.length) {
        toast({
          title: "No compatible files",
          description: "Only image files can be uploaded",
          variant: "destructive",
        });
        return;
      }

      enqueue(
        files.map((file) => ({
          fileName: file.name,
          size: file.size,
          payload: file,
          meta: { kind: selectedKind },
        })),
      );
    },
    [enqueue, selectedKind, toast],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (!vehicleId) return;
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles, vehicleId],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        handleFiles(event.target.files);
        event.target.value = "";
      }
    },
    [handleFiles],
  );

  return (
    <Card className="border-dashed border-muted-foreground/40 bg-muted/40">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-5 w-5 text-primary" />
            Upload vehicle photos
          </CardTitle>
          <Badge variant="outline" className="bg-background/70">
            Private bucket • Optimised via edge
          </Badge>
        </div>
        {successMessage && (
          <SuccessCheck
            message={successMessage}
            className="mt-2"
            onDone={() => setSuccessMessage(null)}
          />
        )}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Drag & drop up to 20 images at a time. Supported formats: JPEG, PNG, HEIC, WebP.
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedKind} onValueChange={updateKind}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select photo type" />
              </SelectTrigger>
              <SelectContent>
                {mediaKindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.helper}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBrowseClick}
              disabled={!vehicleId}
              data-vehicle-media-upload-trigger
            >
              <Upload className="mr-2 h-4 w-4" />
              Browse
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-background/60 text-center transition-all",
            isDragging && "border-primary bg-primary/5",
            !vehicleId && "pointer-events-none opacity-60",
          )}
        >
          <div className="pointer-events-none">
            <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop vehicle photos here</p>
            <p className="text-xs text-muted-foreground">
              Files are optimised automatically and stored securely.
            </p>
          </div>
        </div>

        {uploads.length > 0 && (
          <ScrollArea className="mt-4 max-h-48" role="region" aria-live="polite">
            <div className="space-y-3 pr-2">
              {uploads.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-muted-foreground/20 bg-background/60 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mediaKindOptions.find((option) => option.value === (item.meta?.kind ?? selectedKind))?.label ??
                          item.meta?.kind ?? "Unknown"}
                        {" • "}
                        {item.size ? (item.size / 1024 / 1024).toFixed(2) : "--"} MB
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "success"
                          ? "default"
                          : item.status === "error"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {statusLabel[item.status]}
                    </Badge>
                  </div>
                  <Progress value={item.progress} className="mt-3 h-2" />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {item.error && <span className="text-destructive">{item.error}</span>}
                    <div className="ml-auto flex items-center gap-2">
                      {item.status === "uploading" && (
                        <Button variant="ghost" size="xs" onClick={() => cancel(item.id)}>
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      )}
                      {item.status === "queued" && (
                        <Button variant="ghost" size="xs" onClick={() => cancel(item.id)}>
                          <X className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      )}
                      {item.status === "error" && (
                        <>
                          <Button variant="secondary" size="xs" onClick={() => retry(item.id)}>
                            <RotateCcw className="mr-1 h-3 w-3" /> Retry
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => remove(item.id)}>
                            <X className="mr-1 h-3 w-3" /> Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
