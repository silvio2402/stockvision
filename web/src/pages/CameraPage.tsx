import React, { useRef, useState } from "react";
import { Camera, X, RefreshCw, CheckCircle2, Image as ImageIcon } from "lucide-react";
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
    } catch (error) {
      console.error("Capture failed:", error);
      alert("Failed to capture image. Please make sure the camera is turned on.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col md:p-6 overflow-hidden">
      <div className="flex items-center justify-between p-4 md:p-0 md:mb-6 bg-white md:bg-transparent border-b border-gray-200 md:border-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
            <Camera className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Take Photo</h1>
            <p className="text-sm text-gray-500 hidden md:block">Capture shelf images for analysis</p>
          </div>
        </div>
        <Link
          to="/"
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-6 w-6" />
        </Link>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row gap-6 max-w-6xl mx-auto w-full h-full min-h-0">
        
        <div className="flex-1 relative bg-black md:rounded-2xl overflow-hidden shadow-sm border-y md:border border-gray-200 flex flex-col min-h-0">
          <CameraPreview videoRef={videoRef} />
          
          {captureImage.isPending && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-gray-900 space-y-4 z-30">
              <RefreshCw className="h-10 w-10 animate-spin text-blue-600" />
              <div className="text-lg font-medium">Analyzing Image...</div>
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex justify-center pb-8 md:pb-6 z-20">
            <button
              onClick={handleCapture}
              disabled={captureImage.isPending}
              className="w-16 h-16 rounded-full bg-white/20 border-4 border-white hover:bg-white/40 hover:scale-105 transition-all flex items-center justify-center shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white/20 group"
              aria-label="Take Photo"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm group-hover:scale-95 transition-transform" />
            </button>
          </div>
        </div>

        {lastCapture && (
          <div className="absolute md:relative bottom-0 inset-x-0 md:inset-auto md:w-80 bg-white border-t md:border border-gray-200 md:rounded-2xl p-5 shadow-2xl md:shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-full md:slide-in-from-right-8 duration-300 z-40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Capture Success</span>
              </div>
              <button 
                onClick={() => setLastCapture(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
              {lastCapture ? (
                <img
                  src={`/api/images/${lastCapture}`}
                  alt="Last capture"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-gray-300" />
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              Image has been saved and queued for processing. You can take another photo or return to the dashboard.
            </div>
            
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <Button variant="secondary" className="w-full" onClick={() => setLastCapture(null)}>
                Take Another
              </Button>
              <Link to="/" className="w-full">
                <Button variant="primary" className="w-full">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
