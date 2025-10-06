import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { useWorkOrderMedia } from '@/hooks/useWorkOrderMedia';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkOrderPhotoSectionProps {
  workOrderId: string;
}

export const WorkOrderPhotoSection: React.FC<WorkOrderPhotoSectionProps> = ({
  workOrderId
}) => {
  const { media, addMedia, deleteMedia } = useWorkOrderMedia(workOrderId);
  const [selectedKind, setSelectedKind] = useState<'before' | 'during' | 'after' | 'damage' | 'repair' | 'other'>('other');

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
    before: media.filter(m => m.kind === 'before'),
    during: media.filter(m => m.kind === 'during'),
    after: media.filter(m => m.kind === 'after'),
    damage: media.filter(m => m.kind === 'damage'),
    repair: media.filter(m => m.kind === 'repair'),
    other: media.filter(m => m.kind === 'other')
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Work Order Photos
          <Badge variant="secondary">{media.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All ({media.length})</TabsTrigger>
            <TabsTrigger value="before">Before ({groupedMedia.before.length})</TabsTrigger>
            <TabsTrigger value="during">During ({groupedMedia.during.length})</TabsTrigger>
            <TabsTrigger value="after">After ({groupedMedia.after.length})</TabsTrigger>
            <TabsTrigger value="damage">Damage ({groupedMedia.damage.length})</TabsTrigger>
            <TabsTrigger value="repair">Repair ({groupedMedia.repair.length})</TabsTrigger>
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
                  <SelectItem value="before">Before Work</SelectItem>
                  <SelectItem value="during">During Work</SelectItem>
                  <SelectItem value="after">After Work</SelectItem>
                  <SelectItem value="damage">Damage Documentation</SelectItem>
                  <SelectItem value="repair">Repair Process</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all">
              <ImageUploader
                bucket="work-order-photos"
                onUploadComplete={handleUploadComplete}
                existingImages={media.map(m => ({ path: m.storage_path, url: m.url }))}
                onDelete={handleDelete}
                maxFiles={30}
                label=""
              />
            </TabsContent>

            {Object.entries(groupedMedia).map(([kind, items]) => (
              <TabsContent key={kind} value={kind}>
                <ImageUploader
                  bucket="work-order-photos"
                  onUploadComplete={handleUploadComplete}
                  existingImages={items.map(m => ({ path: m.storage_path, url: m.url }))}
                  onDelete={handleDelete}
                  maxFiles={15}
                  label=""
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
