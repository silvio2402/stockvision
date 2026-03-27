import React, { useRef, useState } from "react";
import { Camera, X, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { CameraPreview } from "../components/camera/CameraPreview";
import { useCaptureImage } from "../hooks/useDetections";
import { useCamera } from "../hooks/useCamera";
import { Button } from "../components/layout/ui";

export function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { captureFrame } = useCamera(videoRef);
  const captureImage = useCaptureImage();
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  const handleCapture = async () => {
    try {
      const blob = await captureFrame();
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });

      const result = await captureImage.mutateAsync({ file });
      setLastCapture(result.image_path);
      
      // Auto-hide the capture after 3 seconds if needed, or keep it visible
    } catch (error) {
      console.error("Capture failed:", error);
      alert("Failed to capture image");
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Header / Controls */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <Link
          to="/"
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
        >
          <X className="h-10 w-10" />
        </Link>
        <div className="flex flex-col items-end">
          <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-1">Live Monitor</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">CAM-01 ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="w-full h-full relative group">
        <CameraPreview videoRef={videoRef} />
        
        {/* Processing Overlay (if triggered automatically in future) */}
        {captureImage.isPending && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-6 z-30 transition-all">
            <div className="relative">
              <RefreshCw className="h-16 w-16 animate-spin text-blue-500" />
              <Camera className="h-6 w-6 absolute inset-0 m-auto text-white" />
            </div>
            <div className="text-2xl font-light tracking-tight text-blue-100">Analyzing Shelf Content...</div>
          </div>
        )}

        {/* Framing Guide / Scan Line effect */}
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 flex items-center justify-center">
          <div className="w-3/4 h-3/4 border border-white/10 rounded-3xl relative overflow-hidden">
             {/* Subtle scan line animation */}
             <div className="absolute inset-x-0 h-[2px] bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan" />
             
             {/* Corner brackets */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-xl" />
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-xl" />
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-xl" />
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-xl" />
          </div>
        </div>
      </div>

      {/* Bottom Tray (Auto-hides) */}
      {lastCapture && (
        <div className="absolute bottom-10 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="relative group">
            <img
              src={`/api/images/${lastCapture}`}
              alt="Last capture"
              className="h-20 w-32 object-cover rounded-2xl border border-white/10"
            />
            <div className="absolute inset-0 bg-blue-600/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="pr-2">
            <div className="text-white text-lg font-medium tracking-tight">Detection Successful</div>
            <div className="text-white/50 text-sm">System updated with latest telemetry</div>
          </div>
          <button 
            onClick={() => setLastCapture(null)}
            className="p-2 text-white/30 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}