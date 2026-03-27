import React, { useRef } from "react";
import { CameraPreview } from "../components/camera/CameraPreview";
import { useCaptureImage } from "../hooks/useDetections";
import { useCamera } from "../hooks/useCamera";
import { Button } from "../components/layout/ui";
import { Camera, Upload } from "lucide-react";

export function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { captureFrame } = useCamera(videoRef);
  const captureImage = useCaptureImage();
  const [lastCapture, setLastCapture] = React.useState<string | null>(null);

  const handleCapture = async () => {
    try {
      const blob = await captureFrame();
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });

      const result = await captureImage.mutateAsync({ file });
      
      setLastCapture(result.image_path);
    } catch (error) {
      console.error("Capture failed:", error);
      alert("Failed to capture image");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await captureImage.mutateAsync({ file });
      setLastCapture(result.image_path);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Camera</h1>
        <p className="text-gray-600 mt-1">
          Capture and upload shelf images for AI-powered detection
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CameraPreview videoRef={videoRef} />

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-4">
              <Button
                onClick={handleCapture}
                className="w-full"
                disabled={captureImage.isPending}
              >
                <Camera className="h-5 w-5 mr-2" />
                {captureImage.isPending ? "Capturing..." : "Capture & Scan"}
              </Button>

              <div>
                <label className="block">
                  <span className="sr-only">Choose file</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </label>
              </div>
            </div>
          </div>

          {lastCapture && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Last Capture</h3>
              <img
                src={`/api/images/${lastCapture}`}
                alt="Last capture"
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}