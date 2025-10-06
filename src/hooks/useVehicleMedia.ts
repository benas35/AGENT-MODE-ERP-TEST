import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VehicleMedia {
  id: string;
  vehicle_id: string;
  storage_path: string;
  kind: 'hero' | 'front' | 'rear' | 'interior' | 'damage' | 'other';
  url: string;
}

export const useVehicleMedia = (vehicleId?: string) => {
  const [media, setMedia] = useState<VehicleMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMedia = async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_media')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('kind');

      if (error) throw error;

      const mediaWithUrls = await Promise.all(
        (data || []).map(async (item) => {
          const { data: urlData } = supabase.storage
            .from('vehicles')
            .getPublicUrl(item.storage_path);

          return {
            id: item.id,
            vehicle_id: item.vehicle_id,
            storage_path: item.storage_path,
            kind: item.kind as VehicleMedia['kind'],
            url: urlData.publicUrl
          };
        })
      );

      setMedia(mediaWithUrls);
    } catch (error: any) {
      toast({
        title: 'Failed to load photos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [vehicleId]);

  const addMedia = async (
    storagePath: string,
    kind: VehicleMedia['kind'] = 'other'
  ) => {
    if (!vehicleId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('vehicle_media')
        .insert({
          vehicle_id: vehicleId,
          org_id: profile.org_id,
          storage_path: storagePath,
          kind,
          file_name: storagePath.split('/').pop() || '',
          mime_type: 'image/jpeg',
          created_by: profile.org_id
        })
        .select()
        .single();

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('vehicles')
        .getPublicUrl(data.storage_path);

      const newMedia: VehicleMedia = {
        id: data.id,
        vehicle_id: data.vehicle_id,
        storage_path: data.storage_path,
        kind: data.kind as VehicleMedia['kind'],
        url: urlData.publicUrl
      };

      setMedia(prev => [...prev, newMedia]);
    } catch (error: any) {
      toast({
        title: 'Failed to save photo',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteMedia = async (mediaId: string, storagePath: string) => {
    try {
      const { error: dbError } = await supabase
        .from('vehicle_media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from('vehicles')
        .remove([storagePath]);

      if (storageError) throw storageError;

      setMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch (error: any) {
      toast({
        title: 'Failed to delete photo',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    media,
    loading,
    addMedia,
    deleteMedia,
    refreshMedia: fetchMedia
  };
};
