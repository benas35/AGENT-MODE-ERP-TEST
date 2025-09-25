import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VehicleThumbnailProps {
  vehicleId?: string;
  make?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const MAKE_LOGOS: Record<string, string> = {
  'audi': '🚗',
  'bmw': '🚗', 
  'mercedes': '🚗',
  'mercedes-benz': '🚗',
  'volkswagen': '🚗',
  'vw': '🚗',
  'toyota': '🚗',
  'honda': '🚗',
  'ford': '🚙',
  'chevrolet': '🚙',
  'nissan': '🚗',
  'hyundai': '🚗',
  'kia': '🚗',
  'mazda': '🚗',
  'subaru': '🚗',
  'volvo': '🚗',
  'porsche': '🏎️',
  'ferrari': '🏎️',
  'lamborghini': '🏎️',
  'tesla': '🚗',
};

const SIZE_CLASSES = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6', 
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export const VehicleThumbnail: React.FC<VehicleThumbnailProps> = ({
  vehicleId,
  make,
  size = 'sm',
  className
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      return;
    }

    const fetchThumbnail = async () => {
      try {
        // Fetch vehicle media for hero image
        const { data: mediaData, error: mediaError } = await supabase
          .from('vehicle_media')
          .select('storage_path')
          .eq('vehicle_id', vehicleId)
          .eq('kind', 'hero')
          .limit(1)
          .single();

        if (mediaError || !mediaData) {
          setError(true);
          setLoading(false);
          return;
        }

        // Get public URL for the image
        const { data: urlData } = supabase.storage
          .from('vehicles')
          .getPublicUrl(mediaData.storage_path);

        if (urlData?.publicUrl) {
          setThumbnailUrl(urlData.publicUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching vehicle thumbnail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnail();
  }, [vehicleId]);

  const getMakeLogo = (make?: string) => {
    if (!make) return '🚗';
    const normalizedMake = make.toLowerCase().replace(/\s+/g, '');
    return MAKE_LOGOS[normalizedMake] || '🚗';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={cn(
          "flex items-center justify-center bg-muted rounded animate-pulse",
          SIZE_CLASSES[size]
        )}>
          <Car className="h-1/2 w-1/2 text-muted-foreground" />
        </div>
      );
    }

    if (thumbnailUrl && !error) {
      return (
        <img
          src={thumbnailUrl}
          alt="Vehicle thumbnail"
          className={cn(
            "object-cover rounded border border-border",
            SIZE_CLASSES[size]
          )}
          onError={() => setError(true)}
          loading="lazy"
        />
      );
    }

    // Fallback to make logo or generic car icon
    if (make) {
      return (
        <div className={cn(
          "flex items-center justify-center bg-muted rounded text-muted-foreground",
          SIZE_CLASSES[size]
        )}>
          <span className="text-sm">
            {getMakeLogo(make)}
          </span>
        </div>
      );
    }

    // Generic car icon fallback
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded",
        SIZE_CLASSES[size]
      )}>
        <Car className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className={cn("flex-shrink-0", className)}>
      {renderContent()}
    </div>
  );
};