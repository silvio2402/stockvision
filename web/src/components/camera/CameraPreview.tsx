import React from "react";
import { Camera, Video, RefreshCw } from "lucide-react";
import { useCamera } from "../../hooks/useCamera";
import { useTriggerScan } from "../../hooks/useDetections";
import { Button } from "../layout/ui";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function CameraPreview({ videoRef }: CameraPreviewProps) {
  const { startCamera, stopCamera } = useCamera(videoRef);
  const [isActive, setIsActive] = React.useState(false);
  const triggerScan = useTriggerScan();

  const handleToggleCamera = async () => {
    if (isActive) {
      stopCamera();
      setIsActive(false);
    } else {
      try {
        await startCamera();
        setIsActive(true);
      } catch (error) {
        console.error("Failed to start camera:", error);
        alert("Failed to access camera. Please ensure camera permissions are granted.");
      }
    }
  };

  const handleScan = () => {
    triggerScan.mutate("camera-1");
  };

  return (
    <div className="w-full h-full relative bg-gray-100 flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isActive ? 'hidden' : ''}`}
      />
      
      {isActive && (
        <div className="absolute top-4 right-4 z-40">
          <Button 
            onClick={handleScan} 
            disabled={triggerScan.isPending}
            className="shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerScan.isPending ? "animate-spin" : ""}`} />
            {triggerScan.isPending ? "Scanning..." : "Scan Now"}
          </Button>
        </div>
      )}
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-30">
          <div className="flex flex-col items-center gap-4 p-6 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <div className="text-gray-900 text-lg font-medium mb-1">Camera is off</div>
              <p className="text-gray-500 text-sm">Please allow camera access to take a photo of the shelf.</p>
            </div>
            <Button
              onClick={handleToggleCamera}
              className="mt-2 shadow-sm"
            >
              <Video className="h-4 w-4" />
              Turn on Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
