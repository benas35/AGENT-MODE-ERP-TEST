import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  bucket: 'vehicle-photos' | 'work-order-photos';
  onUploadComplete: (path: string, file: File) => void;
  maxFiles?: number;
  existingImages?: Array<{ path: string; url: string }>;
  onDelete?: (path: string) => void;
  disabled?: boolean;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  bucket,
  onUploadComplete,
  maxFiles = 10,
  existingImages = [],
  onDelete,
  disabled = false,
  label = 'Upload Photos'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return filePath;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - existingImages.length;
    if (files.length > remainingSlots) {
      toast({
        title: 'Too many files',
        description: `You can only upload ${remainingSlots} more file(s)`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file',
            description: `${file.name} is not an image`,
            variant: 'destructive'
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
            variant: 'destructive'
          });
          continue;
        }

        const path = await uploadFile(file);
        onUploadComplete(path, file);
      }

      toast({
        title: 'Upload successful',
        description: `${files.length} photo(s) uploaded`
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  }, [bucket, onUploadComplete, maxFiles, existingImages.length, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDelete = async (path: string) => {
    if (!onDelete) return;

    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      onDelete(path);
      toast({
        title: 'Photo deleted',
        description: 'Photo removed successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {label && <Label>{label}</Label>}
      
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drag & drop photos here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxFiles} photos, up to 10MB each
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="file-upload"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={disabled || uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading || existingImages.length >= maxFiles}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Select Photos
            </Button>
          </div>
        )}
      </div>

      {/* Existing Images Grid */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {existingImages.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
                loading="lazy"
              />
              {onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(image.path)}
                  className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {existingImages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No photos uploaded yet</p>
        </div>
      )}
    </div>
  );
};
