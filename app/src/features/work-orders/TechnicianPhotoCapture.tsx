import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload, Undo2, Trash2, MousePointer2, Circle, PenLine, Type, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WorkOrderMediaCategory } from "@/hooks/useWorkOrderMedia";
import { validateFiles } from "@/lib/fileValidation";
import { useToast } from "@/hooks/use-toast";

export type AnnotationTool = "pen" | "arrow" | "circle" | "text";

interface Point {
  x: number;
  y: number;
}

interface PathAnnotation {
  id: string;
  type: "path";
  points: Point[];
  color: string;
  size: number;
}

interface ArrowAnnotation {
  id: string;
  type: "arrow";
  start: Point;
  end: Point;
  color: string;
  size: number;
}

interface CircleAnnotation {
  id: string;
  type: "circle";
  center: Point;
  radius: number;
  color: string;
  size: number;
}

interface TextAnnotation {
  id: string;
  type: "text";
  position: Point;
  text: string;
  color: string;
  size: number;
}

type Annotation = PathAnnotation | ArrowAnnotation | CircleAnnotation | TextAnnotation;

const categoryOptions: { value: WorkOrderMediaCategory; label: string; description: string }[] = [
  { value: "before", label: "Before", description: "Document condition before work starts" },
  { value: "issue", label: "Issue", description: "Capture problems that require approval" },
  { value: "progress", label: "Progress", description: "Share in-progress milestones" },
  { value: "damage", label: "Damage", description: "Note existing or discovered damage" },
  { value: "after", label: "After", description: "Prove results after work is complete" },
];

const colorPalette = [
  { label: "Pro Red", value: "#e11d48" },
  { label: "Electric Blue", value: "#2563eb" },
  { label: "Workshop Green", value: "#16a34a" },
  { label: "Sunset Orange", value: "#f97316" },
  { label: "Slate", value: "#334155" },
];

interface TechnicianPhotoCaptureProps {
  onUpload: (payload: {
    file: File;
    category: WorkOrderMediaCategory;
    caption?: string | null;
    gps?: { lat: number; lng: number; accuracy?: number } | null;
  }) => Promise<unknown>;
  isUploading?: boolean;
  defaultCategory?: WorkOrderMediaCategory;
}

const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point, color: string, size: number) => {
  const headLength = 12 + size * 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size + 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
};

const drawCircle = (ctx: CanvasRenderingContext2D, annotation: CircleAnnotation) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = annotation.size + 2;
  ctx.beginPath();
  ctx.arc(annotation.center.x, annotation.center.y, Math.max(annotation.radius, 4), 0, 2 * Math.PI);
  ctx.stroke();
};

const drawText = (ctx: CanvasRenderingContext2D, annotation: TextAnnotation) => {
  ctx.fillStyle = annotation.color;
  ctx.font = `${Math.max(16, annotation.size * 8)}px "Inter", "system-ui"`;
  ctx.textBaseline = "top";
  ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
};

const drawPath = (ctx: CanvasRenderingContext2D, annotation: PathAnnotation) => {
  if (!annotation.points.length) return;
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = annotation.size + 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
  annotation.points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
};

const renderAnnotations = (
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  draft?: Annotation | null,
) => {
  annotations.forEach((annotation) => {
    if (annotation.type === "path") drawPath(ctx, annotation);
    if (annotation.type === "arrow") drawArrow(ctx, annotation.start, annotation.end, annotation.color, annotation.size);
    if (annotation.type === "circle") drawCircle(ctx, annotation);
    if (annotation.type === "text") drawText(ctx, annotation);
  });

  if (draft) {
    if (draft.type === "path") drawPath(ctx, draft);
    if (draft.type === "arrow") drawArrow(ctx, draft.start, draft.end, draft.color, draft.size);
    if (draft.type === "circle") drawCircle(ctx, draft);
    if (draft.type === "text") drawText(ctx, draft);
  }
};

