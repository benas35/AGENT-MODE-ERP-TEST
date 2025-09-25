import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onOpenChange,
  onScan,
  title = "Scan Barcode"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Start barcode detection
      startBarcodeDetection();
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setError('Unable to access camera. Please ensure camera permissions are enabled.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!stream) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;
      
      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          // @ts-ignore - torch is not in the standard types yet
          advanced: [{ torch: !isFlashOn }]
        });
        setIsFlashOn(!isFlashOn);
      } else {
        toast.error('Flash is not supported on this device');
      }
    } catch (err) {
      console.error('Flash toggle error:', err);
      toast.error('Unable to control flash');
    }
  };

  const startBarcodeDetection = () => {
    // This is a simplified barcode detection simulation
    // In a real implementation, you would use a library like ZXing or QuaggaJS
    const detectBarcode = () => {
      if (!videoRef.current || !open) return;

      // Simulate barcode detection with canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context && videoRef.current.videoWidth > 0) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        // In a real implementation, this would process the image data
        // For demo purposes, we'll simulate finding a barcode occasionally
        if (Math.random() < 0.1) { // 10% chance to simulate detection
          const mockBarcode = `${Date.now()}-DEMO-BARCODE`;
          onScan(mockBarcode);
          return;
        }
      }

      // Continue detection
      if (open) {
        requestAnimationFrame(detectBarcode);
      }
    };

    // Start detection loop
    requestAnimationFrame(detectBarcode);
  };

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : hasCamera ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-24 border-2 border-primary rounded-lg opacity-75">
                  <div className="w-full h-full border border-white/50 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={toggleFlash}
                  className="bg-black/50 hover:bg-black/70"
                >
                  {isFlashOn ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Camera not available</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Position the barcode within the frame to scan
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleManualEntry}
              className="flex-1"
            >
              Enter Manually
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};