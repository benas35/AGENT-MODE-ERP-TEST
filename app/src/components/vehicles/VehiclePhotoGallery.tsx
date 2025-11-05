import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleMediaGallery } from "@/features/vehicle-media/VehicleMediaGallery";
import { VehicleMediaUploader } from "@/features/vehicle-media/VehicleMediaUploader";
import { Camera, Images } from "lucide-react";

interface VehiclePhotoGalleryProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VehiclePhotoGallery: React.FC<VehiclePhotoGalleryProps> = ({
  vehicleId,
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden p-0">
        <DialogHeader className="border-b border-muted-foreground/20 bg-background/95 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Images className="h-5 w-5 text-primary" />
            Vehicle Media Library
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="library" className="flex flex-col gap-0">
          <TabsList className="mx-6 mt-4 w-fit rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Images className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="px-6 py-6">
            <VehicleMediaUploader vehicleId={vehicleId} />
          </TabsContent>
          <TabsContent value="library" className="px-6 pb-8 pt-4">
            <VehicleMediaGallery vehicleId={vehicleId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
