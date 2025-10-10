import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Upload, ImagePlus, Info } from "lucide-react";
import { VehicleMediaKind } from "@/hooks/useVehicleMedia";

interface VehicleMediaUploaderProps {
  vehicleId: string;
  defaultKind?: VehicleMediaKind;
}

type UploadStatus = "queued" | "uploading" | "success" | "error";

interface UploadItem {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  kind: VehicleMediaKind;
}

const mediaKindOptions: { value: VehicleMediaKind; label: string; helper: string }[] = [
  { value: "hero", label: "Hero", helper: "Primary cover image" },
  { value: "front", label: "Front", helper: "Front exterior shot" },
  { value: "rear", label: "Rear", helper: "Rear exterior shot" },
  { value: "interior", label: "Interior", helper: "Cabin details" },
  { value: "damage", label: "Damage", helper: "Damage documentation" },
];

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
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const updateUpload = useCallback((id: string, updater: Partial<UploadItem>) => {
    setUploads((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...updater } : item)),
    );
  }, []);

  const addUploads = useCallback((items: UploadItem[]) => {
    setUploads((previous) => [...items, ...previous]);
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, uploadId, kind }: { file: File; uploadId: string; kind: VehicleMediaKind }) => {
      if (!profile?.org_id) {
        throw new Error("Organization context is missing for this user");
      }

      updateUpload(uploadId, { status: "uploading", progress: 25, error: undefined });

      const formData = new FormData();
      formData.append("vehicleId", vehicleId);
      formData.append("orgId", profile.org_id);
      formData.append("kind", kind);
      formData.append("file", file);
      formData.append("fileName", file.name);

      const { data, error } = await supabase.functions.invoke("media-process", {
        body: formData,
      });

      if (error) {
        throw new Error(error.message ?? "Failed to upload media");
      }

      return data as { record?: { id: string } } | null;
    },
    onSuccess: async (_data, variables) => {
      updateUpload(variables.uploadId, { status: "success", progress: 100 });
      await queryClient.invalidateQueries({ queryKey: ["vehicle-media", vehicleId] });
      toast({
        title: "Upload complete",
        description: `${variables.file.name} has been processed successfully`,
      });
      setTimeout(() => removeUpload(variables.uploadId), 2200);
    },
    onError: (error: Error, variables) => {
      updateUpload(variables.uploadId, { status: "error", error: error.message, progress: 0 });
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setTimeout(() => removeUpload(variables.uploadId), 8000);
    },
  });

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

      const newUploads = files.map<UploadItem>((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        size: file.size,
        progress: 0,
        status: "queued",
        kind: selectedKind,
      }));

      addUploads(newUploads);

      newUploads.forEach((item, index) => {
        setTimeout(() => {
          uploadMutation.mutate({ file: files[index], uploadId: item.id, kind: item.kind });
        }, index * 80);
      });
    },
    [addUploads, selectedKind, toast, uploadMutation],
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
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Drag & drop up to 20 images at a time. Supported formats: JPEG, PNG, HEIC, WebP.
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedKind} onValueChange={(value: VehicleMediaKind) => setSelectedKind(value)}>
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
            <Button variant="secondary" size="sm" onClick={handleBrowseClick} disabled={!vehicleId}>
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
          <ScrollArea className="mt-4 max-h-48">
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
                        {mediaKindOptions.find((option) => option.value === item.kind)?.label ?? item.kind}
                        {" • "}
                        {(item.size / 1024 / 1024).toFixed(2)} MB
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
                      {item.status === "queued" && "Queued"}
                      {item.status === "uploading" && "Uploading"}
                      {item.status === "success" && "Processed"}
                      {item.status === "error" && "Failed"}
                    </Badge>
                  </div>
                  <Progress value={item.progress} className="mt-3 h-2" />
                  {item.error && (
                    <p className="mt-2 text-xs text-destructive">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
