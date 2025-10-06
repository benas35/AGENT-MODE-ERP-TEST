import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkOrderMedia {
  id: string;
  work_order_id: string;
  storage_path: string;
  kind: 'before' | 'during' | 'after' | 'damage' | 'repair' | 'other';
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
  url: string;
}

export const useWorkOrderMedia = (workOrderId?: string) => {
  const [media, setMedia] = useState<WorkOrderMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMedia = async () => {
    if (!workOrderId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_order_media')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const mediaWithUrls = await Promise.all(
        (data || []).map(async (item) => {
          const { data: urlData } = supabase.storage
            .from('work-order-photos')
            .getPublicUrl(item.storage_path);

          return {
            id: item.id,
            work_order_id: item.work_order_id,
            storage_path: item.storage_path,
            kind: item.kind as WorkOrderMedia['kind'],
            description: item.description,
            uploaded_by: item.uploaded_by,
            uploaded_at: item.uploaded_at,
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
  }, [workOrderId]);

  const addMedia = async (
    storagePath: string,
    kind: WorkOrderMedia['kind'] = 'other',
    description?: string
  ) => {
    if (!workOrderId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, id')
        .eq('id', user.user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('work_order_media')
        .insert({
          work_order_id: workOrderId,
          org_id: profile.org_id,
          storage_path: storagePath,
          kind,
          description,
          uploaded_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('work-order-photos')
        .getPublicUrl(data.storage_path);

      const newMedia: WorkOrderMedia = {
        id: data.id,
        work_order_id: data.work_order_id,
        storage_path: data.storage_path,
        kind: data.kind as WorkOrderMedia['kind'],
        description: data.description,
        uploaded_by: data.uploaded_by,
        uploaded_at: data.uploaded_at,
        url: urlData.publicUrl
      };

      setMedia(prev => [newMedia, ...prev]);
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
        .from('work_order_media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from('work-order-photos')
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