export const TechnicianPhotoCapture: React.FC<TechnicianPhotoCaptureProps> = ({
  onUpload,
  isUploading,
  defaultCategory = "issue",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("pen");
  const [strokeColor, setStrokeColor] = useState(colorPalette[0].value);
  const [strokeSize, setStrokeSize] = useState(2);
  const [category, setCategory] = useState<WorkOrderMediaCategory>(defaultCategory);
  const [caption, setCaption] = useState("");
  const [includeLocation, setIncludeLocation] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState<Point | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const hasImage = Boolean(selectedImage);

  const enableLocation = useCallback(() => {
    if (!includeLocation) {
      setGps(null);
      return;
    }

    if (!navigator.geolocation) {
      setGps(null);
      return;
    }

    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsRequestingLocation(false);
      },
      () => {
        setGps(null);
        setIncludeLocation(false);
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000 * 30 },
    );
  }, [includeLocation]);

  useEffect(() => {
    if (includeLocation) {
      enableLocation();
    }
  }, [includeLocation, enableLocation]);

  const resetCapture = useCallback(() => {
    setSelectedImage(null);
    setRawFile(null);
    setAnnotations([]);
    setDraftAnnotation(null);
    setCaption("");
    setPendingText("");
    setPendingTextPosition(null);
  }, []);

  const handleFile = useCallback(async (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSelectedImage(result);
        setRawFile(file);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = event.target.files ?? [];
      const { valid, rejected } = validateFiles(incoming, {
        allowedMimePrefixes: ["image/"],
        allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".heic"],
        maxFileSizeMb: 12,
      });

      if (rejected.length) {
        toast({
          title: "Invalid file",
          description: rejected.join("; "),
          variant: "destructive",
        });
      }

      const file = valid[0];
      if (file) {
        handleFile(file);
      }
      event.target.value = "";
    },
    [handleFile, toast],
  );

  const loadImage = useCallback(() => {
    if (!selectedImage || !canvasRef.current) return;
    const image = new Image();
    image.src = selectedImage;
    image.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, image.width, image.height);
      imageRef.current = image;
      renderAnnotations(ctx, annotations);
    };
  }, [annotations, selectedImage]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(imageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    renderAnnotations(ctx, annotations, draftAnnotation);
  }, [annotations, draftAnnotation]);

  const getPointerPosition = useCallback((event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = canvasRef.current ? canvasRef.current.width / rect.width : 1;
    const scaleY = canvasRef.current ? canvasRef.current.height / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const point = getPointerPosition(event);

    if (activeTool === "text") {
      setPendingTextPosition(point);
      setPendingText("");
      setTextDialogOpen(true);
      return;
    }

    setIsDrawing(true);

    if (activeTool === "pen") {
      const annotation: PathAnnotation = {
        id: crypto.randomUUID(),
        type: "path",
        points: [point],
        color: strokeColor,
        size: strokeSize,
      };
      setDraftAnnotation(annotation);
    }

    if (activeTool === "arrow") {
      const annotation: ArrowAnnotation = {
        id: crypto.randomUUID(),
        type: "arrow",
        start: point,
        end: point,
        color: strokeColor,
        size: strokeSize,
      };
      setDraftAnnotation(annotation);
    }

    if (activeTool === "circle") {
      const annotation: CircleAnnotation = {
        id: crypto.randomUUID(),
        type: "circle",
        center: point,
        radius: 0,
        color: strokeColor,
        size: strokeSize,
      };
      setDraftAnnotation(annotation);
    }
  }, [activeTool, getPointerPosition, hasImage, strokeColor, strokeSize]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !draftAnnotation) return;
    const point = getPointerPosition(event);

    if (draftAnnotation.type === "path") {
      setDraftAnnotation({ ...draftAnnotation, points: [...draftAnnotation.points, point] });
    }

    if (draftAnnotation.type === "arrow") {
      setDraftAnnotation({ ...draftAnnotation, end: point });
    }

    if (draftAnnotation.type === "circle") {
      const radius = Math.sqrt(
        Math.pow(point.x - draftAnnotation.center.x, 2) + Math.pow(point.y - draftAnnotation.center.y, 2),
      );
      setDraftAnnotation({ ...draftAnnotation, radius });
    }
  }, [draftAnnotation, getPointerPosition, isDrawing]);

  const handlePointerUp = useCallback(() => {
    if (!draftAnnotation) {
      setIsDrawing(false);
      return;
    }

    if (draftAnnotation.type === "path" && draftAnnotation.points.length < 2) {
      setDraftAnnotation(null);
      setIsDrawing(false);
      return;
    }

    setAnnotations((previous) => [...previous, draftAnnotation]);
    setDraftAnnotation(null);
    setIsDrawing(false);
  }, [draftAnnotation]);

  const undoLast = useCallback(() => {
    setAnnotations((previous) => previous.slice(0, -1));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setDraftAnnotation(null);
  }, []);

  const confirmTextAnnotation = useCallback(() => {
    if (!pendingTextPosition || !pendingText.trim()) {
      setTextDialogOpen(false);
      return;
    }

    const annotation: TextAnnotation = {
      id: crypto.randomUUID(),
      type: "text",
      position: pendingTextPosition,
      text: pendingText.trim(),
      color: strokeColor,
      size: strokeSize,
    };

    setAnnotations((previous) => [...previous, annotation]);
    setTextDialogOpen(false);
    setPendingText("");
    setPendingTextPosition(null);
  }, [pendingText, pendingTextPosition, strokeColor, strokeSize]);

  const createAnnotatedFile = useCallback(async () => {
    if (!canvasRef.current || !imageRef.current || !rawFile) return null;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvasRef.current.width;
    exportCanvas.height = canvasRef.current.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(imageRef.current, 0, 0, exportCanvas.width, exportCanvas.height);
    renderAnnotations(ctx, annotations);
    const blob = await new Promise<Blob | null>((resolve) => exportCanvas.toBlob(resolve, rawFile.type, 0.92));
    if (!blob) return null;
    return new File([blob], rawFile.name.replace(/\.[^.]+$/, "") + "-annotated.webp", { type: "image/webp" });
  }, [annotations, rawFile]);

  const handleUpload = useCallback(async () => {
    if (!rawFile) return;
    const annotated = await createAnnotatedFile();
    const fileToUpload = annotated ?? rawFile;
    await onUpload({
      file: fileToUpload,
      category,
      caption: caption.trim() ? caption.trim() : null,
      gps: includeLocation ? gps : null,
    });
    resetCapture();
  }, [caption, category, createAnnotatedFile, gps, includeLocation, onUpload, rawFile, resetCapture]);

  return (
    <Card className="bg-muted/40 border-dashed">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Technician capture
            </CardTitle>
            <CardDescription>Use your camera to document work order evidence with markup.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-background/70">Private upload</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={category} onValueChange={(value) => setCategory(value as WorkOrderMediaCategory)}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-full min-w-max justify-start">
              {categoryOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="flex flex-col items-start gap-1 px-4 py-3">
                  <span className="font-semibold text-sm">{option.label}</span>
                  <span className="text-xs text-muted-foreground max-w-[220px] text-left">{option.description}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          {categoryOptions.map((option) => (
            <TabsContent key={option.value} value={option.value} className="text-sm text-muted-foreground" />
          ))}
        </Tabs>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div>
            <div
              className={cn(
                "relative flex aspect-video items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-background/60",
                hasImage ? "overflow-hidden" : "cursor-pointer hover:border-primary/70 transition",
              )}
              onClick={() => !hasImage && fileInputRef.current?.click()}
            >
              {!hasImage && (
                <div className="flex flex-col items-center gap-3 text-muted-foreground p-10 text-center">
                  <Camera className="h-10 w-10" />
                  <p className="text-sm font-medium">Tap to launch camera or upload from gallery</p>
                  <p className="text-xs">HEIC, JPG, PNG supported • Optimised automatically</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" /> Capture
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </div>
                </div>
              )}

              {hasImage && (
                <div className="relative h-full w-full">
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Annotation tools</span>
                <div className="text-xs text-muted-foreground">{annotations.length} marks</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant={activeTool === "pen" ? "default" : "outline"}
                  onClick={() => setActiveTool("pen")}
                >
                  <PenLine className="mr-2 h-4 w-4" /> Pen
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={activeTool === "arrow" ? "default" : "outline"}
                  onClick={() => setActiveTool("arrow")}
                >
                  <MousePointer2 className="mr-2 h-4 w-4" /> Arrow
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={activeTool === "circle" ? "default" : "outline"}
                  onClick={() => setActiveTool("circle")}
                >
                  <Circle className="mr-2 h-4 w-4" /> Circle
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={activeTool === "text" ? "default" : "outline"}
                  onClick={() => setActiveTool("text")}
                >
                  <Type className="mr-2 h-4 w-4" /> Text
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Marker colour</Label>
                <div className="flex flex-wrap gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setStrokeColor(color.value)}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 transition",
                        strokeColor === color.value
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-transparent hover:border-muted-foreground/40",
                      )}
                      style={{ background: color.value }}
                      aria-label={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Stroke size</Label>
                <Slider
                  defaultValue={[strokeSize]}
                  min={1}
                  max={6}
                  step={1}
                  onValueChange={(values) => setStrokeSize(values[0] ?? 2)}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Switch checked={includeLocation} onCheckedChange={setIncludeLocation} id="include-location" />
                  <Label htmlFor="include-location" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Attach GPS
                  </Label>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isRequestingLocation
                    ? "Fetching..."
                    : gps
                    ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)} ±${gps.accuracy?.toFixed(0) ?? ""}m`
                    : "Disabled"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={undoLast} disabled={!annotations.length}>
                  <Undo2 className="mr-2 h-4 w-4" /> Undo
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAnnotations} disabled={!annotations.length}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear all
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="photo-caption" className="text-sm font-medium">Caption (optional)</Label>
              <Input
                id="photo-caption"
                placeholder="Add a short description for advisors and customers"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                disabled={!hasImage}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!hasImage || isUploading}
              onClick={handleUpload}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Save to work order"}
            </Button>

            {hasImage && (
              <Button type="button" variant="ghost" className="w-full" onClick={resetCapture}>
                Retake photo
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add label</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Describe the highlight"
            value={pendingText}
            onChange={(event) => setPendingText(event.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTextDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmTextAnnotation}>Place label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
