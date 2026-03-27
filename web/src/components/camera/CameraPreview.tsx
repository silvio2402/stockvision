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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Camera Preview</h3>
        <div className="flex items-center gap-2">
          {isActive ? (
            <div className="flex items-center gap-2 text-green-600">
              <Video className="h-4 w-4" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <VideoOff className="h-4 w-4" />
              <span className="text-sm">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      <div className=" bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      <button
        onClick={handleToggleCamera}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Camera className="h-5 w-5" />
        <span>{isActive ? "Stop Camera" : "Start Camera"}</span>
      </button>
    </div>
  );
}