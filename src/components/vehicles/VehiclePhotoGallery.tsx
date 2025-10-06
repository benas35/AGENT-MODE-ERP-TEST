import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { useVehicleMedia } from '@/hooks/useVehicleMedia';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Camera } from 'lucide-react';

interface VehiclePhotoGalleryProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VehiclePhotoGallery: React.FC<VehiclePhotoGalleryProps> = ({
  vehicleId,
  open,
  onOpenChange
}) => {
  const { media, addMedia, deleteMedia } = useVehicleMedia(vehicleId);
  const [selectedKind, setSelectedKind] = useState<'hero' | 'front' | 'rear' | 'interior' | 'damage' | 'other'>('other');

  const handleUploadComplete = async (path: string) => {
    await addMedia(path, selectedKind);
  };

  const handleDelete = async (path: string) => {
    const mediaItem = media.find(m => m.storage_path === path);
    if (mediaItem) {
      await deleteMedia(mediaItem.id, path);
    }
  };

  const groupedMedia = {
    hero: media.filter(m => m.kind === 'hero'),
    front: media.filter(m => m.kind === 'front'),
    rear: media.filter(m => m.kind === 'rear'),
    interior: media.filter(m => m.kind === 'interior'),
    damage: media.filter(m => m.kind === 'damage'),
    other: media.filter(m => m.kind === 'other')
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Vehicle Photo Gallery
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All ({media.length})</TabsTrigger>
            <TabsTrigger value="hero">Hero ({groupedMedia.hero.length})</TabsTrigger>
            <TabsTrigger value="front">Front ({groupedMedia.front.length})</TabsTrigger>
            <TabsTrigger value="rear">Rear ({groupedMedia.rear.length})</TabsTrigger>
            <TabsTrigger value="interior">Interior ({groupedMedia.interior.length})</TabsTrigger>
            <TabsTrigger value="damage">Damage ({groupedMedia.damage.length})</TabsTrigger>
            <TabsTrigger value="other">Other ({groupedMedia.other.length})</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Photo Category</label>
              <Select value={selectedKind} onValueChange={(v: any) => setSelectedKind(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero Image</SelectItem>
                  <SelectItem value="front">Front View</SelectItem>
                  <SelectItem value="rear">Rear View</SelectItem>
                  <SelectItem value="interior">Interior</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all">
              <ImageUploader
                bucket="vehicles"
                onUploadComplete={handleUploadComplete}
                existingImages={media.map(m => ({ path: m.storage_path, url: m.url }))}
                onDelete={handleDelete}
                maxFiles={20}
              />
            </TabsContent>

            {Object.entries(groupedMedia).map(([kind, items]) => (
              <TabsContent key={kind} value={kind}>
                <ImageUploader
                  bucket="vehicles"
                  onUploadComplete={handleUploadComplete}
                  existingImages={items.map(m => ({ path: m.storage_path, url: m.url }))}
                  onDelete={handleDelete}
                  maxFiles={10}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
