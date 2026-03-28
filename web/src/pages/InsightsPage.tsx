import React, { useState, useRef, useEffect } from "react";
import { useLatestDetection, useDetections, useDetection, useTriggerScan, useCaptureImage, useScanJobs } from "../hooks/useDetections";
import { BoundingBoxOverlay, BoxItem } from "../components/detection/BoundingBoxOverlay";
import { DetectionResult, DetectionProduct, UnknownItem, BoundingBox, ScanJob } from "../types";
import { Button } from "../components/layout/ui";
import { formatRelativeTime } from "../lib/utils";
import { Bug, RefreshCw, Eye, EyeOff, ChevronDown, Clock, Cpu, Upload, AlertCircle, CheckCircle2, Activity } from "lucide-react";

export function InsightsPage() {
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [showProductAreas, setShowProductAreas] = useState(true);
  const [showBarcodeBoxes, setShowBarcodeBoxes] = useState(true);
  const [showUnknownItems, setShowUnknownItems] = useState(true);

  const { data: latestDetection, isLoading: isLoadingLatest } = useLatestDetection();
  const { data: detectionsList } = useDetections(20);
  const { data: scanJobs } = useScanJobs(5);
  const { data: selectedDetection, isLoading: isLoadingSelected } = useDetection(selectedDetectionId);
  const triggerScan = useTriggerScan();
  const captureImage = useCaptureImage();

  const activeDetection = selectedDetectionId ? selectedDetection : latestDetection;
  const isLoading = selectedDetectionId ? isLoadingSelected : isLoadingLatest;

  const handleScan = () => {
    triggerScan.mutate("camera-1");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await captureImage.mutateAsync({ file, cameraId: "camera-1" });
      setSelectedDetectionId(null); // Switch to latest
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const boxes: BoxItem[] = [];
  if (activeDetection) {
    if (showProductAreas) {
      activeDetection.products.forEach((p: DetectionProduct) => {
        boxes.push({
          bbox: p.product_area_bounding_box,
          label: p.item_code,
          status: p.status,
          strokeStyle: "solid"
        });
      });
    }
    if (showBarcodeBoxes) {
      activeDetection.products.forEach((p: DetectionProduct) => {
        boxes.push({
          bbox: p.barcode_bounding_box,
          label: p.item_code,
          color: "#3b82f6",
          strokeStyle: "dashed"
        });
      });
    }
    if (showUnknownItems) {
      activeDetection.unknown_items.forEach((u: UnknownItem) => {
        boxes.push({
          bbox: u.bounding_box,
          label: u.description.length > 30 ? u.description.substring(0, 30) + "..." : u.description,
          color: "#f59e0b",
          strokeStyle: "dotted"
        });
      });
    }
  }

  const formatBBox = (bbox: BoundingBox) => {
    return `(ymin: ${Math.round(bbox.ymin)}, xmin: ${Math.round(bbox.xmin)}, ymax: ${Math.round(bbox.ymax)}, xmax: ${Math.round(bbox.xmax)})`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bug className="h-6 w-6" /> Insights Console
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium">
            <Upload className="h-4 w-4" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
          <Button onClick={handleScan} disabled={triggerScan.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerScan.isPending ? "animate-spin" : ""}`} />
            {triggerScan.isPending ? "Scanning..." : "Trigger Scan"}
          </Button>
        </div>
      </div>

      {scanJobs && scanJobs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Pipeline Jobs
            </h3>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {scanJobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {job.status === "running" && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                  {job.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {job.status === "failed" && <AlertCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {job.status} {job.camera_id && `(${job.camera_id})`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Started: {formatRelativeTime(job.started_at)}
                      {job.completed_at && ` • Ended: ${formatRelativeTime(job.completed_at)}`}
                    </p>
                  </div>
                </div>
                {job.error_message && (
                  <div className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded max-w-md truncate" title={job.error_message}>
                    {job.error_message}
                  </div>
                )}
                {job.detection_id && (
                  <button 
                    onClick={() => setSelectedDetectionId(job.detection_id || null)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Result
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Detection History:</label>
          <div className="relative w-full sm:w-80">
            <select
              className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8"
              value={selectedDetectionId || ""}
              onChange={(e) => setSelectedDetectionId(e.target.value || null)}
            >
              <option value="">Latest Detection</option>
              {detectionsList?.map((d: DetectionResult) => (
                <option key={d.id} value={d.id}>
                  {formatRelativeTime(d.timestamp)} — {d.products.length} products
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {activeDetection && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              {formatRelativeTime(activeDetection.timestamp)}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Cpu className="h-4 w-4" />
              {(activeDetection.processing_time_ms / 1000).toFixed(1)}s
            </div>
            <div className="text-gray-600">
              Camera: {activeDetection.camera_id}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div
            ref={containerRef}
            className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ minHeight: "500px" }}
          >
            {isLoading ? (
              <div className="text-gray-400">Loading detection data...</div>
            ) : activeDetection ? (
              <>
                <img
                  src={`/api/images/${activeDetection.image_path}`}
                  alt="Detection"
                  className="w-full h-full object-contain absolute inset-0"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                    if (containerRef.current) {
                      setContainerSize({
                        width: containerRef.current.clientWidth,
                        height: containerRef.current.clientHeight,
                      });
                    }
                  }}
                />
                {activeDetection.products.length > 0 && imageNaturalSize.width > 0 && (
                  <BoundingBoxOverlay
                    boundingBoxes={boxes}
                    imageNaturalWidth={imageNaturalSize.width}
                    imageNaturalHeight={imageNaturalSize.height}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                  />
                )}
              </>
            ) : (
              <div className="text-gray-400">No detection data available</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Overlay Layers</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={showProductAreas}
                  onChange={(e) => setShowProductAreas(e.target.checked)}
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1" />
                  <span className="text-sm text-gray-700">Product Areas</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={showBarcodeBoxes}
                  onChange={(e) => setShowBarcodeBoxes(e.target.checked)}
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-700">Barcode Boxes</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={showUnknownItems}
                  onChange={(e) => setShowUnknownItems(e.target.checked)}
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-700">Unknown Items</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {activeDetection && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Detected Products ({activeDetection.products.length})</h2>
            </div>
            <div className="divide-y">
              {activeDetection.products.map((product: DetectionProduct, idx: number) => (
                <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{product.item_code}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Condition: {product.running_out_condition}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.status === "in_stock"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.status === "in_stock" ? "In Stock" : "Running Out"}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-4 mb-4 border border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-1">AI Reasoning:</div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.ai_reasoning}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Product Area: </span>
                      <span className="font-mono text-gray-700">{formatBBox(product.product_area_bounding_box)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Barcode Box: </span>
                      <span className="font-mono text-gray-700">{formatBBox(product.barcode_bounding_box)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {activeDetection.products.length === 0 && (
                <div className="p-6 text-center text-gray-500">No products detected</div>
              )}
            </div>
          </div>

          {activeDetection.unknown_items.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Unknown Items ({activeDetection.unknown_items.length})</h2>
              </div>
              <div className="divide-y">
                {activeDetection.unknown_items.map((item: UnknownItem, idx: number) => (
                  <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="text-gray-900 mb-2">{item.description}</div>
                    <div className="text-sm">
                      <span className="text-gray-500">Bounding Box: </span>
                      <span className="font-mono text-gray-700">{formatBBox(item.bounding_box)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
