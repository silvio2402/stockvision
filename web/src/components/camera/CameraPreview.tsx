import React from "react";
import { Camera, Video, VideoOff } from "lucide-react";
import { useCamera } from "../../hooks/useCamera";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function CameraPreview({ videoRef }: CameraPreviewProps) {
  const { startCamera, stopCamera } = useCamera(videoRef);
  const [isActive, setIsActive] = React.useState(false);

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

  return (
    <div className="w-full h-full relative group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 transition-all duration-500">
          <div className="flex flex-col items-center gap-6 p-8 rounded-3xl border border-white/10 bg-white/5">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <Camera className="h-10 w-10 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="text-white text-xl font-medium mb-1 tracking-tight">System Monitor Offline</div>
              <p className="text-white/40 text-sm">Please initialize the camera feed</p>
            </div>
            <button
              onClick={handleToggleCamera}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/40 flex items-center gap-2"
            >
              <Video className="h-5 w-5" />
              Initialize Live Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}